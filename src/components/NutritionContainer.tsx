'use client';

import React from 'react';
import Link from 'next/link';
import DietCalendarView from './DietCalendarView';
import RecipeLibrary from './RecipeLibrary';
import DailyTemplateBuilder from './DailyTemplateBuilder';
import WeeklyPlanBuilder from './WeeklyPlanBuilder';
import { useNutritionPlan, type NutritionTab } from '@/hooks/useNutritionPlan';
import { BookOpen, Calendar, ClipboardList, Sun } from 'lucide-react';

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
    loadData,
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
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Nutrition Hub Pro
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Arquitectura Matryoshka Nutricional
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Construye de menor a mayor complejidad: receta, día base, semana y mes del paciente.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            Volver al Inicio
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                }`}
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
      </div>

      {activeTab === 'recipes' && <RecipeLibrary />}
      {activeTab === 'days' && <DailyTemplateBuilder />}
      {activeTab === 'programs' && <WeeklyPlanBuilder />}
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
    </div>
  );
}
