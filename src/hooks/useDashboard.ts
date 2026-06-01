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
  const [insightText, setInsightText] = useState('Registrando tu comportamiento...');

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

      const { data: records, error } = await supabase
        .from('daily_logs')
        .select('health_momentum, ai_data, date')
        .order('date', { ascending: false })
        .limit(7);

      if (error) {
        throw error;
      }

      const logsList: DailyLog[] = (records ?? []).map((r) => {
        const validated = dailyLogSchema.safeParse(r.ai_data);
        return validated.success ? validated.data : fallbackLog;
      });

      setLastLog(logsList[0] ?? fallbackLog);
      const latestRecord = records?.[0];
      setMomentum(typeof latestRecord?.health_momentum === 'number' ? latestRecord.health_momentum : 100);

      // Generate Insight Text
      if (logsList.length >= 3) {
        const waterMetDays = logsList.filter((log) => (log.water_ml ?? log.hidratacion_ml ?? 0) >= 2000).length;
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

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return { isLoading, lastLog, momentum, insightText, reload: loadDashboard };
}
