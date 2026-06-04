'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { getDietPlan, type DietPlan, autocompleteDietWithAi, defaultWeeklyPlan } from '@/app/nutrition/actions';
import DietEmptyState from './DietEmptyState';
import WeeklyPlanner from './WeeklyPlanner';
import DailyAnalysisTab from './DailyAnalysisTab';
import DietPlanModal from './DietPlanModal';
import toast from '@/lib/toast';

export default function NutritionContainer() {
  const [activeTab, setActiveTab] = useState<'plan' | 'analysis'>('analysis');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [realLog, setRealLog] = useState<DailyLog | null>(null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }
      
      const user = userData.user;
      
      const metadata = user.user_metadata || {};
      setDailyWaterTarget(Number(metadata.daily_water_target_ml ?? 2000));

      const plan = await getDietPlan();
      setDietPlan(plan);

      const todayStr = getNormalizedDate(new Date());
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
    } catch (err) {
      console.error('Error loading nutrition module data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAiGenerate = async () => {
    setIsGeneratingAi(true);
    toast.success('Analizando tu perfil e historial para crear tu plan...');
    try {
      const res = await autocompleteDietWithAi();
      if (res.success && res.data) {
        toast.success('Plan generado. Guardando...');
        const { saveDietPlan } = await import('@/app/nutrition/actions');
        await saveDietPlan(res.data);
        await loadData();
      } else {
        toast.error(res.error || 'Error al generar.');
      }
    } catch (err) {
      toast.error('Ocurrió un error inesperado con la IA.');
    } finally {
      setIsGeneratingAi(false);
    }
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
              Planificación y Análisis
            </h2>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Volver al Inicio
          </Link>
        </div>

        {dietPlan && (
          <div className="mt-6 flex border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={`pb-3 text-sm font-bold transition-all relative px-2 mr-6 ${
                activeTab === 'analysis' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Análisis Diario
              {activeTab === 'analysis' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`pb-3 text-sm font-bold transition-all relative px-2 ${
                activeTab === 'plan' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Mi Plan Semanal
              {activeTab === 'plan' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />}
            </button>
          </div>
        )}
      </div>

      {/* Renders Principales */}
      {!dietPlan ? (
        <DietEmptyState 
          onManualCreate={() => setShowManualModal(true)} 
          onAiGenerate={handleAiGenerate} 
          isLoadingAi={isGeneratingAi} 
        />
      ) : (
        <div>
          {activeTab === 'analysis' ? (
            <DailyAnalysisTab realLog={realLog} dietPlan={dietPlan} dailyWaterTarget={dailyWaterTarget} />
          ) : (
            <WeeklyPlanner weeklySchedule={dietPlan.weekly_schedule} onPlanUpdate={loadData} />
          )}
        </div>
      )}

      {/* Modal Manual (solo para cuando no hay plan) */}
      {showManualModal && !dietPlan && (
        <DietPlanModal
          day="toda la semana"
          currentData={defaultWeeklyPlan.lunes}
          fullSchedule={defaultWeeklyPlan}
          onClose={() => setShowManualModal(false)}
          onSaveSuccess={() => {
            setShowManualModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
