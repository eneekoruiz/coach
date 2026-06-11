'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Flame, Loader2, Sparkles, Utensils, Wand2 } from 'lucide-react';
import type { DailyLog, DietTemplate, MealItem } from '@/lib/schema';
import DietEmptyState from './DietEmptyState';
import DietScanner from './DietScanner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TodayNutritionViewProps {
  todayTemplate: DietTemplate | null;
  realLog: DailyLog | null;
  isGeneratingAi: boolean;
  todayWorkoutCalories: number;
  todayWorkoutMinutes: number;
  onGenerateToday: () => void;
  onMarkMealAsEaten: (meal: MealItem) => void;
  onOpenPlanner: () => void;
  onImportedDiet: () => Promise<void> | void;
}

function isMealLogged(log: DailyLog | null, meal: MealItem) {
  return Boolean(
    log?.comidas.some((item) => item.hora === meal.name && item.descripcion === meal.text)
  );
}

export default function TodayNutritionView({
  todayTemplate,
  realLog,
  isGeneratingAi,
  todayWorkoutCalories,
  todayWorkoutMinutes,
  onGenerateToday,
  onMarkMealAsEaten,
  onOpenPlanner,
  onImportedDiet,
}: TodayNutritionViewProps) {
  const [toolOpen, setToolOpen] = useState<string | undefined>();
  const totals = useMemo(() => {
    const meals = todayTemplate?.meals ?? [];
    return meals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + meal.target_kcal,
        protein: acc.protein + meal.target_protein,
        carbs: acc.carbs + meal.target_carbs,
        fats: acc.fats + meal.target_fats,
      }),
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayTemplate]);

  const eatenMeals = todayTemplate?.meals.filter((meal) => isMealLogged(realLog, meal)).length ?? 0;
  const totalMeals = todayTemplate?.meals.length ?? 0;

  return (
    <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_360px]">
      <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
              Hoy / Calendario
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {todayTemplate?.name ?? 'Tu menú de hoy'}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {todayTemplate
                ? `${eatenMeals}/${totalMeals} comidas registradas`
                : 'Genera o asigna un día para ver tu menú al instante.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPlanner}
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-95"
          >
            Planificador PRO
          </button>
        </div>

        <div className="mt-4 grid shrink-0 grid-cols-4 gap-2">
          {[
            ['Kcal', Math.round(totals.kcal), 'bg-slate-950 text-white'],
            ['Prot', `${Math.round(totals.protein)}g`, 'bg-emerald-50 text-emerald-700'],
            ['Carb', `${Math.round(totals.carbs)}g`, 'bg-sky-50 text-sky-700'],
            ['Grasa', `${Math.round(totals.fats)}g`, 'bg-amber-50 text-amber-700'],
          ].map(([label, value, className]) => (
            <div key={label} className={`rounded-2xl px-3 py-3 ${className}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
              <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 pr-1 lg:max-h-[58vh] lg:overflow-y-auto lg:scrollbar-hide">
          {todayTemplate ? (
            todayTemplate.meals.map((meal) => {
              const logged = isMealLogged(realLog, meal);
              return (
                <article
                  key={meal.id}
                  data-testid={`today-meal-${meal.name.toLowerCase()}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-all duration-200 ease-in-out hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200">
                          <Utensils className="h-4 w-4" />
                        </span>
                        <h3 className="truncate text-sm font-black text-slate-950">{meal.name}</h3>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                        {meal.text || 'Sin descripción'}
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        {Math.round(meal.target_kcal)} kcal · {Math.round(meal.target_protein)}P · {Math.round(meal.target_carbs)}C · {Math.round(meal.target_fats)}G
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onMarkMealAsEaten(meal)}
                      disabled={logged}
                      className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black transition-all duration-200 ease-in-out active:scale-95 ${
                        logged
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : 'bg-slate-950 text-white hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{logged ? 'Comido' : 'Me he comido esto'}</span>
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <DietEmptyState
              onAiGenerate={onGenerateToday}
              onManualCreate={onOpenPlanner}
              isLoadingAi={isGeneratingAi}
            />
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm scrollbar-hide">
        <Accordion type="single" collapsible value={toolOpen} onValueChange={setToolOpen} className="space-y-3">
          <AccordionItem value="ai-menu" className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
            <AccordionTrigger className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  AI Auto-Pilot
                </span>
                <span className="mt-1 block text-base font-black tracking-tight text-slate-950">
                  Generar Menú de Hoy
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <p className="text-sm font-semibold leading-6 text-slate-500">
                Crea una plantilla, la asigna a hoy y deja el día listo para registrar comida por comida.
              </p>
              <button
                type="button"
                onClick={onGenerateToday}
                disabled={isGeneratingAi}
                data-testid="generate-today-ai"
                className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span>{isGeneratingAi ? 'Generando menú' : 'Generar con IA'}</span>
              </button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sports" className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <AccordionTrigger className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 ring-1 ring-orange-100">
                  <Flame className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">
                    Gasto deportivo
                  </span>
                  <span className="mt-1 block text-base font-black tracking-tight text-slate-950">
                    {todayWorkoutCalories} kcal · {todayWorkoutMinutes} min
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <p className="text-xs font-semibold leading-5 text-slate-500">
                Lo usamos como lectura rápida de tu déficit o superávit real del día.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scanner" className="rounded-3xl border border-slate-200 bg-white p-4">
            <AccordionTrigger className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left text-sm font-black text-slate-950">
              Importar Dieta en Papel
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <DietScanner onImported={onImportedDiet} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </aside>
    </div>
  );
}
