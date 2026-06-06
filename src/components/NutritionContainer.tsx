'use client';

import React from 'react';
import Link from 'next/link';
import DietEmptyState from './DietEmptyState';
import DietCalendarView from './DietCalendarView';
import RecipeLibrary from './RecipeLibrary';
import DailyTemplateBuilder from './DailyTemplateBuilder';
import ProgramBuilder from './ProgramBuilder';
import TodayAnalysis from './TodayAnalysis';
import { useNutritionPlan } from '@/hooks/useNutritionPlan';
import { BookOpen, Calendar, PieChart, Utensils, RotateCw } from 'lucide-react';

export default function NutritionContainer() {
  const {
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
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
              Nutrición de Precisión
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
              Gestor Nutricional Clínico
            </h2>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            Volver al Inicio
          </Link>
        </div>

        {hasAnyData && (
          <div className="mt-6 flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none gap-6">
            
            {/* Recetario Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('recipes')}
              className={`pb-3 text-xs sm:text-sm font-black transition-all relative px-2 flex items-center gap-1.5 ${
                activeTab === 'recipes' ? 'text-slate-850' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Recetario
              {activeTab === 'recipes' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-850 rounded-full" />
              )}
            </button>

            {/* Mis Días Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('days')}
              className={`pb-3 text-xs sm:text-sm font-black transition-all relative px-2 flex items-center gap-1.5 ${
                activeTab === 'days' ? 'text-slate-850' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <Utensils className="w-4 h-4" />
              Mis Días
              {activeTab === 'days' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-850 rounded-full" />
              )}
            </button>

            {/* Programas Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('programs')}
              className={`pb-3 text-xs sm:text-sm font-black transition-all relative px-2 flex items-center gap-1.5 ${
                activeTab === 'programs' ? 'text-slate-850' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              Programas
              {activeTab === 'programs' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-850 rounded-full" />
              )}
            </button>

            {/* Calendario Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`pb-3 text-xs sm:text-sm font-black transition-all relative px-2 flex items-center gap-1.5 ${
                activeTab === 'calendar' ? 'text-slate-850' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendario
              {activeTab === 'calendar' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-850 rounded-full" />
              )}
            </button>

            {/* Análisis de Hoy Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('analysis')}
              className={`pb-3 text-xs sm:text-sm font-black transition-all relative px-2 flex items-center gap-1.5 ${
                activeTab === 'analysis' ? 'text-slate-850' : 'text-slate-400 hover:text-slate-650'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Análisis de Hoy
              {activeTab === 'analysis' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-850 rounded-full" />
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
          {activeTab === 'recipes' && (
            <RecipeLibrary />
          )}
          {activeTab === 'days' && (
            <DailyTemplateBuilder />
          )}
          {activeTab === 'programs' && (
            <ProgramBuilder />
          )}
          {activeTab === 'calendar' && (
            <DietCalendarView
              templates={templates}
              calendar={calendar}
              recipes={recipes}
              overrides={overrides}
              activeProgram={activeProgram}
              activeProgramDays={activeProgramDays}
              onUpdate={loadData}
            />
          )}
          {activeTab === 'analysis' && (
            <TodayAnalysis
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
