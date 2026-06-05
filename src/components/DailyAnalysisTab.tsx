'use client';

import React, { useState, useEffect } from 'react';
import { type DailyLog, type DietTemplate } from '@/lib/schema';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import ConcentricProgressRings from './ConcentricProgressRings';
import toast from '@/lib/toast';
import { Flame, Dumbbell, Droplet, Plus, Trash2, Edit3, Settings, ShieldAlert, Sparkles } from 'lucide-react';

interface DailyAnalysisTabProps {
  realLog: DailyLog | null;
  dietPlan: DietTemplate | null;
  dailyWaterTarget: number;
  onUpdate?: () => void | Promise<void>;
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

export default function DailyAnalysisTab({ realLog, dietPlan, dailyWaterTarget, onUpdate }: DailyAnalysisTabProps) {
  const todayStr = getNormalizedDate(new Date());
  
  const targets = {
    kcal: dietPlan?.target_kcal ?? 2000,
    protein: dietPlan?.target_protein ?? 150,
    carbs: dietPlan?.target_carbs ?? 200,
    fats: dietPlan?.target_fats ?? 70,
    water: dailyWaterTarget ?? 2000,
  };

  // State to hold local edits
  const [engineMode, setEngineMode] = useState<'agile' | 'surgical'>('agile');
  const [loading, setLoading] = useState(false);

  // Agile sliders / inputs
  const [kcalInput, setKcalInput] = useState(0);
  const [proteinInput, setProteinInput] = useState(0);
  const [carbsInput, setCarbsInput] = useState(0);
  const [fatsInput, setFatsInput] = useState(0);
  const [waterInput, setWaterInput] = useState(0);

  // Surgical list
  const [mealsList, setMealsList] = useState<Array<{ hora: string; descripcion: string; calidad_nutricional: 'buena' | 'regular' | 'mala' }>>([]);
  
  // Form for new meal in surgical mode
  const [newMealDesc, setNewMealDesc] = useState('');
  const [newMealHour, setNewMealHour] = useState('08:00');
  const [newMealQuality, setNewMealQuality] = useState<'buena' | 'regular' | 'mala'>('buena');

  // Sync state with incoming realLog
  useEffect(() => {
    if (realLog) {
      setKcalInput(realLog.total_kcal ?? 0);
      setProteinInput(realLog.protein_g ?? 0);
      setCarbsInput(realLog.carbs_g ?? 0);
      setFatsInput(realLog.fats_g ?? 0);
      setWaterInput(realLog.water_ml ?? realLog.hidratacion_ml ?? 0);
      setMealsList(realLog.comidas ?? []);
    } else {
      setKcalInput(0);
      setProteinInput(0);
      setCarbsInput(0);
      setFatsInput(0);
      setWaterInput(0);
      setMealsList([]);
    }
  }, [realLog]);

  // Dopamina visual: Confetti trigger
  const isKcalGoalMet = kcalInput >= targets.kcal && targets.kcal > 0;
  const confettiTriggeredRef = React.useRef(false);

  useEffect(() => {
    if (isKcalGoalMet && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;
      import('@/utils/rewards').then((mod) => mod.triggerStreakConfetti());
    } else if (!isKcalGoalMet) {
      confettiTriggeredRef.current = false;
    }
  }, [isKcalGoalMet]);

  // Save updates to Supabase
  const handleSave = async (updatedKcal = kcalInput, updatedProtein = proteinInput, updatedCarbs = carbsInput, updatedFats = fatsInput, updatedWater = waterInput, updatedMeals = mealsList) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión.');
        return;
      }

      // Fetch existing daily log to preserve non-nutrition data
      const { data: logRecord } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      const existingAiData = logRecord?.ai_data || {};
      const newAiData: DailyLog = {
        date: todayStr,
        comidas: updatedMeals,
        hidratacion_ml: updatedWater,
        toxinas: existingAiData.toxinas || [],
        bio_avatar: existingAiData.bio_avatar || {
          estado_fisiologico: 'Estable',
          energia_fisica: 3,
          claridad_mental: 3,
        },
        metricas: existingAiData.metricas || {
          variacion_inercia: 0,
          aciertos: [],
          error_clave: 'ninguno',
          accion_manana: 'Ninguna',
        },
        water_ml: updatedWater,
        total_kcal: updatedKcal,
        protein_g: updatedProtein,
        carbs_g: updatedCarbs,
        fats_g: updatedFats,
        habits_count: existingAiData.habits_count || {},
        propuestas_habitos: existingAiData.propuestas_habitos || [],
      };

      const { error } = await supabase
        .from('daily_logs')
        .upsert(
          {
            user_id: user.id,
            date: todayStr,
            health_momentum: logRecord?.health_momentum ?? 50,
            ai_data: newAiData,
            habit_tracking: logRecord?.habit_tracking ?? [],
          },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;

      toast.success('¡Nutrición actualizada con éxito!');
      if (onUpdate) await onUpdate();
    } catch (err: any) {
      console.error('Error saving nutrition:', err);
      toast.error('Error al guardar: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Quick increment handlers for agile mode
  const quickKcal = (amount: number) => {
    const nextVal = Math.max(0, kcalInput + amount);
    setKcalInput(nextVal);
  };
  const quickProtein = (amount: number) => {
    const nextVal = Math.max(0, proteinInput + amount);
    setProteinInput(nextVal);
  };
  const quickWater = (amount: number) => {
    const nextVal = Math.max(0, waterInput + amount);
    setWaterInput(nextVal);
  };

  // Surgical mode additions
  const addMeal = async () => {
    if (!newMealDesc.trim()) {
      toast.error('Escribe una descripción de la comida.');
      return;
    }

    const newMeal = {
      hora: newMealHour,
      descripcion: newMealDesc.trim(),
      calidad_nutricional: newMealQuality,
    };

    const updatedMeals = [...mealsList, newMeal];
    setMealsList(updatedMeals);
    setNewMealDesc('');

    // Save and update
    await handleSave(kcalInput, proteinInput, carbsInput, fatsInput, waterInput, updatedMeals);
  };

  const removeMeal = async (idx: number) => {
    const updatedMeals = mealsList.filter((_, i) => i !== idx);
    setMealsList(updatedMeals);
    await handleSave(kcalInput, proteinInput, carbsInput, fatsInput, waterInput, updatedMeals);
  };

  return (
    <div className="space-y-6">
      {/* 3 Concentric Rings comparing Real vs Plan */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Tu Estado Nutricional en Tiempo Real</h3>
        <p className="text-xs text-slate-500 mb-6">Comparativa matemática de Calorías (externo), Proteínas (medio) y Agua (interno).</p>
        
        <div className="flex justify-center">
          <ConcentricProgressRings
            realKcal={kcalInput}
            targetKcal={targets.kcal}
            realProtein={proteinInput}
            targetProtein={targets.protein}
            realWater={waterInput}
            targetWater={targets.water}
            size={220}
          />
        </div>
      </div>

      {/* Dual Nutrition Engine Switch & Panels */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-600" />
              Motor Fisiológico Dual
            </h3>
            <p className="text-xs text-slate-500">Elige el método de registro de ingestas que mejor se adapte a tu momento.</p>
          </div>

          {/* Toggle Switches */}
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              onClick={() => setEngineMode('agile')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                engineMode === 'agile'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Modo Ágil (Rápido)
            </button>
            <button
              onClick={() => setEngineMode('surgical')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                engineMode === 'surgical'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Modo Quirúrgico (Detalle)
            </button>
          </div>
        </div>

        {engineMode === 'agile' ? (
          /* AGILE MODE PANEL */
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-rose-500" />
                Registrador Express de Macronutrientes
              </h4>
              
              {/* Kcal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Flame className="h-4 w-4 text-rose-500" /> Calorías totales (kcal)
                  </label>
                  <span className="text-sm font-bold text-slate-800">{kcalInput} / {targets.kcal}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={kcalInput}
                    onChange={(e) => setKcalInput(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => quickKcal(-250)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">-250</button>
                    <button onClick={() => quickKcal(250)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">+250</button>
                  </div>
                </div>
              </div>

              {/* Proteínas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Dumbbell className="h-4 w-4 text-emerald-500" /> Proteína (g)
                  </label>
                  <span className="text-sm font-bold text-slate-800">{proteinInput}g / {targets.protein}g</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="5"
                    value={proteinInput}
                    onChange={(e) => setProteinInput(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => quickProtein(-15)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">-15g</button>
                    <button onClick={() => quickProtein(15)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">+15g</button>
                  </div>
                </div>
              </div>

              {/* Agua */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Droplet className="h-4 w-4 text-cyan-500" /> Agua consumida (ml)
                  </label>
                  <span className="text-sm font-bold text-slate-800">{waterInput}ml / {targets.water}ml</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={waterInput}
                    onChange={(e) => setWaterInput(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => quickWater(-250)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">-250</button>
                    <button onClick={() => quickWater(250)} className="bg-white hover:bg-slate-100 text-xs border border-slate-200 rounded px-2 py-1 font-bold">+250</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    value={carbsInput}
                    onChange={(e) => setCarbsInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    value={fatsInput}
                    onChange={(e) => setFatsInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSave()}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : 'Confirmar Registro Ágil'}
            </button>
          </div>
        ) : (
          /* SURGICAL MODE PANEL */
          <div className="space-y-6">
            {/* Meal Creator Form */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                Registrar Comida Específica
              </h4>
              
              <div className="grid gap-3 sm:grid-cols-[1.5fr_0.8fr_0.8fr_auto] items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">¿Qué has comido?</label>
                  <input
                    type="text"
                    placeholder="Ej. Pechuga de pollo con brócoli"
                    value={newMealDesc}
                    onChange={(e) => setNewMealDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hora</label>
                  <input
                    type="time"
                    value={newMealHour}
                    onChange={(e) => setNewMealHour(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Calidad</label>
                  <select
                    value={newMealQuality}
                    onChange={(e) => setNewMealQuality(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="buena">🟢 Buena</option>
                    <option value="regular">🟡 Regular</option>
                    <option value="mala">🔴 Mala</option>
                  </select>
                </div>

                <button
                  onClick={addMeal}
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold p-3 rounded-xl transition flex items-center justify-center disabled:opacity-50"
                  title="Añadir Comida"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* List of Registered Meals */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ingestas Registradas Hoy</h4>
              
              {mealsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-400">
                  Ninguna comida ingresada en el modo quirúrgico. ¡Prueba a añadir una!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  {mealsList.map((meal, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 text-sm hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 bg-slate-100 rounded-lg px-2 py-0.5 text-xs">{meal.hora}</span>
                        <span className="text-slate-700 font-medium">{meal.descripcion}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            meal.calidad_nutricional === 'buena'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : meal.calidad_nutricional === 'regular'
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}
                        >
                          {meal.calidad_nutricional}
                        </span>
                        
                        <button
                          onClick={() => removeMeal(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Eliminar comida"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual adjustments of macros below the list */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ajustar Macros Totales Manualmente
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Calorías</label>
                  <input
                    type="number"
                    value={kcalInput}
                    onChange={(e) => setKcalInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Proteína</label>
                  <input
                    type="number"
                    value={proteinInput}
                    onChange={(e) => setProteinInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Carbos</label>
                  <input
                    type="number"
                    value={carbsInput}
                    onChange={(e) => setCarbsInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Grasa</label>
                  <input
                    type="number"
                    value={fatsInput}
                    onChange={(e) => setFatsInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Agua (ml)</label>
                  <input
                    type="number"
                    value={waterInput}
                    onChange={(e) => setWaterInput(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSave()}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Guardando...' : 'Guardar Ajustes Quirúrgicos'}
            </button>
          </div>
        )}
      </div>

      {/* Traditional Metrics Dashboard for visibility */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Desglose de Progreso de Hoy</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <BatteryMetric
            label="🔥 Calorías totales"
            actual={kcalInput}
            target={targets.kcal}
            unit="kcal"
            colorClass="bg-gradient-to-r from-rose-500 to-rose-600"
            bgClass="bg-rose-50"
          />

          <BatteryMetric
            label="💧 Agua consumida"
            actual={waterInput}
            target={targets.water}
            unit="ml"
            colorClass="bg-gradient-to-r from-cyan-400 to-sky-500"
            bgClass="bg-cyan-50"
          />

          <BatteryMetric
            label="💪 Proteína"
            actual={proteinInput}
            target={targets.protein}
            unit="g"
            colorClass="bg-gradient-to-r from-emerald-400 to-teal-500"
            bgClass="bg-emerald-50"
          />

          <BatteryMetric
            label="🌾 Carbohidratos"
            actual={carbsInput}
            target={targets.carbs}
            unit="g"
            colorClass="bg-gradient-to-r from-yellow-400 to-amber-500"
            bgClass="bg-yellow-50"
          />

          <BatteryMetric
            label="🥑 Grasas"
            actual={fatsInput}
            target={targets.fats}
            unit="g"
            colorClass="bg-gradient-to-r from-orange-400 to-amber-600"
            bgClass="bg-orange-50"
          />
        </div>
      </div>

      {/* Diet templates list */}
      {dietPlan && dietPlan.meals && dietPlan.meals.length > 0 && (
        <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-slate-900">Menús de Referencia: {dietPlan.name}</h3>
          <p className="text-xs text-slate-500 mb-4">Tus menús planificados para comparar con lo consumido.</p>

          <div className="grid gap-4 md:grid-cols-4">
            {dietPlan.meals.map(meal => (
              <div key={meal.id} className="rounded-2xl bg-white/80 p-4 border border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">{meal.name}</span>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {meal.text || 'No hay descripción'}
                </p>
                <div className="mt-3 text-[10px] font-bold text-slate-400">
                  {meal.target_kcal} kcal • P: {meal.target_protein}g • C: {meal.target_carbs}g • G: {meal.target_fats}g
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
