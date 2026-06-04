'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import { getDietPlan, type DietPlan } from '@/app/nutrition/actions';
import DietPlanForm from './DietPlanForm';
import DailyAnalysisTab from './DailyAnalysisTab';

export default function NutritionContainer() {
  const [activeTab, setActiveTab] = useState<'plan' | 'analysis'>('plan');
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [realLog, setRealLog] = useState<DailyLog | null>(null);
  const [dailyWaterTarget, setDailyWaterTarget] = useState(2000);

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
      
      // Load user water settings
      const metadata = user.user_metadata || {};
      setDailyWaterTarget(Number(metadata.daily_water_target_ml ?? 2000));

      // Load Diet Plan (Supabase user_diet_plans table)
      const plan = await getDietPlan();
      setDietPlan(plan);

      // Load Today's Real Log
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="mt-2 h-3 w-48 bg-slate-100 rounded-full" />
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-1/3 bg-slate-200 rounded-full mb-4" />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="h-16 bg-slate-100 rounded-2xl" />
            <div className="h-16 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
        <h3 className="text-lg font-bold text-rose-800">Inicia sesión</h3>
        <p className="text-sm text-rose-700 mt-2">
          Debes iniciar sesión para configurar tu plan de dieta y comparar tu consumo diario.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera / Banner */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Nutrición de Precisión
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Planificación y Análisis Nutricional
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl">
              Configura tu plan de macronutrientes manualmente o autocomplétalo con IA.
              Visualiza en tiempo real cualquier desviación de tus comidas del chat.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Tab Selector */}
        <div className="mt-6 flex border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`pb-3 text-sm font-bold transition-all relative px-2 mr-6 ${
              activeTab === 'plan'
                ? 'text-slate-950'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Mi Plan Semanal
            {activeTab === 'plan' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`pb-3 text-sm font-bold transition-all relative px-2 ${
              activeTab === 'analysis'
                ? 'text-slate-950'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Análisis Diario (Real vs Plan)
            {activeTab === 'analysis' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Renders Activos */}
      <div>
        {activeTab === 'plan' ? (
          <DietPlanForm initialPlan={dietPlan} onSaveSuccess={loadData} />
        ) : (
          <DailyAnalysisTab realLog={realLog} dietPlan={dietPlan} dailyWaterTarget={dailyWaterTarget} />
        )}
      </div>
    </div>
  );
}
