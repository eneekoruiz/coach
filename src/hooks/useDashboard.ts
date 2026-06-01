import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';

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

  const loadDashboard = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setLastLog(null);
        setMomentum(100);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .select('health_momentum, ai_data, date')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const validated = dailyLogSchema.safeParse(data?.ai_data);

      setLastLog(validated.success ? validated.data : fallbackLog);
      setMomentum(typeof data?.health_momentum === 'number' ? data.health_momentum : 100);
      setIsLoading(false);
    } catch {
      setLastLog(null);
      setMomentum(100);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return { isLoading, lastLog, momentum, reload: loadDashboard };
}
