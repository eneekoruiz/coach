'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { type IngredientItem, type Recipe } from '@/lib/schema';
import { autocompleteRecipeWithAi, deleteRecipe, getRecipes, saveRecipe } from '@/app/nutrition/actions';
import toast from '@/lib/toast';
import {
  Calculator,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Search,
  Soup,
  Trash2,
  Utensils,
  WandSparkles,
} from 'lucide-react';
import ScreenGuideButton from './ScreenGuideButton';
import { deriveRecipeTags } from '@/lib/recipe-tags';
import { parseRecipeTextFallback } from '@/lib/recipe-fallback';

type IngredientDraft = {
  name: string;
  amount: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
};

const emptyIngredient: IngredientDraft = {
  name: '',
  amount: 100,
  unit: 'g',
  kcal: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
};

export default function RecipeLibrary() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('Todas');
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState(emptyIngredient);
  const [showAdvancedMacros, setShowAdvancedMacros] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await getRecipes();
    setRecipes(data);
    setLoading(false);

    if (!editingRecipe && data.length > 0) {
      openRecipe(data[0]);
    }
  };

  useEffect(() => {
    void loadRecipes();
  }, []);

  const totals = useMemo(
    () =>
      ingredients.reduce(
        (acc, ingredient) => ({
          kcal: acc.kcal + ingredient.kcal,
          protein: acc.protein + ingredient.protein,
          carbs: acc.carbs + ingredient.carbs,
          fats: acc.fats + ingredient.fats,
        }),
        { kcal: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [ingredients]
  );

  const recipesWithTags = useMemo(
    () =>
      recipes.map((recipe) => ({
        recipe,
        tags: deriveRecipeTags(recipe),
      })),
    [recipes]
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>(['Todas']);
    recipesWithTags.forEach(({ tags: recipeTags }) => {
      recipeTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [recipesWithTags]);

  const filteredRecipes = recipesWithTags.filter(({ recipe, tags }) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === 'Todas' || tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const openRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    setInstructions(recipe.instructions || '');
    setIngredients(recipe.ingredients_json || []);
    setIngredientDraft(emptyIngredient);
  };

  const startNewRecipe = () => {
    setEditingRecipe(null);
    setRecipeName('Nueva Receta Clínica');
    setInstructions('');
    setIngredients([]);
    setIngredientDraft(emptyIngredient);
  };

  const updateIngredientDraft = <K extends keyof IngredientDraft>(field: K, value: IngredientDraft[K]) => {
    setIngredientDraft((current) => ({ ...current, [field]: value }));
  };

  const addIngredient = () => {
    if (!ingredientDraft.name.trim()) {
      toast.error('Introduce el nombre del ingrediente.');
      return;
    }

    setIngredients((current) => [
      ...current,
      {
        name: ingredientDraft.name.trim(),
        amount: Number(ingredientDraft.amount),
        unit: ingredientDraft.unit,
        kcal: Math.round(Number(ingredientDraft.kcal)),
        protein: Math.round(Number(ingredientDraft.protein)),
        carbs: Math.round(Number(ingredientDraft.carbs)),
        fats: Math.round(Number(ingredientDraft.fats)),
      },
    ]);
    setIngredientDraft(emptyIngredient);
  };

  const handleAiFill = async () => {
    const prompt = aiPrompt.trim() || recipeName.trim();
    if (!prompt) {
      toast.error('Escribe una receta o ingredientes para rellenar con IA.');
      return;
    }

    setAiBusy(true);
    try {
      const result = await autocompleteRecipeWithAi(prompt);
      if (!result.success || !result.data) {
        const fallbackRecipe = parseRecipeTextFallback(prompt);
        if (fallbackRecipe) {
          setRecipeName(fallbackRecipe.name);
          setIngredients(fallbackRecipe.ingredients_json);
          setInstructions(fallbackRecipe.instructions || '');
          toast.success('La IA estaba descansando; he rellenado una versión rápida editable.');
          return;
        }
        toast.error(`Error al conectar con la IA: ${result.error || 'No se pudo rellenar la receta.'}`);
        return;
      }

      setRecipeName(result.data.name);
      setIngredients(result.data.ingredients_json);
      setInstructions(result.data.instructions || '');
      toast.success('¡Receta generada!');
    } catch (error) {
      toast.error(`Error al conectar con la IA: ${error instanceof Error ? error.message : 'Error inesperado'}`);
    } finally {
      setAiBusy(false);
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveRecipe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipeName.trim()) {
      toast.error('Introduce el nombre de la receta.');
      return;
    }

    const recipeData: Recipe = {
      id: editingRecipe?.id,
      name: recipeName.trim(),
      ingredients_json: ingredients,
      instructions,
      total_kcal: totals.kcal,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fats: totals.fats,
    };

    try {
      const result = await saveRecipe(recipeData);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Error al guardar la receta');
        return;
      }

      toast.success(editingRecipe ? 'Receta actualizada' : 'Receta creada');
      setEditingRecipe(result.data);
      await loadRecipes();
    } catch (error) {
      toast.error(`Error al guardar la receta: ${error instanceof Error ? error.message : 'Error inesperado'}`);
    }
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return;
    if (!confirm('¿Seguro que quieres eliminar esta receta de tu biblioteca?')) return;

    try {
      const result = await deleteRecipe(recipe.id);
      if (!result.success) {
        toast.error(result.error || 'Error al eliminar');
        return;
      }

      toast.success('Receta eliminada');
      setEditingRecipe(null);
      setRecipeName('');
      setInstructions('');
      setIngredients([]);
      await loadRecipes();
    } catch (error) {
      toast.error(`Error al eliminar la receta: ${error instanceof Error ? error.message : 'Error inesperado'}`);
    }
  };

  const handleDragStart = (event: React.DragEvent, recipe: Recipe) => {
    event.dataTransfer.setData('application/json', JSON.stringify(recipe));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="grid h-[72dvh] min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-[280px_1fr] md:overflow-hidden md:pr-0">
      {/* Columna Izquierda: Listado de recetas y busqueda */}
      <aside className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm h-fit md:h-full">
        <div className="flex items-center gap-2">
          <Soup className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Librería
            </p>
            <h3 className="text-sm font-black text-slate-900">
              Recetario
            </h3>
          </div>
        </div>

        {/* Prominent Action Button */}
        <button
          type="button"
          onClick={startNewRecipe}
          className="mt-3 flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nueva Receta
        </button>

        <div className="relative mt-3 shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar receta"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
          {availableTags.map((tag) => {
            const active = tag === activeTag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black transition-all duration-200 ease-in-out ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-hide md:max-h-none max-h-48">
          {loading ? (
            <div className="space-y-2">
              <div className="h-20 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
              <div className="h-20 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
              <Utensils className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-500">Sin recetas todavía</p>
            </div>
          ) : (
            filteredRecipes.map(({ recipe, tags }) => {
              const isSelected = editingRecipe?.id === recipe.id;

              return (
                <button
                  key={recipe.id}
                  type="button"
                  draggable
                  onClick={() => openRecipe(recipe)}
                  onDragStart={(event) => handleDragStart(event, recipe)}
                  className={`group w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? 'text-slate-400' : 'text-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-black">{recipe.name}</p>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                            isSelected ? 'bg-white text-slate-900' : 'bg-white text-emerald-700 border border-emerald-100'
                          }`}
                        >
                          RECETA
                        </span>
                      </div>
                      <p className={`mt-1 text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {recipe.total_kcal} kcal · P {recipe.total_protein}g · C {recipe.total_carbs}g · G {recipe.total_fats}g
                      </p>
                      {tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                isSelected ? 'bg-white/15 text-slate-100' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Columna Derecha: Formulario Lienzo de Trabajo */}
      <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm custom-scrollbar md:max-h-full">
        <form onSubmit={handleSaveRecipe} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Lienzo de Trabajo
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  ¿Qué vas a cocinar? Deja que la IA lo desglose o complétalo a mano ingrediente por ingrediente.
                </p>
              </div>
              <ScreenGuideButton
                title="Recetario"
                description="Esta vista convierte cada plato en una receta reutilizable con ingredientes, macros e instrucciones."
                goal="Te ayuda a que las kcal totales nazcan de los ingredientes y no de campos sueltos."
                bullets={[
                  'Empieza por el nombre o una frase corta para la IA.',
                  'El total de la receta se actualiza con cada ingrediente.',
                  'Más abajo tienes la lista viva y el panel de añadido manual.',
                ]}
                compact
              />
            </div>

            {/* Responsive grid for Name and AI Autocomplete */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">
              <div className="flex flex-col justify-between gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Nombre de la receta
                  </label>
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(event) => setRecipeName(event.target.value)}
                    placeholder="Ej. Bowl de arroz con pollo y verduras"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
                  />
                </div>
                
                <div className="flex gap-2">
                  {editingRecipe?.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(editingRecipe)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 active:scale-95 shrink-0"
                      title="Eliminar receta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
                  >
                    <Save className="h-4 w-4" />
                    Guardar Receta
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <WandSparkles className="h-4 w-4 text-cyan-600" />
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">
                      Rellenar con IA
                    </p>
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={2}
                    placeholder="150g pechuga de pollo, 60g arroz, verduras..."
                    className="mt-1.5 w-full rounded-lg border border-cyan-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAiFill}
                  disabled={aiBusy}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 text-xs font-black text-white transition hover:bg-cyan-500 active:scale-95 disabled:opacity-60"
                >
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                  {aiBusy ? 'Pensando...' : 'Desglosar receta'}
                </button>
              </div>
            </div>

            {/* Total de la receta summary */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total de la receta
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  ['Kcal', totals.kcal, 'bg-slate-950 text-white'],
                  ['Proteínas', `${totals.protein}g`, 'bg-rose-50 text-rose-600'],
                  ['Carbos', `${totals.carbs}g`, 'bg-sky-50 text-sky-700'],
                  ['Grasas', `${totals.fats}g`, 'bg-amber-50 text-amber-700'],
                ].map(([label, value, className]) => (
                  <div key={label} className={`rounded-xl px-3 py-2.5 ${className}`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
                    <p className="mt-1 text-lg font-black tracking-tight">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Preparación
              </label>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                placeholder="Pasos, timing, textura, sustituciones clínicas..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Lógica de cálculo
                </p>
              </div>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
                El resumen superior sale de la suma de ingredientes. Si vas rápido, añade solo nombre y cantidad; deja los macros manuales para cuando hagan falta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-800">
                  Ingredientes
                </h4>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                  {ingredients.length} items
                </span>
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {ingredients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <WandSparkles className="mx-auto h-7 w-7 text-cyan-400" />
                    <p className="mt-1.5 text-xs font-black text-slate-700">
                      Recetario mágico listo
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      Empieza con IA o añade ingredientes manuales.
                    </p>
                  </div>
                ) : (
                  ingredients.map((ingredient, index) => (
                    <div
                      key={`${ingredient.name}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-800">
                          {ingredient.name}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold text-slate-400">
                          {ingredient.amount}{ingredient.unit} · {ingredient.kcal} kcal · P {ingredient.protein}g · C {ingredient.carbs}g · G {ingredient.fats}g
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                        title="Eliminar ingrediente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Añadir ingrediente manual
                </p>
              </div>
              <div className="mt-2.5 space-y-2">
                <input
                  type="text"
                  value={ingredientDraft.name}
                  onChange={(event) => updateIngredientDraft('name', event.target.value)}
                  placeholder="Nombre de ingrediente"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={ingredientDraft.amount}
                    onChange={(event) => updateIngredientDraft('amount', Number(event.target.value))}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={ingredientDraft.unit}
                    onChange={(event) => updateIngredientDraft('unit', event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                  />
                </div>
                <label className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600">
                  Macros avanzados
                  <input
                    type="checkbox"
                    checked={showAdvancedMacros}
                    onChange={(event) => setShowAdvancedMacros(event.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
                {showAdvancedMacros && (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ['kcal', 'kcal'],
                      ['P', 'protein'],
                      ['C', 'carbs'],
                      ['G', 'fats'],
                    ].map(([label, field]) => (
                      <label key={field} className="block">
                        <span className="mb-1 block text-[7px] font-black uppercase text-slate-400">
                          {label}
                        </span>
                        <input
                          type="number"
                          value={Number(ingredientDraft[field as keyof IngredientDraft])}
                          onChange={(event) => updateIngredientDraft(field as keyof Pick<IngredientDraft, 'kcal' | 'protein' | 'carbs' | 'fats'>, Number(event.target.value))}
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                        />
                      </label>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Agregar ingrediente
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
