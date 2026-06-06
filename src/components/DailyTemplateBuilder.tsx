'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDietTemplates, saveDietTemplate, getRecipes, deleteDietTemplate } from '@/app/nutrition/actions';
import { type DietTemplate, type Recipe, type MealItem } from '@/lib/schema';
import toast from '@/lib/toast';
import { Plus, Trash2, Save, ChevronRight, BookOpen, Utensils, Award } from 'lucide-react';
import { triggerVibration } from '@/lib/haptics';

export default function DailyTemplateBuilder() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DietTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // Load templates and recipes
  const loadAll = async () => {
    setLoading(true);
    try {
      const fetchedTemplates = await getDietTemplates();
      setTemplates(fetchedTemplates);
      const fetchedRecipes = await getRecipes();
      setRecipes(fetchedRecipes);
      
      if (fetchedTemplates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(fetchedTemplates[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos del constructor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateNew = () => {
    triggerVibration('light');
    const newTemp: DietTemplate = {
      name: 'Nueva Plantilla Diaria',
      target_kcal: 2000,
      target_protein: 150,
      target_carbs: 200,
      target_fats: 66,
      meals: [
        { id: `m1-${Date.now()}`, name: 'Desayuno', text: '', target_kcal: 500, target_protein: 40, target_carbs: 50, target_fats: 15 },
        { id: `m2-${Date.now()}`, name: 'Almuerzo', text: '', target_kcal: 700, target_protein: 50, target_carbs: 80, target_fats: 20 },
        { id: `m3-${Date.now()}`, name: 'Cena', text: '', target_kcal: 600, target_protein: 40, target_carbs: 50, target_fats: 20 },
      ]
    };
    setSelectedTemplate(newTemp);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('¿Seguro que deseas eliminar esta plantilla?')) return;
    triggerVibration('light');
    const res = await deleteDietTemplate(id);
    if (res.success) {
      toast.success('Plantilla eliminada');
      setSelectedTemplate(null);
      loadAll();
    } else {
      toast.error(res.error || 'No se pudo eliminar la plantilla');
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    triggerVibration('light');
    
    // Auto-recalculate parent targets from sum of meals
    const totalKcal = selectedTemplate.meals.reduce((sum, m) => sum + (m.target_kcal || 0), 0);
    const totalProtein = selectedTemplate.meals.reduce((sum, m) => sum + (m.target_protein || 0), 0);
    const totalCarbs = selectedTemplate.meals.reduce((sum, m) => sum + (m.target_carbs || 0), 0);
    const totalFats = selectedTemplate.meals.reduce((sum, m) => sum + (m.target_fats || 0), 0);

    const templateToSave = {
      ...selectedTemplate,
      target_kcal: totalKcal || selectedTemplate.target_kcal,
      target_protein: totalProtein || selectedTemplate.target_protein,
      target_carbs: totalCarbs || selectedTemplate.target_carbs,
      target_fats: totalFats || selectedTemplate.target_fats,
    };

    const res = await saveDietTemplate(templateToSave);
    if (res.success && res.data) {
      toast.success('Plantilla guardada correctamente');
      loadAll();
      setSelectedTemplate(res.data);
    } else {
      toast.error(res.error || 'Fallo al guardar la plantilla');
    }
  };

  const addMealSlot = () => {
    if (!selectedTemplate) return;
    triggerVibration('light');
    const updatedMeals = [
      ...selectedTemplate.meals,
      {
        id: `m-${Date.now()}`,
        name: 'Comida Extra',
        text: '',
        target_kcal: 300,
        target_protein: 20,
        target_carbs: 30,
        target_fats: 10
      }
    ];
    setSelectedTemplate({ ...selectedTemplate, meals: updatedMeals });
  };

  const removeMealSlot = (mealId: string) => {
    if (!selectedTemplate) return;
    triggerVibration('light');
    const updatedMeals = selectedTemplate.meals.filter((m) => m.id !== mealId);
    setSelectedTemplate({ ...selectedTemplate, meals: updatedMeals });
  };

  const updateMealField = (mealId: string, field: keyof MealItem, value: any) => {
    if (!selectedTemplate) return;
    const updatedMeals = selectedTemplate.meals.map((m) => {
      if (m.id === mealId) {
        return { ...m, [field]: value };
      }
      return m;
    });
    setSelectedTemplate({ ...selectedTemplate, meals: updatedMeals });
  };

  // Helper to assign a recipe to a meal slot
  const assignRecipeToMeal = (recipe: Recipe, mealId: string) => {
    triggerVibration('light');
    if (!selectedTemplate) return;
    const updatedMeals = selectedTemplate.meals.map((m) => {
      if (m.id === mealId) {
        return {
          ...m,
          text: recipe.name,
          target_kcal: Math.round(recipe.total_kcal || 0),
          target_protein: Math.round(recipe.total_protein || 0),
          target_carbs: Math.round(recipe.total_carbs || 0),
          target_fats: Math.round(recipe.total_fats || 0),
          recipe_id: recipe.id,
        };
      }
      return m;
    });
    setSelectedTemplate({ ...selectedTemplate, meals: updatedMeals });
    toast.success(`Receta "${recipe.name}" asignada a la comida.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch select-none">
      
      {/* Columna Izquierda: Lista de Plantillas Diarias */}
      <div className="lg:col-span-3 flex flex-col gap-4 bg-white border border-slate-200 p-4 rounded-3xl h-fit">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Plantillas</h3>
          <button
            type="button"
            onClick={handleCreateNew}
            className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm transition hover:scale-105 active:scale-95"
          >
            +
          </button>
        </div>

        <div className="space-y-2 max-h-60 lg:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {templates.map((temp) => (
            <button
              key={temp.id}
              onClick={() => setSelectedTemplate(temp)}
              className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                selectedTemplate?.id === temp.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs font-black truncate max-w-[130px]">{temp.name}</span>
              <span className={`text-[10px] font-bold ${selectedTemplate?.id === temp.id ? 'text-slate-300' : 'text-slate-400'}`}>
                {temp.target_kcal} kcal
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Central: Esqueleto del Día */}
      <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-5">
        {selectedTemplate ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <input
                type="text"
                value={selectedTemplate.name}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                className="text-lg font-black text-slate-800 outline-none border-b border-transparent focus:border-slate-300 bg-transparent flex-1 mr-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition active:scale-95 shadow-sm min-h-[40px]"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
                {selectedTemplate.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="p-2.5 border border-red-200 text-red-500 rounded-full hover:bg-red-50 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Meal Slots (Esqueleto del día) */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedTemplate.meals.map((meal) => (
                <div key={meal.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => updateMealField(meal.id, 'name', e.target.value)}
                      className="font-black text-slate-800 text-xs tracking-wider uppercase bg-transparent outline-none max-w-[120px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeMealSlot(meal.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-bold"
                    >
                      Remover
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Descripción de comida o receta asignada..."
                    value={meal.text}
                    onChange={(e) => updateMealField(meal.id, 'text', e.target.value)}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-slate-400 min-h-[38px]"
                  />

                  {/* Target Macros inputs */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400">kcal</label>
                      <input
                        type="number"
                        value={meal.target_kcal}
                        onChange={(e) => updateMealField(meal.id, 'target_kcal', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400">P (g)</label>
                      <input
                        type="number"
                        value={meal.target_protein}
                        onChange={(e) => updateMealField(meal.id, 'target_protein', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400">C (g)</label>
                      <input
                        type="number"
                        value={meal.target_carbs}
                        onChange={(e) => updateMealField(meal.id, 'target_carbs', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400">G (g)</label>
                      <input
                        type="number"
                        value={meal.target_fats}
                        onChange={(e) => updateMealField(meal.id, 'target_fats', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMealSlot}
                className="w-full py-4 border border-dashed border-slate-300 hover:border-slate-400 text-slate-400 hover:text-slate-600 rounded-2xl flex items-center justify-center font-bold text-xs gap-1 transition-all active:scale-[0.99]"
              >
                <Plus size={16} /> Agregar comida
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Utensils className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-bold">Selecciona o crea una plantilla para empezar</p>
          </div>
        )}
      </div>

      {/* Columna Derecha: Recetario (Asignador rápido) */}
      <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col gap-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
          <BookOpen className="w-4 h-4 text-emerald-500" /> Recetas Disponibles
        </h3>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {recipes.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 text-center py-10">
              No tienes recetas creadas todavía.
            </p>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="p-3.5 border border-slate-150 rounded-2xl bg-slate-50 hover:bg-slate-100/60 transition flex flex-col gap-2.5"
              >
                <div>
                  <h4 className="text-xs font-black text-slate-800">{recipe.name}</h4>
                  <div className="flex gap-2 mt-1 text-[9px] font-bold text-slate-400">
                    <span>🔥 {Math.round(recipe.total_kcal)} kcal</span>
                    <span>P: {Math.round(recipe.total_protein)}g</span>
                    <span>C: {Math.round(recipe.total_carbs)}g</span>
                    <span>G: {Math.round(recipe.total_fats)}g</span>
                  </div>
                </div>

                {selectedTemplate && selectedTemplate.meals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-200/50 pt-2">
                    <span className="text-[8px] font-extrabold uppercase text-slate-450 self-center mr-1">Asignar:</span>
                    {selectedTemplate.meals.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => assignRecipeToMeal(recipe, m.id)}
                        className="bg-white hover:bg-slate-100 text-slate-650 hover:text-slate-850 px-2 py-1 border border-slate-200 rounded-lg text-[9px] font-black tracking-tight transition"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
