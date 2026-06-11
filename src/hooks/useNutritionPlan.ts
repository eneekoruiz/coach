'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog, type DietTemplate, type Recipe, type DietProgram, type DietProgramDay, type DailyDietOverride, type MealItem } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { 
  getDietTemplates, 
  getDietCalendar, 
  autocompleteDietWithAi, 
  getRecipes, 
  getActiveDietProgram, 
  getDailyDietOverrides,
  markMealAsEaten,
} from '@/app/nutrition/actions';
import { getTodayWorkoutSummary } from '@/app/sports/actions';
import toast from '@/lib/toast';
import { readSessionViewCache, writeSessionViewCache } from '@/lib/session-view-cache';
import { isE2EMockMode } from '@/lib/e2e';
import { captureException } from '@/lib/monitoring';

export type NutritionTab = 'recipes' | 'days' | 'programs' | 'calendar';

type NutritionViewCache = {
  templates: DietTemplate[];
  calendar: Array<{ date: string; template_id: string }>;
  recipes: Recipe[];
  overrides: DailyDietOverride[];
  activeProgram: DietProgram | null;
  activeProgramDays: DietProgramDay[];
  realLog: DailyLog | null;
  dailyWaterTarget: number;
  todayWorkoutCalories: number;
  todayWorkoutMinutes: number;
};

const NUTRITION_CACHE_KEY = 'coach.view.nutrition.v1';

export function useNutritionPlan(initialTab?: NutritionTab) {
  const cached = useMemo(() => readSessionViewCache<NutritionViewCache>(NUTRITION_CACHE_KEY), []);
  const [activeTab, setActiveTab] = useState<NutritionTab>(initialTab || 'calendar');
  const [loading, setLoading] = useState(!cached);
  const [authRequired, setAuthRequired] = useState(false);
  const [templates, setTemplates] = useState<DietTemplate[]>(cached?.templates ?? []);
  const [calendar, setCalendar] = useState<Array<{ date: string; template_id: string }>>(cached?.calendar ?? []);
  const [recipes, setRecipes] = useState<Recipe[]>(cached?.recipes ?? []);
  const [overrides, setOverrides] = useState<DailyDietOverride[]>(cached?.overrides ?? []);
  const [activeProgram, setActiveProgram] = useState<DietProgram | null>(cached?.activeProgram ?? null);
  const [activeProgramDays, setActiveProgramDays] = useState<DietProgramDay[]>(cached?.activeProgramDays ?? []);
  
  const [realLog, setRealLog] = useState<DailyLog | null>(cached?.realLog ?? null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(cached?.dailyWaterTarget ?? 2000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [todayWorkoutCalories, setTodayWorkoutCalories] = useState(cached?.todayWorkoutCalories ?? 0);
  const [todayWorkoutMinutes, setTodayWorkoutMinutes] = useState(cached?.todayWorkoutMinutes ?? 0);
  const isMounted = useRef(true);

  const todayStr = getNormalizedDate(new Date());

  // Reconcile today's active diet template
  const todayTemplate = useMemo(() => {
    // 1. Check override
    const override = overrides.find((o) => o.date === todayStr);
    if (override) return override.custom_diet;

    // 2. Check active program cycle
    if (activeProgram && activeProgramDays.length > 0) {
      const start = new Date(activeProgram.start_date + 'T00:00:00');
      const current = new Date(todayStr + 'T00:00:00');
      const diffTime = current.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let dayNum = 1;
      const len = activeProgram.microcycle_length;
      if (diffDays >= 0) {
        dayNum = (diffDays % len) + 1;
      } else {
        dayNum = (((diffDays % len) + len) % len) + 1;
      }

      const dayMap = activeProgramDays.find((d) => d.day_number === dayNum);
      if (dayMap) {
        return templates.find((t) => t.id === dayMap.template_id) || null;
      }
    }

    // 3. Check calendar manual assignment
    const todayTemplateId = calendar.find((c) => c.date === todayStr)?.template_id;
    return templates.find((t) => t.id === todayTemplateId) || null;
  }, [todayStr, calendar, templates, overrides, activeProgram, activeProgramDays]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Update active tab when initialTab changes (deep linking)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadData = useCallback(async () => {
    try {
      if (isE2EMockMode()) {
        const fetchedTemplates = await getDietTemplates();
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
        const end = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);
        const [fetchedCalendar, fetchedRecipes, fetchedOverrides, fetchedProgram] = await Promise.all([
          getDietCalendar(start, end),
          getRecipes(),
          getDailyDietOverrides(start, end),
          getActiveDietProgram(),
        ]);

        setAuthRequired(false);
        setDailyWaterTarget(2000);
        setTemplates(fetchedTemplates);
        setCalendar(fetchedCalendar);
        setRecipes(fetchedRecipes);
        setOverrides(fetchedOverrides);
        setActiveProgram(fetchedProgram.program);
        setActiveProgramDays(fetchedProgram.days as DietProgramDay[]);
        setTodayWorkoutCalories(0);
        setTodayWorkoutMinutes(0);
        setRealLog(null);
        writeSessionViewCache(NUTRITION_CACHE_KEY, {
          templates: fetchedTemplates,
          calendar: fetchedCalendar,
          recipes: fetchedRecipes,
          overrides: fetchedOverrides,
          activeProgram: fetchedProgram.program,
          activeProgramDays: fetchedProgram.days as DietProgramDay[],
          realLog: null,
          dailyWaterTarget: 2000,
          todayWorkoutCalories: 0,
          todayWorkoutMinutes: 0,
        });
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata || {};
        setDailyWaterTarget(Number(metadata.daily_water_target_ml ?? 2000));
      }

      // Fetch diet templates
      const fetchedTemplates = await getDietTemplates();
      setTemplates(fetchedTemplates);

      // Define date range for calendar/overrides query (1 month past, 2 months future)
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);

      // Parallel data fetching for clinical nutrition engine
      const [fetchedCalendar, fetchedOverrides, fetchedProgram, workoutSummary] = await Promise.all([
        getDietCalendar(start, end),
        getDailyDietOverrides(start, end),
        getActiveDietProgram(),
        getTodayWorkoutSummary(todayStr),
      ]);

      setCalendar(fetchedCalendar);
      setOverrides(fetchedOverrides);
      setActiveProgram(fetchedProgram.program);
      setActiveProgramDays(fetchedProgram.days as DietProgramDay[]);
      setTodayWorkoutCalories(workoutSummary.totalCalories);
      setTodayWorkoutMinutes(workoutSummary.totalMinutes);

      let nextRealLog: DailyLog | null = null;

      if (user) {
        const { data: logRecord, error: logError } = await supabase
          .from('daily_logs')
          .select('ai_data')
          .eq('user_id', user.id)
          .eq('date', todayStr)
          .maybeSingle();

        if (!logError && logRecord?.ai_data) {
          const validated = dailyLogSchema.safeParse(logRecord.ai_data);
          if (validated.success) {
            nextRealLog = validated.data;
            setRealLog(validated.data);
          }
        } else {
          setRealLog(null);
        }
      }

      writeSessionViewCache(NUTRITION_CACHE_KEY, {
        templates: fetchedTemplates,
        calendar: fetchedCalendar,
        recipes: readSessionViewCache<NutritionViewCache>(NUTRITION_CACHE_KEY)?.recipes ?? [],
        overrides: fetchedOverrides,
        activeProgram: fetchedProgram.program,
        activeProgramDays: fetchedProgram.days as DietProgramDay[],
        realLog: nextRealLog,
        dailyWaterTarget: user ? Number(user.user_metadata?.daily_water_target_ml ?? 2000) : 2000,
        todayWorkoutCalories: workoutSummary.totalCalories,
        todayWorkoutMinutes: workoutSummary.totalMinutes,
      });

      void getRecipes()
        .then((fetchedRecipes) => {
          if (!isMounted.current) return;
          setRecipes(fetchedRecipes);
          writeSessionViewCache(NUTRITION_CACHE_KEY, {
            templates: fetchedTemplates,
            calendar: fetchedCalendar,
            recipes: fetchedRecipes,
            overrides: fetchedOverrides,
            activeProgram: fetchedProgram.program,
            activeProgramDays: fetchedProgram.days as DietProgramDay[],
            realLog: nextRealLog,
            dailyWaterTarget: user ? Number(user.user_metadata?.daily_water_target_ml ?? 2000) : 2000,
            todayWorkoutCalories: workoutSummary.totalCalories,
            todayWorkoutMinutes: workoutSummary.totalMinutes,
          });
        })
        .catch((recipeError) => {
          captureException(recipeError, { area: 'nutrition', action: 'loadRecipesDeferred' });
        });
    } catch (err) {
      captureException(err, { area: 'nutrition', action: 'loadNutritionPlan' });
      console.error('Error loading nutrition module data:', err);
      toast.error('No se pudo cargar Nutrición. Mostramos lo último guardado mientras reintentamos.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAiGenerate = () => {
    setIsGeneratingAi(true);
    toast.success('Generando tu plan con IA en 2º plano... Puedes seguir usando la app.');

    (async () => {
      try {
        const res = await autocompleteDietWithAi('Genera un menú completo para hoy con desayuno, comida y cena, equilibrado y fácil de seguir.');
        if (res.success && res.data) {
          const { saveDietTemplate, assignTemplateToDates } = await import('@/app/nutrition/actions');
          const saved = await saveDietTemplate(res.data);
          if (saved.success && saved.data?.id) {
            await assignTemplateToDates(saved.data.id, [todayStr]);
            toast.success('¡Tu plan ha sido generado! Ya puedes ir a verlo.');
          } else {
            toast.error(saved.error || 'Fallo al guardar el plan.');
          }
          if (isMounted.current) {
            await loadData();
          }
        } else {
          toast.error(res.error || 'Fallo en generación');
        }
      } catch (err) {
        captureException(err, { area: 'nutrition', action: 'generateTodayPlanWithAi' });
        console.error('AI Diet generation error:', err);
        toast.error('Fallo en generación de plan.');
      } finally {
        if (isMounted.current) {
          setIsGeneratingAi(false);
        }
      }
    })();
  };

  const handleMarkMealAsEaten = async (meal: MealItem) => {
    const mealKey = `${meal.name}-${meal.text}`;
    const wasAlreadyLogged = realLog?.comidas.some(
      (item) => item.hora === meal.name && item.descripcion === meal.text
    );

    if (wasAlreadyLogged) {
      toast.success('Esta comida ya estaba registrada.');
      return;
    }

    const optimisticLog: DailyLog = {
      date: todayStr,
      comidas: [
        ...(realLog?.comidas ?? []),
        {
          hora: meal.name,
          descripcion: meal.text || meal.name,
          calidad_nutricional: 'buena',
        },
      ],
      hidratacion_ml: realLog?.hidratacion_ml ?? 0,
      toxinas: realLog?.toxinas ?? [],
      bio_avatar: realLog?.bio_avatar ?? {
        estado_fisiologico: 'Estable',
        energia_fisica: 3,
        claridad_mental: 3,
      },
      metricas: realLog?.metricas ?? {
        variacion_inercia: 0,
        aciertos: [],
        error_clave: 'ninguno',
        accion_manana: 'Ninguna',
      },
      water_ml: realLog?.water_ml ?? 0,
      total_kcal: (realLog?.total_kcal ?? 0) + Math.round(meal.target_kcal),
      protein_g: (realLog?.protein_g ?? 0) + Math.round(meal.target_protein),
      carbs_g: (realLog?.carbs_g ?? 0) + Math.round(meal.target_carbs),
      fats_g: (realLog?.fats_g ?? 0) + Math.round(meal.target_fats),
      habits_count: realLog?.habits_count ?? {},
      propuestas_habitos: realLog?.propuestas_habitos ?? [],
    };

    setRealLog(optimisticLog);
    writeSessionViewCache(NUTRITION_CACHE_KEY, {
      templates,
      calendar,
      recipes,
      overrides,
      activeProgram,
      activeProgramDays,
      realLog: optimisticLog,
      dailyWaterTarget,
      todayWorkoutCalories,
      todayWorkoutMinutes,
    });
    toast.success(`${meal.name} registrado`, { description: mealKey });

    const result = await markMealAsEaten(meal, todayStr, todayTemplate?.id);
    if (!result.success) {
      toast.error(result.error || 'No se pudo registrar la comida.');
      await loadData();
      return;
    }

    await loadData();
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    authRequired,
    templates,
    calendar,
    recipes,
    overrides,
    activeProgram,
    activeProgramDays,
    realLog,
    dailyWaterTarget,
    isGeneratingAi,
    todayWorkoutCalories,
    todayWorkoutMinutes,
    todayTemplate,
    loadData,
    handleAiGenerate,
    handleMarkMealAsEaten,
  };
}
