'use client';

import React from 'react';
import Link from 'next/link';
import DietEmptyState from './DietEmptyState';
import DietCalendarView from './DietCalendarView';
import DailyAnalysisTab from './DailyAnalysisTab';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';

export default function NutritionContainer() {
  const {
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
  } = useNutritionPlan();

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
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-slate-950 px-6 py-2 text-sm font-semibold text-white"
        >
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
              {activeTab === 'plan' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={`pb-3 text-sm font-bold transition-all relative px-2 ${
                activeTab === 'analysis' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Análisis de Hoy
              {activeTab === 'analysis' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-950 rounded-full" />
              )}
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
            <DailyAnalysisTab
              realLog={realLog}
              dietPlan={todayTemplate}
              dailyWaterTarget={dailyWaterTarget}
              onUpdate={loadData}
            />
          )}
        </div>
      )}
    </div>
  );
}
