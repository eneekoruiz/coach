'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog, type DietTemplate } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { getDietTemplates, getDietCalendar, autocompleteDietWithAi } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

export function useNutritionPlan() {
  const [activeTab, setActiveTab] = useState<'plan' | 'analysis'>('plan');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [calendar, setCalendar] = useState<Array<{ date: string; template_id: string }>>([]);
  const [realLog, setRealLog] = useState<DailyLog | null>(null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const isMounted = useRef(true);

  const todayStr = getNormalizedDate(new Date());
  const todayTemplateId = calendar.find((c) => c.date === todayStr)?.template_id;
  const todayTemplate = templates.find((t) => t.id === todayTemplateId) || null;

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

      const fetchedTemplates = await getDietTemplates();
      setTemplates(fetchedTemplates);

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);
      const fetchedCalendar = await getDietCalendar(start, end);
      setCalendar(fetchedCalendar);

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
    realLog,
    dailyWaterTarget,
    isGeneratingAi,
    todayTemplate,
    loadData,
    handleAiGenerate,
  };
}
