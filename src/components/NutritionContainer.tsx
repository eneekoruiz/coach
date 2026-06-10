'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DietCalendarView from './DietCalendarView';
import RecipeLibrary from './RecipeLibrary';
import DailyTemplateBuilder from './DailyTemplateBuilder';
import WeeklyPlanBuilder from './WeeklyPlanBuilder';
import TodayNutritionView from './TodayNutritionView';
import { useNutritionPlan, type NutritionTab } from '@/hooks/useNutritionPlan';
import { BookOpen, Calendar, ClipboardList, LayoutGrid, Sun } from 'lucide-react';

const nutritionTabs: Array<{
  id: NutritionTab;
  step: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'recipes', step: '1', label: 'Recetario', caption: 'Platos', icon: BookOpen },
  { id: 'days', step: '2', label: 'Días Base', caption: 'Plantillas', icon: Sun },
  { id: 'programs', step: '3', label: 'Planes Semanales', caption: '7 días', icon: ClipboardList },
  { id: 'calendar', step: '4', label: 'Calendario (Paciente)', caption: 'Mes', icon: Calendar },
];

export default function NutritionContainer({ initialTab }: { initialTab?: NutritionTab }) {
  const [isPlannerOpen, setIsPlannerOpen] = useState(Boolean(initialTab && initialTab !== 'calendar'));
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
    isGeneratingAi,
    todayTemplate,
    loadData,
    handleAiGenerate,
    handleMarkMealAsEaten,
  } = useNutritionPlan(initialTab);

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

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-3 overflow-hidden">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Nutrition Hub
            </div>
            <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Menú de hoy primero
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              El usuario ve qué toca comer ahora; el builder profesional queda a un toque.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('calendar');
                setIsPlannerOpen(false);
              }}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-all duration-200 ease-in-out active:scale-95 ${
                !isPlannerOpen
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-4 w-4" />
              Hoy
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95"
            >
              Inicio
            </Link>
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsPlannerOpen((current) => !current)}
            className="inline-flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Planificador PRO
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              {isPlannerOpen ? 'Ocultar' : 'Recetario · Días · Semanas'}
            </span>
          </button>
        </div>

        {isPlannerOpen && (
          <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {nutritionTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[68px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                } min-h-[54px]`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    isActive ? 'bg-white text-slate-900' : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {tab.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {tab.caption}
                  </span>
                </span>
              </button>
            );
          })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {!isPlannerOpen && (
          <TodayNutritionView
            todayTemplate={todayTemplate}
            realLog={realLog}
            isGeneratingAi={isGeneratingAi}
            onGenerateToday={handleAiGenerate}
            onMarkMealAsEaten={handleMarkMealAsEaten}
            onOpenPlanner={() => setIsPlannerOpen(true)}
          />
        )}
        {isPlannerOpen && activeTab === 'recipes' && <RecipeLibrary />}
        {isPlannerOpen && activeTab === 'days' && <DailyTemplateBuilder />}
        {isPlannerOpen && activeTab === 'programs' && <WeeklyPlanBuilder />}
        {isPlannerOpen && activeTab === 'calendar' && (
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
      </div>
    </div>
  );
}
