import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import {
  enqueueDashboardMutation,
  listDashboardMutations,
  readDashboardCacheSync,
  removeDashboardMutation,
  writeDashboardSnapshot,
  type DashboardSnapshot,
} from '@/lib/local-dashboard-store';

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

const defaultDietTargets = {
  kcal: 2000,
  protein: 150,
  carbs: 200,
  fats: 70,
};

const WATER_STEP_ML = 250;
const MAX_DAILY_WATER_ML = 10000;

type SmartTrigger = {
  id: string;
  title: string;
  body: string;
  cta?: string;
};

function waterFromLog(log: DailyLog | null) {
  return Number(log?.water_ml ?? log?.hidratacion_ml ?? 0);
}

function createTodayInsight(log: DailyLog | null, dailyWaterTarget: number) {
  if (!log) return 'HUD preparado. Registra una acción para activar el seguimiento de hoy.';

  const water = waterFromLog(log);
  const waterPct = dailyWaterTarget > 0 ? water / dailyWaterTarget : 0;

  if (waterPct < 0.35) return 'Ahora: prioriza hidratación. Un toque suma agua y sincroniza en segundo plano.';
  if ((log.total_kcal ?? 0) <= 0) return 'Ahora: registra la primera comida para calibrar el día.';
  if (log.metricas?.accion_manana) return log.metricas.accion_manana;
  return 'Hoy va en marcha. Mantén el foco en la siguiente acción simple.';
}

export function useDashboard() {
  const cachedSnapshot = useMemo(() => readDashboardCacheSync(), []);

  const [isLoading, setIsLoading] = useState(!cachedSnapshot);
  const [lastLog, setLastLog] = useState<DailyLog | null>(cachedSnapshot?.lastLog ?? fallbackLog);
  const [momentum, setMomentum] = useState(cachedSnapshot?.momentum ?? 100);
  const [insightText, setInsightText] = useState(
    cachedSnapshot?.insightText ?? 'HUD local listo. Sincronizando en segundo plano...'
  );
  const [dailyWaterTarget, setDailyWaterTarget] = useState(cachedSnapshot?.dailyWaterTarget ?? 2000);
  const [defaultGlassSize, setDefaultGlassSize] = useState(cachedSnapshot?.defaultGlassSize ?? 250);
  const [dietTargets, setDietTargets] = useState(cachedSnapshot?.dietTargets ?? defaultDietTargets);
  const [hasLoggedToday, setHasLoggedToday] = useState(cachedSnapshot?.hasLoggedToday ?? false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [smartTrigger, setSmartTrigger] = useState<SmartTrigger | null>(null);

  const persistSnapshot = useCallback(async (snapshot: Omit<DashboardSnapshot, 'updatedAt'>) => {
    await writeDashboardSnapshot({
      ...snapshot,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const syncWaterDelta = useCallback(async (delta: number, date: string) => {
    const safeDelta = Math.max(-WATER_STEP_ML, Math.min(WATER_STEP_ML, Math.trunc(delta)));
    if (safeDelta === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const { data: habits } = await supabase
      .from('user_habits')
      .select('id, name')
      .eq('user_id', user.id);

    let waterHabit = habits?.find((habit) => {
      const name = String(habit.name || '').toLowerCase();
      return name.includes('agua') || name.includes('hidratacion');
    });

    if (!waterHabit) {
      const { data: createdHabit, error: createError } = await supabase
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
        .select('id, name')
        .single();

      if (createError) throw createError;
      waterHabit = createdHabit;
    }

    if (!waterHabit) throw new Error('No se pudo preparar el hábito de agua.');

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Sesión no disponible.');

    const response = await fetch('/api/habits/update-today', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        habit_id: waterHabit.id,
        delta: safeDelta,
        date,
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo sincronizar el agua.');
    }
  }, []);

  const flushQueuedMutations = useCallback(async () => {
    const queued = await listDashboardMutations();
    setPendingSyncCount(queued.length);

    for (const mutation of queued) {
      try {
        if (mutation.type === 'add_water') {
          await syncWaterDelta(mutation.payload.delta, mutation.payload.date);
        }
        await removeDashboardMutation(mutation.id);
      } catch {
        const remaining = await listDashboardMutations();
        setPendingSyncCount(remaining.length);
        return;
      }
    }

    setPendingSyncCount(0);
  }, [syncWaterDelta]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setInsightText('Inicia sesión para activar el HUD.');
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const todayStr = getNormalizedDate(new Date());
      let nextWaterTarget = 2000;
      let nextGlassSize = 250;
      let nextDietTargets = defaultDietTargets;

      if (!user) {
        setInsightText('Inicia sesión para activar el HUD.');
        setIsLoading(false);
        return;
      }

      const metadata = user.user_metadata || {};
      nextWaterTarget = Number(metadata.daily_water_target_ml ?? 2000);
      nextGlassSize = Number(metadata.default_glass_size_ml ?? 250);
      setDailyWaterTarget(nextWaterTarget);
      setDefaultGlassSize(nextGlassSize);

      const { data: dietData } = await supabase
        .from('user_diet_plans')
        .select('target_kcal, target_protein, target_carbs, target_fats')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dietData) {
        nextDietTargets = {
          kcal: Number(dietData.target_kcal ?? 2000),
          protein: Number(dietData.target_protein ?? 150),
          carbs: Number(dietData.target_carbs ?? 200),
          fats: Number(dietData.target_fats ?? 70),
        };
        setDietTargets(nextDietTargets);
      }

      await flushQueuedMutations();
      const remainingQueue = await listDashboardMutations();

      const [
        { data: todayRecord, error },
        { data: positiveHabits },
        { data: recentLogs },
        { data: bodyMetrics },
      ] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('health_momentum, ai_data, date, habit_tracking')
          .eq('user_id', user.id)
          .eq('date', todayStr)
          .maybeSingle(),
        supabase
          .from('user_habits')
          .select('id, name, target_value, current_streak, type')
          .eq('user_id', user.id)
          .eq('type', 'positive'),
        supabase
          .from('daily_logs')
          .select('date, habit_tracking')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(3),
        supabase
          .from('body_metrics')
          .select('date, waist')
          .eq('user_id', user.id)
          .not('waist', 'is', null)
          .order('date', { ascending: false })
          .limit(8),
      ]);

      if (error) throw error;

      const validated = todayRecord?.ai_data
        ? dailyLogSchema.safeParse(todayRecord.ai_data)
        : null;

      let nextLog = validated?.success ? validated.data : fallbackLog;

      if (remainingQueue.length > 0) {
        const cachedWater = waterFromLog(readDashboardCacheSync()?.lastLog ?? null);
        const remoteWater = waterFromLog(nextLog);
        const resolvedWater = Math.max(cachedWater, remoteWater);
        nextLog = {
          ...nextLog,
          water_ml: resolvedWater,
          hidratacion_ml: resolvedWater,
        };
      }

      const nextMomentum = typeof todayRecord?.health_momentum === 'number'
        ? todayRecord.health_momentum
        : 100;
      const nextInsight = createTodayInsight(nextLog, nextWaterTarget);

      const currentHour = new Date().getHours();
      const mealsLogged = nextLog.comidas?.length ?? 0;
      let nextSmartTrigger: SmartTrigger | null = null;

      const waistEntries = (bodyMetrics ?? [])
        .map((metric) => ({
          date: String(metric.date),
          waist: Number(metric.waist),
        }))
        .filter((metric) => !Number.isNaN(metric.waist));

      if (waistEntries.length >= 2) {
        const latest = waistEntries[0];
        const baseline = waistEntries[waistEntries.length - 1];
        const waistDrop = baseline.waist - latest.waist;
        if (waistDrop >= 2) {
          nextSmartTrigger = {
            id: 'waist-progress',
            title: 'Hito corporal',
            body: `He visto que tu cintura ha bajado ${waistDrop.toFixed(1)} cm. Eso ya es progreso medible, no sensación.`,
            cta: 'Guárdalo en tu historia',
          };
        }
      }

      if (!nextSmartTrigger && currentHour >= 15 && mealsLogged === 0) {
        nextSmartTrigger = {
          id: 'late-meal',
          title: 'Coach atento',
          body: 'Ya es media tarde y todavía no veo comida registrada. Puedo improvisarte algo rápido con la varita de Nutrición.',
          cta: 'Abrir Nutrición',
        };
      }

      if (!nextSmartTrigger) {
        const candidateHabit = (positiveHabits ?? []).find((habit) => {
          const name = String(habit.name ?? '').toLowerCase();
          return name.includes('paso') || name.includes('caminar') || name.includes('andar');
        });

        if (candidateHabit && (recentLogs?.length ?? 0) >= 3) {
          const missedThreeDays = recentLogs!.slice(0, 3).every((log) => {
            const tracking = Array.isArray(log.habit_tracking) ? log.habit_tracking : [];
            const entry = tracking.find((item: { habit_id?: number; amount?: number }) => Number(item.habit_id) === Number(candidateHabit.id));
            return Number(entry?.amount ?? 0) < Number(candidateHabit.target_value ?? 1);
          });

          if (missedThreeDays) {
            nextSmartTrigger = {
              id: 'steps-slip',
              title: 'Racha a rescate',
              body: `Llevas 3 días flojo con ${candidateHabit.name}. Hoy con una mini victoria ya cambiamos la narrativa.`,
              cta: 'Registrar acción',
            };
          }
        }
      }

      setSmartTrigger(nextSmartTrigger);

      setLastLog(nextLog);
      setHasLoggedToday(Boolean(todayRecord));
      setMomentum(nextMomentum);
      setInsightText(nextInsight);
      await persistSnapshot({
        lastLog: nextLog,
        momentum: nextMomentum,
        insightText: nextInsight,
        dailyWaterTarget: nextWaterTarget,
        defaultGlassSize: nextGlassSize,
        dietTargets: nextDietTargets,
        hasLoggedToday: Boolean(todayRecord),
      });
      setIsLoading(false);
    } catch (error) {
      console.warn('Dashboard sync failed; serving local HUD cache.', error);
      setIsLoading(false);
    }
  }, [flushQueuedMutations, persistSnapshot]);

  const updateWaterSettings = useCallback(async (target: number, glass: number) => {
    const safeTarget = Math.max(500, Math.min(MAX_DAILY_WATER_ML, Math.trunc(target)));
    const safeGlass = Math.max(50, Math.min(1000, Math.trunc(glass)));

    setDailyWaterTarget(safeTarget);
    setDefaultGlassSize(safeGlass);
    await persistSnapshot({
      lastLog,
      momentum,
      insightText,
      dailyWaterTarget: safeTarget,
      defaultGlassSize: safeGlass,
      dietTargets,
      hasLoggedToday,
    });

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          daily_water_target_ml: safeTarget,
          default_glass_size_ml: safeGlass,
        },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating user settings:', err);
      return false;
    }
  }, [dietTargets, hasLoggedToday, insightText, lastLog, momentum, persistSnapshot]);

  const addWaterIntake = useCallback(async (delta: number = WATER_STEP_ML) => {
    const todayStr = getNormalizedDate(new Date());
    const baseLog = lastLog ?? fallbackLog;
    const safeDelta = Math.max(-WATER_STEP_ML, Math.min(WATER_STEP_ML, Math.trunc(delta)));
    const nextWater = Math.max(0, Math.min(MAX_DAILY_WATER_ML, waterFromLog(baseLog) + safeDelta));
    const appliedDelta = nextWater - waterFromLog(baseLog);
    if (appliedDelta === 0) return;

    const nextLog: DailyLog = {
      ...baseLog,
      water_ml: nextWater,
      hidratacion_ml: nextWater,
      habits_count: {
        ...(baseLog.habits_count || {}),
        agua: nextWater,
      },
    };
    const nextInsight = createTodayInsight(nextLog, dailyWaterTarget);

    setLastLog(nextLog);
    setInsightText(nextInsight);
    await persistSnapshot({
      lastLog: nextLog,
      momentum,
      insightText: nextInsight,
      dailyWaterTarget,
      defaultGlassSize,
      dietTargets,
      hasLoggedToday: true,
    });

    try {
      await syncWaterDelta(appliedDelta, todayStr);
      await flushQueuedMutations();
    } catch {
      await enqueueDashboardMutation({
        type: 'add_water',
        payload: {
          delta: appliedDelta,
          date: todayStr,
        },
      });
      const queued = await listDashboardMutations();
      setPendingSyncCount(queued.length);
    }
  }, [
    dailyWaterTarget,
    dietTargets,
    flushQueuedMutations,
    hasLoggedToday,
    lastLog,
    momentum,
    persistSnapshot,
    syncWaterDelta,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onOnline = () => {
      void flushQueuedMutations().then(() => loadDashboard());
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushQueuedMutations, loadDashboard]);

  return {
    isLoading,
    lastLog,
    momentum,
    insightText,
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    updateWaterSettings,
    addWaterIntake,
    reload: loadDashboard,
    hasLoggedToday,
    pendingSyncCount,
    smartTrigger,
  };
}
