'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { type DietTemplate, type MealItem, type DietProgram, type DietProgramDay, type DailyDietOverride, defaultTemplate, type Recipe } from '@/lib/schema';
import { saveDailyDietOverride, saveDietTemplate, deleteDailyDietOverride, assignTemplateToDates } from '@/app/nutrition/actions';
import { Sparkles, Trash2, Plus, Calculator, Check, AlertCircle, X, Layers, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '@/lib/toast';

interface DayDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  templates: DietTemplate[];
  calendar: Array<{ date: string; template_id: string }>;
  recipes: Recipe[];
  overrides: DailyDietOverride[];
  activeProgram: DietProgram | null;
  activeProgramDays: DietProgramDay[];
  onUpdate: () => void;
}

export default function DayDetailDrawer({
  isOpen,
  onClose,
  date,
  templates,
  calendar,
  recipes,
  overrides,
  activeProgram,
  activeProgramDays,
  onUpdate,
}: DayDetailDrawerProps) {
  const [localDiet, setLocalDiet] = useState<DietTemplate>({ ...defaultTemplate });
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(null);
  const [isOverride, setIsOverride] = useState(false);
  const [cycleDay, setCycleDay] = useState<number | null>(null);

  // Smart prompt modal state
  const [showPrompt, setShowPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editing meal state
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  // Calculate and clone template when opening/changing dates
  useEffect(() => {
    if (!isOpen || !date) return;

    // 1. Check if there is an override for today
    const override = overrides.find((o) => o.date === date);
    if (override) {
      setLocalDiet(JSON.parse(JSON.stringify(override.custom_diet)));
      setIsOverride(true);
      setSourceTemplateId(override.custom_diet.id || null);
      setCycleDay(null);
      return;
    }

    // 2. Check if active program applies
    if (activeProgram && activeProgramDays.length > 0) {
      const start = new Date(activeProgram.start_date + 'T00:00:00');
      const current = new Date(date + 'T00:00:00');
      const diffTime = current.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let dayNum = 1;
      const len = activeProgram.microcycle_length;
      if (diffDays >= 0) {
        dayNum = (diffDays % len) + 1;
      } else {
        dayNum = (((diffDays % len) + len) % len) + 1;
      }

      setCycleDay(dayNum);

      const dayMap = activeProgramDays.find((d) => d.day_number === dayNum);
      if (dayMap) {
        const template = templates.find((t) => t.id === dayMap.template_id);
        if (template) {
          setLocalDiet(JSON.parse(JSON.stringify(template)));
          setSourceTemplateId(template.id || null);
          setIsOverride(false);
          return;
        }
      }
    }

    // 3. Check if manually assigned template exists
    const calEntry = calendar.find((c) => c.date === date);
    if (calEntry) {
      const template = templates.find((t) => t.id === calEntry.template_id);
      if (template) {
        setLocalDiet(JSON.parse(JSON.stringify(template)));
        setSourceTemplateId(template.id || null);
        setIsOverride(false);
        setCycleDay(null);
        return;
      }
    }

    // 4. Fallback to default personalized diet
    setLocalDiet({
      name: 'Dieta Personalizada',
      target_kcal: 2000,
      target_protein: 150,
      target_carbs: 200,
      target_fats: 70,
      meals: [
        { id: `m1-${Date.now()}`, name: 'Desayuno', text: '', target_kcal: 500, target_protein: 40, target_carbs: 50, target_fats: 15 },
        { id: `m2-${Date.now()}`, name: 'Almuerzo', text: '', target_kcal: 700, target_protein: 50, target_carbs: 80, target_fats: 20 },
        { id: `m3-${Date.now()}`, name: 'Cena', text: '', target_kcal: 600, target_protein: 40, target_carbs: 50, target_fats: 20 },
      ],
    });
    setSourceTemplateId(null);
    setIsOverride(false);
    setCycleDay(null);
  }, [isOpen, date, templates, calendar, overrides, activeProgram, activeProgramDays]);

  // Totals calculations
  const totals = React.useMemo(() => {
    return localDiet.meals.reduce(
      (acc, m) => {
        acc.kcal += m.target_kcal || 0;
        acc.protein += m.target_protein || 0;
        acc.carbs += m.target_carbs || 0;
        acc.fats += m.target_fats || 0;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [localDiet.meals]);

  // Drag and Drop Handlers
  const [draggedOverMealId, setDraggedOverMealId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, mealId: string) => {
    e.preventDefault();
    setDraggedOverMealId(mealId);
  };

  const handleDragLeave = () => {
    setDraggedOverMealId(null);
  };

  const handleDropRecipe = (e: React.DragEvent, mealId: string) => {
    e.preventDefault();
    setDraggedOverMealId(null);
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const recipe = JSON.parse(dataStr);

      setLocalDiet((prev) => {
        const updatedMeals = prev.meals.map((m) => {
          if (m.id === mealId) {
            return {
              ...m,
              recipe_id: recipe.id,
              text: recipe.name,
              target_kcal: recipe.total_kcal,
              target_protein: recipe.total_protein,
              target_carbs: recipe.total_carbs,
              target_fats: recipe.total_fats,
            };
          }
          return m;
        });

        return {
          ...prev,
          meals: updatedMeals,
          target_kcal: updatedMeals.reduce((acc, m) => acc + m.target_kcal, 0),
          target_protein: updatedMeals.reduce((acc, m) => acc + m.target_protein, 0),
          target_carbs: updatedMeals.reduce((acc, m) => acc + m.target_carbs, 0),
          target_fats: updatedMeals.reduce((acc, m) => acc + m.target_fats, 0),
        };
      });
      toast.success(`Receta "${recipe.name}" asignada a ${localDiet.meals.find(m => m.id === mealId)?.name}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al soltar la receta');
    }
  };

  // Add a new meal to the local list
  const handleAddMeal = () => {
    const newMeal: MealItem = {
      id: `m-new-${Date.now()}`,
      name: 'Nueva Comida',
      text: '',
      target_kcal: 0,
      target_protein: 0,
      target_carbs: 0,
      target_fats: 0,
    };
    setLocalDiet((prev) => ({
      ...prev,
      meals: [...prev.meals, newMeal],
    }));
  };

  // Remove a meal from the local list
  const handleRemoveMeal = (mealId: string) => {
    setLocalDiet((prev) => {
      const updatedMeals = prev.meals.filter((m) => m.id !== mealId);
      return {
        ...prev,
        meals: updatedMeals,
        target_kcal: updatedMeals.reduce((acc, m) => acc + m.target_kcal, 0),
        target_protein: updatedMeals.reduce((acc, m) => acc + m.target_protein, 0),
        target_carbs: updatedMeals.reduce((acc, m) => acc + m.target_carbs, 0),
        target_fats: updatedMeals.reduce((acc, m) => acc + m.target_fats, 0),
      };
    });
  };

  // Update a single meal's field
  const handleUpdateMeal = (mealId: string, fields: Partial<MealItem>) => {
    setLocalDiet((prev) => {
      const updatedMeals = prev.meals.map((m) => {
        if (m.id === mealId) {
          const updated = { ...m, ...fields };
          // If manually changed ingredients and cleared recipe, remove recipe_id
          if (fields.text && m.recipe_id && fields.text !== m.text) {
            delete updated.recipe_id;
          }
          return updated;
        }
        return m;
      });

      return {
        ...prev,
        meals: updatedMeals,
        target_kcal: updatedMeals.reduce((acc, m) => acc + m.target_kcal, 0),
        target_protein: updatedMeals.reduce((acc, m) => acc + m.target_protein, 0),
        target_carbs: updatedMeals.reduce((acc, m) => acc + m.target_carbs, 0),
        target_fats: updatedMeals.reduce((acc, m) => acc + m.target_fats, 0),
      };
    });
  };

  // Trigger save button
  const handleSaveTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (localDiet.meals.length === 0) {
      toast.error('La dieta debe tener al menos una comida.');
      return;
    }
    // Show smart prompt if there's a source template to update
    if (sourceTemplateId) {
      setShowPrompt(true);
    } else {
      // Save as override directly if it has no template base
      void executeSaveOverride();
    }
  };

  // Option A: Save ONLY for today (Override)
  const executeSaveOverride = async () => {
    setSaving(true);
    const overrideData: DailyDietOverride = {
      date,
      custom_diet: {
        ...localDiet,
        target_kcal: totals.kcal,
        target_protein: totals.protein,
        target_carbs: totals.carbs,
        target_fats: totals.fats,
      },
      total_kcal: totals.kcal,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fats: totals.fats,
    };

    const res = await saveDailyDietOverride(overrideData);
    setSaving(false);
    setShowPrompt(false);
    if (res.success) {
      toast.success('Excepción guardada para este día');
      onUpdate();
      onClose();
    } else {
      toast.error(res.error || 'Error al guardar el override');
    }
  };

  // Option B: Update the master template (updates all days using this template in the cycle)
  const executeSaveMasterTemplate = async () => {
    if (!sourceTemplateId) return;
    setSaving(true);
    const masterData: DietTemplate = {
      id: sourceTemplateId,
      name: localDiet.name,
      target_kcal: totals.kcal,
      target_protein: totals.protein,
      target_carbs: totals.carbs,
      target_fats: totals.fats,
      meals: localDiet.meals,
    };

    const res = await saveDietTemplate(masterData);
    
    // Also clear override for today since we're updating the master template
    if (isOverride) {
      await deleteDailyDietOverride(date);
    }

    setSaving(false);
    setShowPrompt(false);
    if (res.success) {
      toast.success('Plantilla maestra actualizada correctamente');
      onUpdate();
      onClose();
    } else {
      toast.error(res.error || 'Error al guardar la plantilla base');
    }
  };

  const handleClearOverride = async () => {
    if (!confirm('¿Quieres eliminar los cambios de hoy y volver al plan del ciclo?')) return;
    setSaving(true);
    const res = await deleteDailyDietOverride(date);
    setSaving(false);
    if (res.success) {
      toast.success('Restaurado el plan predeterminado');
      onUpdate();
      onClose();
    } else {
      toast.error(res.error || 'Error al eliminar la excepción');
    }
  };

  const formattedDate = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        {/* Backdrop overlay */}
        <Drawer.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] transition-opacity" />
        
        {/* Sliding Panel */}
        <Drawer.Content className="bg-white border-t border-slate-200 flex flex-col rounded-t-[2.5rem] h-[90vh] fixed bottom-0 left-0 right-0 z-[150] outline-none shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">Detalle de dieta del día</Drawer.Title>
          <Drawer.Description className="sr-only">
            Panel para revisar y editar las comidas, macros y plantilla nutricional de una fecha.
          </Drawer.Description>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 my-4 flex-shrink-0" />
          
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
            {/* Header section */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Detalle Clínico de Nutrición
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight capitalize mt-1">
                  {formattedDate}
                </h2>
                {activeProgram && cycleDay && (
                  <p className="text-[11px] text-slate-400 font-bold mt-1">
                    Ciclo: {activeProgram.name} • Día {cycleDay} de {activeProgram.microcycle_length}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {isOverride && (
                  <button
                    onClick={handleClearOverride}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl font-bold text-xs transition active:scale-95 flex items-center gap-1 min-h-[36px]"
                  >
                    Restaurar Plan
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* General Macro overview */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-150 rounded-3xl p-4 text-center">
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Calorías
                </span>
                <span className="text-base font-black text-slate-800">{totals.kcal} kcal</span>
                <span className="block text-[9px] font-semibold text-slate-400">
                  meta: {localDiet.target_kcal}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Proteínas
                </span>
                <span className="text-base font-black text-rose-500">{totals.protein}g</span>
                <span className="block text-[9px] font-semibold text-slate-400">
                  meta: {localDiet.target_protein}g
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Carbohidratos
                </span>
                <span className="text-base font-black text-sky-500">{totals.carbs}g</span>
                <span className="block text-[9px] font-semibold text-slate-400">
                  meta: {localDiet.target_carbs}g
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Grasas
                </span>
                <span className="text-base font-black text-amber-500">{totals.fats}g</span>
                <span className="block text-[9px] font-semibold text-slate-400">
                  meta: {localDiet.target_fats}g
                </span>
              </div>
            </div>

            {/* List of Meals */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Comidas Planificadas
                </h3>
                <button
                  onClick={handleAddMeal}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir Comida
                </button>
              </div>

              <div className="space-y-3">
                {localDiet.meals.map((meal) => {
                  const isEditing = editingMealId === meal.id;
                  const isOver = draggedOverMealId === meal.id;

                  return (
                    <div
                      key={meal.id}
                      onDragOver={(e) => handleDragOver(e, meal.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropRecipe(e, meal.id)}
                      className={`border rounded-3xl p-4 transition-all relative overflow-hidden bg-white
                        ${isOver ? 'ring-4 ring-emerald-300 border-emerald-300 scale-[1.01]' : 'border-slate-200'}
                        ${meal.recipe_id ? 'border-l-4 border-l-emerald-500' : ''}
                      `}
                    >
                      {/* Drop overlay info when dragging */}
                      {isOver && (
                        <div className="absolute inset-0 bg-emerald-50/90 flex items-center justify-center pointer-events-none z-10">
                          <p className="text-xs font-black text-emerald-700 flex items-center gap-2">
                            <Layers className="w-4 h-4 animate-bounce" />
                            ¡Suelta aquí para aplicar la receta!
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={meal.name}
                              onChange={(e) => handleUpdateMeal(meal.id, { name: e.target.value })}
                              className="w-full text-xs font-black text-slate-800 border-b border-slate-200 focus:border-emerald-500 outline-none pb-0.5"
                            />
                          ) : (
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                              {meal.name}
                              {meal.recipe_id && (
                                <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-100">
                                  Receta
                                </span>
                              )}
                            </h4>
                          )}

                          <div className="flex items-center gap-1.5 my-2">
                            <span className="text-[9px] font-bold text-slate-400">Receta rápida:</span>
                            <select
                              value={meal.recipe_id || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (!selectedId) {
                                  handleUpdateMeal(meal.id, { recipe_id: undefined });
                                } else {
                                  const recipe = recipes.find(r => r.id === selectedId);
                                  if (recipe) {
                                    handleUpdateMeal(meal.id, {
                                      recipe_id: recipe.id,
                                      text: recipe.name,
                                      target_kcal: recipe.total_kcal,
                                      target_protein: recipe.total_protein,
                                      target_carbs: recipe.total_carbs,
                                      target_fats: recipe.total_fats,
                                    });
                                    toast.success(`Receta "${recipe.name}" aplicada`);
                                  }
                                }
                              }}
                              className="text-[9px] bg-slate-50 border border-slate-200 rounded-lg py-0.5 px-1.5 text-slate-650 font-bold focus:ring-1 focus:ring-emerald-500 outline-none max-w-[150px]"
                            >
                              <option value="">-- Ninguna --</option>
                              {recipes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </div>

                          {isEditing ? (
                            <textarea
                              value={meal.text}
                              onChange={(e) => handleUpdateMeal(meal.id, { text: e.target.value })}
                              placeholder="Ingredientes o descripción..."
                              className="w-full text-xs text-slate-600 border border-slate-200 rounded-xl p-2 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[60px]"
                            />
                          ) : (
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                              {meal.text || 'Sin descripción.'}
                            </p>
                          )}

                          {/* Quick macro values inside meal */}
                          {isEditing ? (
                            <div className="grid grid-cols-4 gap-2 pt-2">
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase">
                                  kcal
                                </label>
                                <input
                                  type="number"
                                  value={meal.target_kcal}
                                  onChange={(e) =>
                                    handleUpdateMeal(meal.id, { target_kcal: Number(e.target.value) })
                                  }
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase">
                                  Prot (g)
                                </label>
                                <input
                                  type="number"
                                  value={meal.target_protein}
                                  onChange={(e) =>
                                    handleUpdateMeal(meal.id, { target_protein: Number(e.target.value) })
                                  }
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase">
                                  Carbs (g)
                                </label>
                                <input
                                  type="number"
                                  value={meal.target_carbs}
                                  onChange={(e) =>
                                    handleUpdateMeal(meal.id, { target_carbs: Number(e.target.value) })
                                  }
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-bold text-slate-400 uppercase">
                                  Grasa (g)
                                </label>
                                <input
                                  type="number"
                                  value={meal.target_fats}
                                  onChange={(e) =>
                                    handleUpdateMeal(meal.id, { target_fats: Number(e.target.value) })
                                  }
                                  className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-center"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 pt-1 text-[9px] font-bold text-slate-400">
                              <span>{meal.target_kcal} kcal</span>
                              <span>•</span>
                              <span>P: {meal.target_protein}g</span>
                              <span>•</span>
                              <span>C: {meal.target_carbs}g</span>
                              <span>•</span>
                              <span>G: {meal.target_fats}g</span>
                            </div>
                          )}
                        </div>

                        {/* Edit actions */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingMealId(isEditing ? null : meal.id)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition min-h-[32px]
                              ${
                                isEditing
                                  ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }
                            `}
                          >
                            {isEditing ? 'Listo' : 'Editar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeal(meal.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-h-[32px] flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Save Button */}
            <form onSubmit={handleSaveTrigger} className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl active:scale-95 transition-all min-h-[48px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black rounded-2xl active:scale-95 transition-all shadow-md min-h-[48px] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Guardar Cambios
              </button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>

      {/* Dual choice Save Prompt (Apple HIG Dialog overlay) */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrompt(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-2xl w-full max-w-sm flex flex-col z-10 text-center"
            >
              <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                ¿Cómo quieres aplicar los cambios?
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1 mb-6 leading-relaxed">
                Has modificado un día basado en una plantilla del ciclo. Puedes aplicar una excepción solo para hoy o actualizar el plan general del ciclo.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={executeSaveOverride}
                  className="w-full py-3 bg-slate-900 text-white font-black text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {saving ? 'Guardando...' : 'Aplicar cambio solo a hoy'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={executeSaveMasterTemplate}
                  className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {saving ? 'Guardando...' : 'Actualizar plantilla general del ciclo'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Drawer.Root>
  );
}
