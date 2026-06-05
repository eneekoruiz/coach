import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { calculatePerfectDayStreak } from '@/services/calculateStreaks';
import { getNormalizedDate } from '@/lib/date-utils';

const fallbackLog: DailyLog = {
  comidas: [],
  hidratacion_ml: 0,
  water_ml: 0,
  total_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fats_g: 0,
  habits_count: {},
  toxinas: [],
  bio_avatar: {
    estado_fisiologico: 'equilibrio estable',
    energia_fisica: 3,
    claridad_mental: 3,
  },
  metricas: {
    variacion_inercia: 0,
    aciertos: [],
    error_clave: 'sin datos todavía',
    accion_manana: 'registra el primer log para activar el seguimiento',
  },
};

export function useDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastLog, setLastLog] = useState<DailyLog | null>(null);
  const [momentum, setMomentum] = useState(100);
  const [streak, setStreak] = useState(0);
  const [insightText, setInsightText] = useState('Registrando tu comportamiento...');
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);
  const [defaultGlassSize, setDefaultGlassSize] = useState(250);
  const [dietTargets, setDietTargets] = useState({
    kcal: 2000,
    protein: 150,
    carbs: 200,
    fats: 70,
  });
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [shields, setShields] = useState(2);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setLastLog(null);
        setMomentum(100);
        setInsightText('Por favor, inicia sesión para activar el seguimiento.');
        setIsLoading(false);
        return;
      }

      // Load user water settings from auth metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metadata = user.user_metadata || {};
        setDailyWaterTarget(Number(metadata.daily_water_target_ml ?? 2000));
        setDefaultGlassSize(Number(metadata.default_glass_size_ml ?? 250));

        // Fetch active diet targets
        const { data: dietData } = await supabase
          .from('user_diet_plans')
          .select('target_kcal, target_protein, target_carbs, target_fats')
          .eq('user_id', user.id)
          .maybeSingle();

        if (dietData) {
          setDietTargets({
            kcal: Number(dietData.target_kcal ?? 2000),
            protein: Number(dietData.target_protein ?? 150),
            carbs: Number(dietData.target_carbs ?? 200),
            fats: Number(dietData.target_fats ?? 70),
          });
        }
      }

      const { data: records, error } = await supabase
        .from('daily_logs')
        .select('health_momentum, ai_data, date, saved_by_shield')
        .order('date', { ascending: false })
        .limit(45);

      if (error) {
        throw error;
      }

      setDailyLogs(records || []);

      let userShields = 2;
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('shields_available')
          .eq('id', user.id)
          .maybeSingle();
        if (profileData) {
          userShields = profileData.shields_available;
        }
      }
      setShields(userShields);

      // Midnight Reset logic: Only load today's logged activities for lastLog
      const todayStr = getNormalizedDate(new Date());
      const todayRecord = records?.find((r) => r.date === todayStr);
      setHasLoggedToday(!!todayRecord);

      if (todayRecord) {
        const validated = dailyLogSchema.safeParse(todayRecord.ai_data);
        setLastLog(validated.success ? validated.data : fallbackLog);
      } else {
        // It's a new day, show a fresh, clean log template
        setLastLog(fallbackLog);
      }

      const latestRecord = records?.[0];
      setMomentum(typeof latestRecord?.health_momentum === 'number' ? latestRecord.health_momentum : 100);

      // Compute streak of perfect days
      const currentStreak = calculatePerfectDayStreak(
        (records ?? []).map((r) => ({
          date: r.date,
          health_momentum: Number(r.health_momentum ?? 100),
        }))
      );
      setStreak(currentStreak);

      const logsList: DailyLog[] = (records ?? []).map((r) => {
        const validated = dailyLogSchema.safeParse(r.ai_data);
        return validated.success ? validated.data : fallbackLog;
      });

      // Generate Insight Text
      if (logsList.length >= 3) {
        const userWaterTarget = user ? Number(user.user_metadata?.daily_water_target_ml ?? 2000) : 2000;
        const waterMetDays = logsList.filter((log) => (log.water_ml ?? log.hidratacion_ml ?? 0) >= userWaterTarget).length;
        const totalLogsCount = logsList.length;
        
        const momentums = (records ?? []).map((r) => Number(r.health_momentum || 100)).reverse();
        const oldestMomentum = momentums[0] ?? 100;
        const newestMomentum = momentums[momentums.length - 1] ?? 100;
        const trend = newestMomentum - oldestMomentum;

        if (trend < -5) {
          setInsightText(`Tu inercia fisiológica ha caído ${Math.abs(trend)} puntos esta semana. Necesitas descansar, hidratarte y comer balanceado.`);
        } else if (waterMetDays >= 4) {
          setInsightText(`¡Excelente trabajo! Has cumplido tu meta de agua en ${waterMetDays} de los últimos ${totalLogsCount} días registrados. ¡Sigue así!`);
        } else if (trend > 5) {
          setInsightText(`¡Excelente inercia! Tu salud metabólica subió ${trend} puntos en los últimos días. ¡Sigue así!`);
        } else {
          setInsightText(`Hidratación: meta alcanzada ${waterMetDays}/${totalLogsCount} días. Mantente constante para subir tu inercia de salud.`);
        }
      } else {
        setInsightText('Registra al menos 3 días para activar tus recomendaciones de inercia y hábitos.');
      }

      setIsLoading(false);
    } catch {
      setLastLog(null);
      setMomentum(100);
      setInsightText('Error al cargar datos del servidor.');
      setIsLoading(false);
    }
  }, []);

  const updateWaterSettings = useCallback(async (target: number, glass: number) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          daily_water_target_ml: target,
          default_glass_size_ml: glass,
        },
      });
      if (error) throw error;
      setDailyWaterTarget(target);
      setDefaultGlassSize(glass);
      return true;
    } catch (err) {
      console.error('Error updating user settings:', err);
      return false;
    }
  }, []);

  const addWaterIntake = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStr = getNormalizedDate(new Date());

      const { data: todayLog } = await supabase
        .from('daily_logs')
        .select('id, ai_data, habit_tracking')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      const { data: habits } = await supabase
        .from('user_habits')
        .select('id, name')
        .eq('user_id', user.id);

      let waterHabit = habits?.find(h => {
        const name = h.name.toLowerCase();
        return name.includes('agua') || name.includes('hidratacion');
      });

      if (!waterHabit) {
        const { data: newHabit, error: createError } = await supabase
          .from('user_habits')
          .insert({
            user_id: user.id,
            name: 'Agua',
            type: 'positive',
            is_custom: true,
            tolerance_threshold: 0,
            current_streak: 0,
            longest_streak: 0,
            shields: 0,
          })
          .select('*')
          .single();
        if (createError) throw createError;
        if (!newHabit) throw new Error('Failed to auto-create water habit.');
        waterHabit = newHabit;
      }

      if (!waterHabit) {
        throw new Error('No se encontró ni se pudo crear un hábito de Agua.');
      }

      let currentWater = 0;
      if (todayLog && todayLog.ai_data) {
        const aiData = todayLog.ai_data as any;
        currentWater = Number(aiData.water_ml ?? aiData.hidratacion_ml ?? 0);
      }
      const newWater = currentWater + defaultGlassSize;

      const session = await supabase.auth.getSession();
      const res = await fetch('/api/habits/update-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          habit_id: waterHabit.id,
          amount: newWater,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al registrar agua en el servidor.');
      }

      await loadDashboard();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [defaultGlassSize, loadDashboard]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return {
    isLoading,
    lastLog,
    momentum,
    streak,
    insightText,
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    updateWaterSettings,
    addWaterIntake,
    reload: loadDashboard,
    hasLoggedToday,
    shields,
    dailyLogs,
  };
}
