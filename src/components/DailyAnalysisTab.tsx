'use client';

import React from 'react';
import { type DailyLog } from '@/lib/schema';
import { type DietPlan } from '@/app/nutrition/actions';
import { defaultDailyPlan } from '@/lib/schema';

interface DailyAnalysisTabProps {
  realLog: DailyLog | null;
  dietPlan: DietPlan | null;
  dailyWaterTarget: number;
}

interface BatteryMetricProps {
  label: string;
  actual: number;
  target: number;
  unit: string;
  colorClass: string;
  bgClass: string;
}

function BatteryMetric({ label, actual, target, unit, colorClass, bgClass }: BatteryMetricProps) {
  const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
  const isOverflow = actual > target;
  
  // Cap visual width at 100% for progress bar container, but show warning colors
  const visualWidth = Math.min(100, percentage);
  
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-500 font-medium">
          {actual} / {target} {unit}
        </span>
      </div>

      <div className="relative mt-3 h-5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          style={{ width: `${visualWidth}%` }}
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isOverflow
              ? 'bg-gradient-to-r from-orange-500 to-rose-600'
              : colorClass
          }`}
        />
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={`font-semibold ${isOverflow ? 'text-rose-600' : 'text-slate-600'}`}>
          {percentage}% {isOverflow ? '¡Superado!' : ''}
        </span>
        {isOverflow && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-600 border border-rose-100">
            +{actual - target} {unit} exceso
          </span>
        )}
      </div>
    </div>
  );
}

export default function DailyAnalysisTab({ realLog, dietPlan, dailyWaterTarget }: DailyAnalysisTabProps) {
  // Fallbacks if no diet plan is active
  const dayIndex = new Date().getDay();
  const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayKey = daysMap[dayIndex] as keyof NonNullable<DietPlan>['weekly_schedule'];
  
  const todayPlan = dietPlan?.weekly_schedule?.[todayKey] || defaultDailyPlan;

  const targets = {
    kcal: todayPlan.target_kcal,
    protein: todayPlan.target_protein,
    carbs: todayPlan.target_carbs,
    fats: todayPlan.target_fats,
    water: dailyWaterTarget ?? 2000,
  };

  // Real data recorded today
  const actual = {
    kcal: realLog?.total_kcal ?? 0,
    protein: realLog?.protein_g ?? 0,
    carbs: realLog?.carbs_g ?? 0,
    fats: realLog?.fats_g ?? 0,
    water: realLog?.water_ml ?? realLog?.hidratacion_ml ?? 0,
  };

  const meals = realLog?.comidas ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-slate-900">Análisis del Consumo de Hoy</h3>
        <p className="text-xs text-slate-500 mb-6">Comparativa matemática en tiempo real entre tus objetivos guardados y las ingestas registradas en el chat.</p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Calorías */}
          <BatteryMetric
            label="🔥 Calorías totales"
            actual={actual.kcal}
            target={targets.kcal}
            unit="kcal"
            colorClass="bg-gradient-to-r from-violet-500 to-purple-600"
            bgClass="bg-violet-50"
          />

          {/* Hidratación */}
          <BatteryMetric
            label="💧 Agua consumida"
            actual={actual.water}
            target={targets.water}
            unit="ml"
            colorClass="bg-gradient-to-r from-cyan-400 to-sky-500"
            bgClass="bg-cyan-50"
          />

          {/* Proteínas */}
          <BatteryMetric
            label="💪 Proteína"
            actual={actual.protein}
            target={targets.protein}
            unit="g"
            colorClass="bg-gradient-to-r from-emerald-400 to-teal-500"
            bgClass="bg-emerald-50"
          />

          {/* Carbohidratos */}
          <BatteryMetric
            label="🌾 Carbohidratos"
            actual={actual.carbs}
            target={targets.carbs}
            unit="g"
            colorClass="bg-gradient-to-r from-yellow-400 to-amber-500"
            bgClass="bg-yellow-50"
          />

          {/* Grasas */}
          <BatteryMetric
            label="🥑 Grasas"
            actual={actual.fats}
            target={targets.fats}
            unit="g"
            colorClass="bg-gradient-to-r from-orange-400 to-amber-600"
            bgClass="bg-orange-50"
          />
        </div>
      </div>

      {/* Alimentos Consumidos Hoy */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-slate-900">Comidas Registradas Hoy</h3>
        <p className="text-xs text-slate-500 mb-4">Comidas detectadas y analizadas metabólicamente por el Bio-Avatar a través del chat.</p>

        {meals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-400">
            Aún no has registrado ninguna comida hoy. ¡Escríbele a la IA en el chat para apuntarlas!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white/80 rounded-2xl border border-slate-100 overflow-hidden">
            {meals.map((meal, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 text-sm hover:bg-slate-50 transition">
                <div>
                  <span className="font-semibold text-slate-900 mr-3">{meal.hora}</span>
                  <span className="text-slate-700">{meal.descripcion}</span>
                </div>
                <div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      meal.calidad_nutricional === 'buena'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : meal.calidad_nutricional === 'regular'
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                  >
                    Nutrición {meal.calidad_nutricional}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dietPlan && (
        <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-slate-900">Menús de Referencia del Plan ({todayKey})</h3>
          <p className="text-xs text-slate-500 mb-4">Tus menús planificados para comparar con lo consumido.</p>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white/80 p-4 border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Desayuno 🥞</span>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {todayPlan.meals.breakfast || 'No configurado'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Comida 🍗</span>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {todayPlan.meals.lunch || 'No configurado'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Cena 🐟</span>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {todayPlan.meals.dinner || 'No configurado'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 border border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Snacks 🍎</span>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {todayPlan.meals.snacks || 'No configurado'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
