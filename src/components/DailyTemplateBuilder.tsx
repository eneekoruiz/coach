'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getDietTemplates, saveDietTemplate, getRecipes, deleteDietTemplate, generateFullDayTemplateWithAi } from '@/app/nutrition/actions';
import { type DietTemplate, type Recipe, type MealItem } from '@/lib/schema';
import toast from '@/lib/toast';
import { BookOpen, ChevronDown, ChevronRight, Copy, Loader2, Plus, Save, Search, Sparkles, Sun, Trash2, Utensils, X } from 'lucide-react';
import { triggerVibration } from '@/lib/haptics';
import BottomSheet from '@/components/BottomSheet';
import RecipeDrawer from '@/components/RecipeDrawer';

export default function DailyTemplateBuilder() {
  const [templates, setTemplates] = useState<DietTemplate[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DietTemplate | null>(null);
  const [expandedTemplateGroups, setExpandedTemplateGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [aiDayPrompt, setAiDayPrompt] = useState('');
  const [aiDayBusy, setAiDayBusy] = useState(false);
  const [aiDaySheetOpen, setAiDaySheetOpen] = useState(false);

  // Bottom Sheet state for recipe picker
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');

  // Recipe Drawer state for deep linking
  const [recipeDrawerOpen, setRecipeDrawerOpen] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

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
      parent_template_id: null,
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

  const handleCreateVariation = async () => {
    if (!selectedTemplate?.id) {
      toast.error('Guarda el Día Base antes de crear una variación.');
      return;
    }

    triggerVibration('light');
    const rootParentId = selectedTemplate.parent_template_id ?? selectedTemplate.id;
    const now = Date.now();
    const variation: DietTemplate = {
      ...selectedTemplate,
      id: undefined,
      parent_template_id: rootParentId,
      name: `${selectedTemplate.name} - Copia`,
      meals: selectedTemplate.meals.map((meal, index) => ({
        ...meal,
        id: `${meal.id}-v${now}-${index}`,
      })),
    };

    const res = await saveDietTemplate(variation);
    if (res.success && res.data) {
      toast.success('Variación creada. Renómbrala y ajusta solo lo necesario.');
      setSelectedTemplate(res.data);
      setExpandedTemplateGroups((current) => ({ ...current, [rootParentId]: true }));
      await loadAll();
    } else {
      toast.error(res.error || 'No se pudo crear la variación');
    }
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

  const handleGenerateDayWithAi = async () => {
    const prompt = aiDayPrompt.trim();
    if (!prompt) {
      toast.error('Describe el tipo de día que quieres generar.');
      return;
    }

    setAiDayBusy(true);
    try {
      const result = await generateFullDayTemplateWithAi(prompt);
      if (!result.success || !result.data) {
        toast.error(`Error al conectar con la IA: ${result.error || 'No se pudo generar el Día Base.'}`);
        return;
      }

      setSelectedTemplate({
        ...result.data,
        id: undefined,
        parent_template_id: null,
      });
      setAiDaySheetOpen(false);
      toast.success('¡Día Base generado!');
    } catch (error) {
      toast.error(`Error al conectar con la IA: ${error instanceof Error ? error.message : 'Error inesperado'}`);
    } finally {
      setAiDayBusy(false);
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

  // ── Interactive Recipe Assignment (Pillar 2) ─────────────────────────────

  const openRecipePicker = (mealId: string) => {
    triggerVibration('light');
    setActiveMealId(mealId);
    setRecipeSearch('');
    setRecipePickerOpen(true);
  };

  const assignRecipeToMeal = (recipe: Recipe) => {
    triggerVibration('light');
    if (!selectedTemplate || !activeMealId) return;
    applyRecipeToMeal(recipe, activeMealId);
    setRecipePickerOpen(false);
    setActiveMealId(null);
  };

  const applyRecipeToMeal = (recipe: Recipe, mealId: string) => {
    if (!selectedTemplate) return;

    const meal = selectedTemplate.meals.find(m => m.id === mealId);
    if (!meal) return;

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
    toast.success(`"${recipe.name}" → ${meal.name}`);
  };

  const handleRecipeDrop = (event: React.DragEvent, mealId: string) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/json');
    if (!payload) return;

    try {
      const recipe = JSON.parse(payload) as Recipe;
      if (recipe?.name) {
        applyRecipeToMeal(recipe, mealId);
      }
    } catch (error) {
      console.error('Invalid recipe drop payload:', error);
    }
  };

  const clearRecipeFromMeal = (mealId: string) => {
    triggerVibration('light');
    if (!selectedTemplate) return;

    const updatedMeals = selectedTemplate.meals.map((m) => {
      if (m.id === mealId) {
        const { recipe_id, ...rest } = m;
        return {
          ...rest,
          text: '',
          target_kcal: 0,
          target_protein: 0,
          target_carbs: 0,
          target_fats: 0,
        };
      }
      return m;
    });

    setSelectedTemplate({ ...selectedTemplate, meals: updatedMeals });
  };

  const openRecipeDrawer = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      setViewingRecipe(recipe);
      setRecipeDrawerOpen(true);
    }
  };

  // Filter recipes for the picker
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const templateGroups = useMemo(() => {
    const templatesById = new Map(templates.map((template) => [template.id, template]));
    const roots = templates.filter(
      (template) => !template.parent_template_id || !templatesById.has(template.parent_template_id)
    );

    return roots.map((root) => ({
      root,
      variations: templates.filter((template) => template.parent_template_id === root.id),
    }));
  }, [templates]);

  const selectedParent = selectedTemplate?.parent_template_id
    ? templates.find((template) => template.id === selectedTemplate.parent_template_id)
    : null;

  return (
    <div className="grid h-[72dvh] min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-[280px_1fr] md:overflow-hidden md:pr-0 select-none">

      {/* Columna Izquierda: Lista de Plantillas Diarias */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit md:h-full md:overflow-y-auto custom-scrollbar shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Librería
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
              <Sun className="h-4 w-4 text-amber-500" />
              Días Base
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
            title="Nuevo Día Base"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAiDaySheetOpen(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-emerald-500 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Generar Día Completo con IA
        </button>

        <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {templateGroups.map(({ root, variations }) => {
            const rootId = root.id || root.name;
            const isExpanded = expandedTemplateGroups[rootId] ?? true;
            const rootSelected = selectedTemplate?.id === root.id;

            return (
              <div key={rootId} className="space-y-1.5">
                <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTemplateGroups((current) => ({ ...current, [rootId]: !isExpanded }))
                    }
                    className="flex h-full min-h-[52px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-white"
                    title={isExpanded ? 'Contraer variaciones' : 'Expandir variaciones'}
                  >
                    {variations.length > 0 ? (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                      <Sun className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(root)}
                    className={`min-w-0 rounded-xl border p-3 text-left transition ${
                      rootSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-black">{root.name}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                        rootSelected ? 'bg-white text-slate-900' : 'bg-white text-slate-500 border border-slate-200'
                      }`}>
                        DÍA
                      </span>
                    </div>
                    <p className={`mt-1 text-[10px] font-bold ${rootSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {root.target_kcal} kcal · {root.meals.length} comidas · {variations.length} variaciones
                    </p>
                  </button>
                </div>

                {isExpanded && variations.length > 0 && (
                  <div className="ml-8 space-y-1.5 border-l border-slate-200 pl-2">
                    {variations.map((variation, index) => {
                      const isSelected = selectedTemplate?.id === variation.id;
                      return (
                        <button
                          key={variation.id}
                          type="button"
                          onClick={() => setSelectedTemplate(variation)}
                          className={`w-full min-w-0 rounded-xl border p-3 text-left transition ${
                            isSelected
                              ? 'border-amber-400 bg-amber-50 text-slate-900 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-black">{variation.name}</span>
                            <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700">
                              V{index + 2}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">
                            Modificado · {variation.target_kcal} kcal
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Central: Esqueleto del Día */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-5 flex-1 min-h-0 md:h-full md:overflow-y-auto custom-scrollbar">
        {selectedTemplate ? (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Día Base
                  </span>
                  {selectedTemplate.parent_template_id && (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700">
                      V2 · Modificado
                    </span>
                  )}
                  {selectedParent && (
                    <span className="truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-500">
                      Hereda de {selectedParent.name}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  className="w-full bg-transparent text-xl font-black text-slate-900 outline-none border-b border-transparent focus:border-slate-300"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCreateVariation}
                  disabled={!selectedTemplate.id}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-800 transition hover:bg-amber-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  Crear Variación
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm min-h-[40px]"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
                {selectedTemplate.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="p-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Meal Slots (Esqueleto del día) */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {selectedTemplate.meals.map((meal) => {
                const assignedRecipe = meal.recipe_id
                  ? recipes.find(r => r.id === meal.recipe_id)
                  : null;

                return (
                  <div
                    key={meal.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleRecipeDrop(event, meal.id)}
                    className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col gap-3 transition hover:border-emerald-200"
                  >
                    {/* Meal Header with [+ Añadir] button */}
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

                    {/* Interactive Recipe Assignment Area */}
                    {assignedRecipe ? (
                      <div className="flex items-center gap-3">
                        {/* Clickable recipe chip */}
                        <button
                          type="button"
                          onClick={() => openRecipeDrawer(assignedRecipe.id!)}
                          className="flex-1 text-left bg-white border border-emerald-200 hover:border-emerald-300 px-4 py-3 rounded-2xl transition group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-black text-slate-800 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                {assignedRecipe.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                🔥 {Math.round(assignedRecipe.total_kcal)} kcal • P:{Math.round(assignedRecipe.total_protein)}g • C:{Math.round(assignedRecipe.total_carbs)}g • G:{Math.round(assignedRecipe.total_fats)}g
                              </p>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 group-hover:bg-emerald-100 transition">
                              Ver Receta →
                            </span>
                          </div>
                        </button>
                        {/* Clear button */}
                        <button
                          type="button"
                          onClick={() => clearRecipeFromMeal(meal.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openRecipePicker(meal.id)}
                        className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-emerald-300 text-slate-400 hover:text-emerald-600 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-[0.99] bg-white/50"
                      >
                        <Plus size={16} /> Añadir receta a {meal.name}
                      </button>
                    )}

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
                );
              })}

              <button
                type="button"
                onClick={addMealSlot}
                className="w-full py-4 border border-dashed border-slate-300 hover:border-slate-400 text-slate-400 hover:text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs gap-1 transition-all active:scale-[0.99]"
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Bottom Sheet: Recipe Picker (Pillar 2)                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <BottomSheet
        isOpen={recipePickerOpen}
        onClose={() => { setRecipePickerOpen(false); setActiveMealId(null); }}
        title="Seleccionar Receta"
      >
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Buscar receta por nombre..."
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
            autoFocus
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Recipe List */}
        <div className="space-y-3">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">
                {recipes.length === 0
                  ? 'No tienes recetas creadas. Ve al Recetario para crear una.'
                  : 'No se encontraron recetas con ese nombre.'}
              </p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => assignRecipeToMeal(recipe)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/json', JSON.stringify(recipe));
                  event.dataTransfer.effectAllowed = 'copy';
                }}
                className="w-full text-left p-4 border border-slate-150 rounded-2xl bg-white hover:bg-emerald-50 hover:border-emerald-200 transition flex flex-col gap-2 group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-700 transition">
                    {recipe.name}
                  </h4>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 group-hover:bg-emerald-100 transition">
                    Asignar →
                  </span>
                </div>
                <div className="flex gap-2 text-[9px] font-bold text-slate-400">
                  <span>🔥 {Math.round(recipe.total_kcal)} kcal</span>
                  <span>P: {Math.round(recipe.total_protein)}g</span>
                  <span>C: {Math.round(recipe.total_carbs)}g</span>
                  <span>G: {Math.round(recipe.total_fats)}g</span>
                </div>
                {recipe.instructions && recipe.instructions.trim().length > 0 && (
                  <p className="text-[10px] text-slate-400 font-semibold line-clamp-2">
                    {recipe.instructions.substring(0, 100)}...
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Recipe Drawer: Deep Linking (Pillar 2)                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <RecipeDrawer
        isOpen={recipeDrawerOpen}
        onClose={() => { setRecipeDrawerOpen(false); setViewingRecipe(null); }}
        recipe={viewingRecipe}
      />

      <BottomSheet
        isOpen={aiDaySheetOpen}
        onClose={() => setAiDaySheetOpen(false)}
        title="Generar Día Completo con IA"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
              AI Auto-Pilot
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Describe el objetivo y la IA devolverá desayuno, comida, merienda opcional y cena con macros.
            </p>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              ¿Qué tipo de día quieres?
            </span>
            <textarea
              value={aiDayPrompt}
              onChange={(event) => setAiDayPrompt(event.target.value)}
              rows={3}
              placeholder="Ej. Alto en proteínas, sin lactosa, 2500 kcal, fácil de cocinar"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
            />
          </label>
          <button
            type="button"
            onClick={handleGenerateDayWithAi}
            disabled={aiDayBusy}
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition-all duration-200 ease-in-out hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiDayBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiDayBusy ? 'Pensando...' : 'Generar plantilla'}
          </button>
        </div>
      </BottomSheet>

    </div>
  );
}
