'use client';

import React, { useState } from 'react';
import { type DailyLog, type DietTemplate } from '@/lib/schema';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import { Edit3, Trash2, Plus, AlertCircle, Sparkles, Scale, Utensils } from 'lucide-react';
import toast from '@/lib/toast';
import { hapticLight, hapticSuccess, hapticError } from '@/utils/haptics';

interface TodayAnalysisProps {
  realLog: DailyLog | null;
  dietPlan: DietTemplate | null;
  dailyWaterTarget: number;
  onUpdate?: () => void | Promise<void>;
}

interface FoodItem {
  id: string;
  nombre: string;
  gramos: number;
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export default function TodayAnalysis({ realLog, dietPlan, dailyWaterTarget, onUpdate }: TodayAnalysisProps) {
  const todayStr = getNormalizedDate(new Date());
  
  // Targets from active plan or defaults
  const targets = {
    kcal: dietPlan?.target_kcal ?? 2000,
    protein: dietPlan?.target_protein ?? 150,
    carbs: dietPlan?.target_carbs ?? 200,
    fats: dietPlan?.target_fats ?? 70,
    water: dailyWaterTarget ?? 2000,
  };

  // State for food items logged today
  const foods: FoodItem[] = realLog?.alimentos_registrados || [];

  // Edit / Audit States
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editGrams, setEditGrams] = useState<number>(0);
  const [editKcal, setEditKcal] = useState<number>(0);
  const [editProtein, setEditProtein] = useState<number>(0);
  const [editCarbs, setEditCarbs] = useState<number>(0);
  const [editFats, setEditFats] = useState<number>(0);

  // Manual Add States
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodGrams, setNewFoodGrams] = useState<number>(100);
  const [newFoodKcal, setNewFoodKcal] = useState<number>(150);
  const [newFoodProtein, setNewFoodProtein] = useState<number>(15);
  const [newFoodCarbs, setNewFoodCarbs] = useState<number>(10);
  const [newFoodFats, setNewFoodFats] = useState<number>(3);

  const [saving, setSaving] = useState(false);

  // Totals calculations from actual foods
  const actualKcal = foods.reduce((sum, f) => sum + (f.kcal || 0), 0);
  const actualProtein = foods.reduce((sum, f) => sum + (f.proteinas || 0), 0);
  const actualCarbs = foods.reduce((sum, f) => sum + (f.carbohidratos || 0), 0);
  const actualFats = foods.reduce((sum, f) => sum + (f.grasas || 0), 0);

  // Deltas (Actual - Planned)
  const deltaKcal = actualKcal - targets.kcal;
  const deltaProtein = actualProtein - targets.protein;
  const deltaCarbs = actualCarbs - targets.carbs;

  // Formatting helper for Delta values
  const formatDelta = (value: number, unit: string) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value} ${unit}`;
  };

  // Safe database helper to update daily log
  const saveFoodLog = async (updatedFoods: FoodItem[]) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        hapticError();
        toast.error('Debes iniciar sesión.');
        return;
      }

      const { data: logRecord } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      const existingAiData = logRecord?.ai_data || {};
      
      // Calculate updated total metrics atomically
      const nextKcal = updatedFoods.reduce((sum, f) => sum + Math.round(f.kcal), 0);
      const nextProtein = updatedFoods.reduce((sum, f) => sum + Math.round(f.proteinas), 0);
      const nextCarbs = updatedFoods.reduce((sum, f) => sum + Math.round(f.carbohidratos), 0);
      const nextFats = updatedFoods.reduce((sum, f) => sum + Math.round(f.grasas), 0);

      const newAiData: DailyLog = {
        ...existingAiData,
        date: todayStr,
        alimentos_registrados: updatedFoods,
        total_kcal: nextKcal,
        protein_g: nextProtein,
        carbs_g: nextCarbs,
        fats_g: nextFats,
        water_ml: existingAiData.water_ml ?? existingAiData.hidratacion_ml ?? 0,
        hidratacion_ml: existingAiData.hidratacion_ml ?? 0,
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
        habits_count: existingAiData.habits_count || {},
      };

      const { error } = await supabase.from('daily_logs').upsert(
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
      hapticSuccess();
      toast.success('Cambios guardados con éxito.');
      if (onUpdate) await onUpdate();
    } catch (err: any) {
      hapticError();
      console.error(err);
      toast.error('Error al guardar: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Edit action trigger
  const startEditing = (food: FoodItem) => {
    hapticLight();
    setEditingFood(food);
    setEditGrams(food.gramos);
    setEditKcal(food.kcal);
    setEditProtein(food.proteinas);
    setEditCarbs(food.carbohidratos);
    setEditFats(food.grasas);
  };

  // Scale handler when user edits grams
  const handleGramsChange = (newGrams: number) => {
    setEditGrams(newGrams);
    if (!editingFood || editingFood.gramos <= 0) return;
    const factor = newGrams / editingFood.gramos;
    setEditKcal(Math.round(editingFood.kcal * factor));
    setEditProtein(Math.round(editingFood.proteinas * factor));
    setEditCarbs(Math.round(editingFood.carbohidratos * factor));
    setEditFats(Math.round(editingFood.grasas * factor));
  };

  // Commit edited item
  const saveEdit = async () => {
    if (!editingFood) return;
    await saveFoodLog(foods.map((f) => {
      if (f.id === editingFood.id) {
        return {
          ...f,
          gramos: editGrams,
          kcal: editKcal,
          proteinas: editProtein,
          carbohidratos: editCarbs,
          grasas: editFats,
        };
      }
      return f;
    }));
    setEditingFood(null);
  };

  // Delete item handler
  const deleteFood = async (foodId: string) => {
    hapticError();
    if (!confirm('¿Seguro que deseas eliminar este alimento?')) return;
    const updated = foods.filter((f) => f.id !== foodId);
    await saveFoodLog(updated);
  };

  // Manual Add Item Commit
  const addManualFood = async () => {
    if (!newFoodName.trim()) {
      hapticError();
      toast.error('Ingresa el nombre del alimento.');
      return;
    }
    const newItem: FoodItem = {
      id: `food-${Date.now()}`,
      nombre: newFoodName.trim(),
      gramos: newFoodGrams,
      kcal: newFoodKcal,
      proteinas: newFoodProtein,
      carbohidratos: newFoodCarbs,
      grasas: newFoodFats,
    };
    const updated = [...foods, newItem];
    setNewFoodName('');
    setIsAddingManual(false);
    await saveFoodLog(updated);
  };

  // Progress Bar Renderer Helpers
  const renderDualProgressBar = (actual: number, target: number, colorClass: string) => {
    // 100% target corresponds to 80% container width
    const percentage = target > 0 ? (actual / target) * 80 : 0;
    const isOverflow = actual > target;
    const baseWidth = isOverflow ? 80 : percentage;
    const excessWidth = isOverflow ? Math.min(20, ((actual - target) / target) * 80) : 0;

    return (
      <div className="relative w-full mt-3">
        {/* Progress Bar Track */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex relative">
          {/* Base Fill */}
          <div
            style={{ width: `${baseWidth}%` }}
            className={`h-full transition-all duration-500 ease-out ${colorClass}`}
          />
          {/* Excess Fill */}
          {isOverflow && (
            <div
              style={{ width: `${excessWidth}%` }}
              className="h-full bg-rose-450 transition-all duration-500 ease-out"
            />
          )}
        </div>
        {/* Target Marker vertical line */}
        <div
          className="absolute left-[80%] -top-0.5 bottom-0 w-[2px] bg-slate-700 z-10 h-4"
          title="Objetivo"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* ── Delta UI Dual Progress Bars ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calorías Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Calorías</span>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">{actualKcal} <span className="text-xs font-semibold text-slate-400">/ {targets.kcal} kcal</span></h4>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${deltaKcal > 100 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {formatDelta(deltaKcal, 'kcal')}
            </span>
          </div>
          {renderDualProgressBar(actualKcal, targets.kcal, 'bg-cyan-500')}
          <div className="flex justify-between text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-1.5">
            <span>0%</span>
            <span className="pr-12 text-slate-600">Objetivo</span>
            <span>125%</span>
          </div>
        </div>

        {/* Proteínas Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Proteína</span>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">{actualProtein}g <span className="text-xs font-semibold text-slate-400">/ {targets.protein}g</span></h4>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${deltaProtein < -15 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {formatDelta(deltaProtein, 'g')}
            </span>
          </div>
          {renderDualProgressBar(actualProtein, targets.protein, 'bg-emerald-500')}
          <div className="flex justify-between text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-1.5">
            <span>0%</span>
            <span className="pr-12 text-slate-600">Objetivo</span>
            <span>125%</span>
          </div>
        </div>

        {/* Carbohidratos Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Carbohidratos</span>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">{actualCarbs}g <span className="text-xs font-semibold text-slate-400">/ {targets.carbs}g</span></h4>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${Math.abs(deltaCarbs) > 30 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {formatDelta(deltaCarbs, 'g')}
            </span>
          </div>
          {renderDualProgressBar(actualCarbs, targets.carbs, 'bg-amber-500')}
          <div className="flex justify-between text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-1.5">
            <span>0%</span>
            <span className="pr-12 text-slate-600">Objetivo</span>
            <span>125%</span>
          </div>
        </div>
      </div>

      {/* ── Split-View Comparison Engine ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Columna Izquierda: Tu Plan (Referencia) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tu Plan de Referencia</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Metas diarias asignadas por tu ciclo</p>
            </div>
            {dietPlan && (
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {dietPlan.name}
              </span>
            )}
          </div>

          {dietPlan && dietPlan.meals && dietPlan.meals.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {dietPlan.meals.map((meal) => (
                <div key={meal.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{meal.name}</span>
                    <span className="text-[10px] font-black text-slate-500">{meal.target_kcal} kcal</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                    {meal.text || 'Sin descripción detallada.'}
                  </p>
                  <div className="flex gap-2.5 mt-1 text-[9px] font-bold text-slate-400">
                    <span>Prot: {meal.target_protein}g</span>
                    <span>Carbs: {meal.target_carbs}g</span>
                    <span>Grasas: {meal.target_fats}g</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center gap-2">
              <Utensils className="w-10 h-10 text-slate-350" />
              <p className="text-xs font-bold max-w-[240px]">No hay plan de referencia asignado para hoy. Crea o activa un programa.</p>
            </div>
          )}

          {/* Reference Targets summary footer */}
          {dietPlan && (
            <div className="mt-auto border-t border-slate-100 pt-3 flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
              <span>Metas Totales:</span>
              <span>{targets.kcal} kcal • P: {targets.protein}g • C: {targets.carbs}g • G: {targets.fats}g</span>
            </div>
          )}
        </div>

        {/* Columna Derecha: Registro Real */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tu Consumo Real</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Alimentos registrados e ingeridos hoy</p>
            </div>
            <button
              onClick={() => { hapticLight(); setIsAddingManual(true); }}
              className="text-[10px] font-black bg-slate-900 text-white rounded-full px-3 py-1.5 flex items-center gap-1 shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Manual
            </button>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {foods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center gap-2">
                <Sparkles className="w-10 h-10 text-slate-350" />
                <p className="text-xs font-bold max-w-[240px]">Todavía no has registrado ingestas hoy. Háblale a la IA o añade un alimento manualmente.</p>
              </div>
            ) : (
              foods.map((food) => (
                <div key={food.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between group transition-colors hover:border-slate-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{food.nombre}</span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {food.gramos}g
                      </span>
                    </div>
                    <div className="flex gap-2 text-[9px] font-bold text-slate-400">
                      <span className="text-rose-500 font-black">🔥 {food.kcal} kcal</span>
                      <span>P: {food.proteinas}g</span>
                      <span>C: {food.carbohidratos}g</span>
                      <span>G: {food.grasas}g</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(food)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                      title="Editar gramos"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFood(food.id)}
                      className="p-1.5 text-slate-450 hover:text-red-650 hover:bg-red-50 rounded-full transition"
                      title="Eliminar alimento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actual Ingested totals footer */}
          {foods.length > 0 && (
            <div className="mt-auto border-t border-slate-100 pt-3 flex justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
              <span>Ingerido Total:</span>
              <span className="text-slate-700">
                {actualKcal} kcal • P: {actualProtein}g • C: {actualCarbs}g • G: {actualFats}g
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Modal for Auditing / Editing Food ── */}
      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="bg-white border border-slate-250 rounded-[2rem] shadow-2xl p-6 max-w-sm w-full space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-500" /> Auditar Ingesta IA
              </span>
              <button
                onClick={() => { hapticLight(); setEditingFood(null); }}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Alimento</label>
                <input
                  type="text"
                  disabled
                  value={editingFood.nombre}
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-550 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Gramos</label>
                  <input
                    type="number"
                    value={editGrams}
                    onChange={(e) => handleGramsChange(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={editKcal}
                    onChange={(e) => setEditKcal(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Prot (g)</label>
                  <input
                    type="number"
                    value={editProtein}
                    onChange={(e) => setEditProtein(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Grasa (g)</label>
                  <input
                    type="number"
                    value={editFats}
                    onChange={(e) => setEditFats(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => { hapticLight(); setEditingFood(null); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-[2] py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition hover:bg-slate-800 active:scale-95"
              >
                {saving ? 'Guardando...' : 'Confirmar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Modal for Adding Food Manually ── */}
      {isAddingManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="bg-white border border-slate-250 rounded-[2rem] shadow-2xl p-6 max-w-sm w-full space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-500" /> Registrar Alimento
              </span>
              <button
                onClick={() => { hapticLight(); setIsAddingManual(false); }}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Nombre Alimento</label>
                <input
                  type="text"
                  placeholder="Ej. Pechuga de Pollo"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Gramos</label>
                  <input
                    type="number"
                    value={newFoodGrams}
                    onChange={(e) => setNewFoodGrams(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-1">Calorías (kcal)</label>
                  <input
                    type="number"
                    value={newFoodKcal}
                    onChange={(e) => setNewFoodKcal(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-1 focus:ring-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Prot (g)</label>
                  <input
                    type="number"
                    value={newFoodProtein}
                    onChange={(e) => setNewFoodProtein(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={newFoodCarbs}
                    onChange={(e) => setNewFoodCarbs(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Grasa (g)</label>
                  <input
                    type="number"
                    value={newFoodFats}
                    onChange={(e) => setNewFoodFats(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => { hapticLight(); setIsAddingManual(false); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={addManualFood}
                disabled={saving}
                className="flex-[2] py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition hover:bg-slate-800 active:scale-95"
              >
                {saving ? 'Guardando...' : 'Añadir Alimento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
