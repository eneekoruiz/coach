'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DietCalendarView from './DietCalendarView';
import RecipeLibrary from './RecipeLibrary';
import DailyTemplateBuilder from './DailyTemplateBuilder';
import WeeklyPlanBuilder from './WeeklyPlanBuilder';
import TodayNutritionView from './TodayNutritionView';
import ScreenGuideButton from './ScreenGuideButton';
import BottomSheet from './BottomSheet';
import { useNutritionPlan, type NutritionTab } from '@/hooks/useNutritionPlan';
import { BookOpen, Calendar, ClipboardList, LayoutGrid, Sun } from 'lucide-react';

export default function NutritionContainer({ initialTab }: { initialTab?: NutritionTab }) {
  const {
    templates,
    calendar,
    recipes,
    overrides,
    activeProgram,
    activeProgramDays,
    realLog,
    isGeneratingAi,
    todayWorkoutCalories,
    todayWorkoutMinutes,
    todayTemplate,
    loadData,
    handleAiGenerate,
    handleMarkMealAsEaten,
  } = useNutritionPlan(initialTab);

  // Drawer states
  const [isTodayOpen, setIsTodayOpen] = useState(false);
  const [isRecipesOpen, setIsRecipesOpen] = useState(false);
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [isProgramsOpen, setIsProgramsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Automatically open initial tab on mount if provided
  React.useEffect(() => {
    if (initialTab === 'recipes') setIsRecipesOpen(true);
    else if (initialTab === 'days') setIsDaysOpen(true);
    else if (initialTab === 'programs') setIsProgramsOpen(true);
    else if (initialTab === 'calendar') setIsCalendarOpen(true);
  }, [initialTab]);

  const eatenMeals = todayTemplate?.meals.filter((meal) => {
    return Boolean(
      realLog?.comidas.some((item) => item.hora === meal.name && item.descripcion === meal.text)
    );
  }).length ?? 0;
  const totalMeals = todayTemplate?.meals.length ?? 0;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-3 overflow-hidden px-2 py-4">
      {/* Header Section */}
      <div className="shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Nutrition Hub
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Planificación y Registro
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Controla tu alimentación y recetas diarias desde un panel limpio y rápido.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95"
            >
              Inicio
            </Link>
          </div>
        </div>
      </div>

      {/* Premium iOS Grid Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Today Menu */}
          <button
            type="button"
            onClick={() => setIsTodayOpen(true)}
            className="flex flex-col text-left rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group min-h-[180px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-200 transition-transform duration-300 group-hover:scale-105">
              <Sun className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-950">Tu menú de hoy</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
              {todayTemplate 
                ? `${todayTemplate.name} · ${eatenMeals}/${totalMeals} comidas hechas`
                : "Sin menú asignado hoy. Genera uno con IA o manual."}
            </p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
              Ver y registrar menú →
            </span>
          </button>

          {/* Card 2: Recipes */}
          <button
            type="button"
            onClick={() => setIsRecipesOpen(true)}
            className="flex flex-col text-left rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 group min-h-[180px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition-transform duration-300 group-hover:scale-105">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-950">Recetario</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
              {recipes.length > 0
                ? `${recipes.length} platos guardados en tu biblioteca personal.`
                : "Construye tu catálogo de comidas saludables."}
            </p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
              Abrir biblioteca →
            </span>
          </button>

          {/* Card 3: Days Base */}
          <button
            type="button"
            onClick={() => setIsDaysOpen(true)}
            className="flex flex-col text-left rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50/60 via-white to-white p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 group min-h-[180px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-200 transition-transform duration-300 group-hover:scale-105">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-950">Días Base</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
              {templates.length > 0
                ? `${templates.length} plantillas completas listas para programar.`
                : "Agrupa recetas en días completos de comida."}
            </p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-600">
              Editar plantillas →
            </span>
          </button>

          {/* Card 4: Weekly Plans */}
          <button
            type="button"
            onClick={() => setIsProgramsOpen(true)}
            className="flex flex-col text-left rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50/60 via-white to-white p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300 group min-h-[180px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-200 transition-transform duration-300 group-hover:scale-105">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-950">Planes Semanales</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
              {activeProgram
                ? `Plan activo: ${activeProgram.name}.`
                : "Organiza semanas completas de alimentación recurrente."}
            </p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-600">
              Diseñar semana →
            </span>
          </button>

          {/* Card 5: Calendar */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="flex flex-col text-left rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-white p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300 group min-h-[180px] sm:col-span-2 lg:col-span-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-200 transition-transform duration-300 group-hover:scale-105">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-black tracking-tight text-slate-950">Calendario</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">
              Visualiza tu mes completo de dieta, asigna días base y haz ajustes clínicos.
            </p>
            <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
              Ver calendario →
            </span>
          </button>

        </div>
      </div>

      {/* Bottom Sheets Drawers (BottomSheets) */}
      <BottomSheet isOpen={isTodayOpen} onClose={() => setIsTodayOpen(false)} title="Tu menú de hoy">
        <TodayNutritionView
          todayTemplate={todayTemplate}
          realLog={realLog}
          isGeneratingAi={isGeneratingAi}
          todayWorkoutCalories={todayWorkoutCalories}
          todayWorkoutMinutes={todayWorkoutMinutes}
          onGenerateToday={handleAiGenerate}
          onMarkMealAsEaten={handleMarkMealAsEaten}
          onOpenPlanner={() => {
            setIsTodayOpen(false);
            setIsProgramsOpen(true);
          }}
          onImportedDiet={async () => {
            setIsTodayOpen(false);
            setIsProgramsOpen(true);
            await loadData();
          }}
        />
      </BottomSheet>

      <BottomSheet isOpen={isRecipesOpen} onClose={() => setIsRecipesOpen(false)} title="Recetario">
        <RecipeLibrary />
      </BottomSheet>

      <BottomSheet isOpen={isDaysOpen} onClose={() => setIsDaysOpen(false)} title="Días Base">
        <DailyTemplateBuilder />
      </BottomSheet>

      <BottomSheet isOpen={isProgramsOpen} onClose={() => setIsProgramsOpen(false)} title="Planes Semanales">
        <WeeklyPlanBuilder />
      </BottomSheet>

      <BottomSheet isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} title="Calendario (Paciente)">
        <DietCalendarView
          templates={templates}
          calendar={calendar}
          recipes={recipes}
          overrides={overrides}
          activeProgram={activeProgram}
          activeProgramDays={activeProgramDays}
          onUpdate={loadData}
        />
      </BottomSheet>
    </div>
  );
}
