'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { getDietTemplates, getDietCalendar, autocompleteDietWithAi } from '@/app/nutrition/actions';
import { type DietTemplate } from '@/lib/schema';
import DietEmptyState from './DietEmptyState';
import DietCalendarView from './DietCalendarView';
import DailyAnalysisTab from './DailyAnalysisTab';
import toast from '@/lib/toast';

export default function NutritionContainer() {
  const [activeTab, setActiveTab] = useState<'plan' | 'analysis'>('plan');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [calendar, setCalendar] = useState<Array<{ date: string; template_id: string }>>([]);
  const [realLog, setRealLog] = useState<DailyLog | null>(null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const isMounted = useRef(true);

  // We need today's template for the daily analysis
  const todayStr = getNormalizedDate(new Date());
  const todayTemplateId = calendar.find(c => c.date === todayStr)?.template_id;
  const todayTemplate = templates.find(t => t.id === todayTemplateId) || null;

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

      // Get water settings
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

    // Launch generation inside an async IIFE without awaiting it
    (async () => {
      try {
        const res = await autocompleteDietWithAi("Necesito una dieta balanceada para empezar.");
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-48 bg-slate-100 rounded-full" />
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <h3 className="text-lg font-bold text-rose-800">Inicia sesión</h3>
        <p className="text-sm text-rose-700 mt-2">
          Debes iniciar sesión para configurar tu plan de dieta.
        </p>
        <Link href="/login" className="mt-4 inline-flex rounded-full bg-slate-950 px-6 py-2 text-sm font-semibold text-white">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const hasAnyData = templates.length > 0;

  return (
    <div className="space-y-6">
      {/* Cabecera general */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Nutrición de Precisión
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Gestor Nutricional Avanzado
            </h2>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Volver al Inicio
          </Link>
        </div>

        {hasAnyData && (
          <div className="mt-6 flex border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`pb-3 text-sm font-bold transition-all relative px-2 mr-6 ${
                activeTab === 'plan' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Calendario de Dietas
              {activeTab === 'plan' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={`pb-3 text-sm font-bold transition-all relative px-2 ${
                activeTab === 'analysis' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Análisis de Hoy
              {activeTab === 'analysis' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />}
            </button>
          </div>
        )}
      </div>

      {/* Renders Principales */}
      {!hasAnyData ? (
        <DietEmptyState 
          onManualCreate={() => {}} 
          onAiGenerate={handleAiGenerate} 
          isLoadingAi={isGeneratingAi} 
        />
      ) : (
        <div>
          {activeTab === 'plan' ? (
            <DietCalendarView templates={templates} calendar={calendar} onUpdate={loadData} />
          ) : (
            <DailyAnalysisTab realLog={realLog} dietPlan={todayTemplate} dailyWaterTarget={dailyWaterTarget} onUpdate={loadData} />
          )}
        </div>
      )}
    </div>
  );
}
