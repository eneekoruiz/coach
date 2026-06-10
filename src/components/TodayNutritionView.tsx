'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Loader2, Sparkles, Utensils, Wand2 } from 'lucide-react';
import type { DailyLog, DietTemplate, MealItem } from '@/lib/schema';

interface TodayNutritionViewProps {
  todayTemplate: DietTemplate | null;
  realLog: DailyLog | null;
  isGeneratingAi: boolean;
  onGenerateToday: () => void;
  onMarkMealAsEaten: (meal: MealItem) => void;
  onOpenPlanner: () => void;
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
  onGenerateToday,
  onMarkMealAsEaten,
  onOpenPlanner,
}: TodayNutritionViewProps) {
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
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_360px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-hide">
          {todayTemplate ? (
            todayTemplate.meals.map((meal) => {
              const logged = isMealLogged(realLog, meal);
              return (
                <article
                  key={meal.id}
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
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <Sparkles className="h-10 w-10 text-emerald-500" />
              <h3 className="mt-3 text-lg font-black tracking-tight text-slate-950">
                No hay menú asignado para hoy
              </h3>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                Pulsa el generador IA y te monta desayuno, comida, cena y macros sin pasar por el builder.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col justify-between rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            AI Auto-Pilot
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
            Genera el menú de hoy en segundos
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Crea una plantilla, la asigna a hoy y deja el día listo para registrar comida por comida.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerateToday}
          disabled={isGeneratingAi}
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGeneratingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          <span>{isGeneratingAi ? 'Generando menú' : 'Generar Menú de Hoy con IA'}</span>
        </button>
      </aside>
    </div>
  );
}
