'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog, type DietTemplate, type Recipe, type DietProgram, type DietProgramDay, type DailyDietOverride } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { 
  getDietTemplates, 
  getDietCalendar, 
  autocompleteDietWithAi, 
  getRecipes, 
  getActiveDietProgram, 
  getDailyDietOverrides 
} from '@/app/nutrition/actions';
import toast from '@/lib/toast';

export function useNutritionPlan() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'days' | 'programs' | 'calendar' | 'analysis'>('calendar');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [calendar, setCalendar] = useState<Array<{ date: string; template_id: string }>>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [overrides, setOverrides] = useState<DailyDietOverride[]>([]);
  const [activeProgram, setActiveProgram] = useState<DietProgram | null>(null);
  const [activeProgramDays, setActiveProgramDays] = useState<DietProgramDay[]>([]);
  
  const [realLog, setRealLog] = useState<DailyLog | null>(null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
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

  const loadData = useCallback(async () => {
    try {
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
      const [fetchedCalendar, fetchedRecipes, fetchedOverrides, fetchedProgram] = await Promise.all([
        getDietCalendar(start, end),
        getRecipes(),
        getDailyDietOverrides(start, end),
        getActiveDietProgram()
      ]);

      setCalendar(fetchedCalendar);
      setRecipes(fetchedRecipes);
      setOverrides(fetchedOverrides);
      setActiveProgram(fetchedProgram.program);
      setActiveProgramDays(fetchedProgram.days as DietProgramDay[]);

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
            setRealLog(validated.data);
          }
        }
      }
    } catch (err) {
      console.error('Error loading nutrition module data:', err);
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
        const res = await autocompleteDietWithAi('Necesito una dieta balanceada para empezar.');
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
        console.error('AI Diet generation error:', err);
        toast.error('Fallo en generación de plan.');
      } finally {
        if (isMounted.current) {
          setIsGeneratingAi(false);
        }
      }
    })();
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
    todayTemplate,
    loadData,
    handleAiGenerate,
  };
}
