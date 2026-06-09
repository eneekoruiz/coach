'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { type IngredientItem, type Recipe } from '@/lib/schema';
import { deleteRecipe, getRecipes, saveRecipe } from '@/app/nutrition/actions';
import toast from '@/lib/toast';
import {
  Calculator,
  GripVertical,
  Plus,
  Save,
  Search,
  Soup,
  Trash2,
  Utensils,
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState(emptyIngredient);

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

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

    const result = await saveRecipe(recipeData);
    if (!result.success || !result.data) {
      toast.error(result.error || 'Error al guardar la receta');
      return;
    }

    toast.success(editingRecipe ? 'Receta actualizada' : 'Receta creada');
    setEditingRecipe(result.data);
    await loadRecipes();
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!recipe.id) return;
    if (!confirm('¿Seguro que quieres eliminar esta receta de tu biblioteca?')) return;

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
  };

  const handleDragStart = (event: React.DragEvent, recipe: Recipe) => {
    event.dataTransfer.setData('application/json', JSON.stringify(recipe));
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Librería
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
              <Soup className="h-4 w-4 text-emerald-600" />
              Recetario
            </h3>
          </div>
          <button
            type="button"
            onClick={startNewRecipe}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 active:scale-95"
            title="Nueva receta"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar receta"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
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
            filteredRecipes.map((recipe) => {
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
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSaveRecipe} className="flex h-full flex-col gap-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Lienzo de Trabajo
              </p>
              <input
                type="text"
                value={recipeName}
                onChange={(event) => setRecipeName(event.target.value)}
                placeholder="Selecciona o crea una receta"
                className="mt-1 w-full rounded-none border-b border-transparent bg-transparent pb-1 text-xl font-black text-slate-900 outline-none transition focus:border-slate-300"
              />
            </div>
            <div className="flex gap-2">
              {editingRecipe?.id && (
                <button
                  type="button"
                  onClick={() => handleDeleteRecipe(editingRecipe)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 active:scale-95"
                  title="Eliminar receta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ['kcal', totals.kcal, 'text-emerald-700'],
              ['Proteína', `${totals.protein}g`, 'text-rose-600'],
              ['Carbohidratos', `${totals.carbs}g`, 'text-sky-600'],
              ['Grasas', `${totals.fats}g`, 'text-amber-600'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  {label}
                </p>
                <p className={`mt-1 text-lg font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Preparación
            </label>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={4}
              placeholder="Pasos, timing, textura, sustituciones clínicas..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-800">
                  Ingredientes
                </h4>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                  {ingredients.length} items
                </span>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {ingredients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <Calculator className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Añade ingredientes para calcular macros.
                    </p>
                  </div>
                ) : (
                  ingredients.map((ingredient, index) => (
                    <div
                      key={`${ingredient.name}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-800">
                          {ingredient.name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-400">
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

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Añadir ingrediente
              </p>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={ingredientDraft.name}
                  onChange={(event) => updateIngredientDraft('name', event.target.value)}
                  placeholder="Ingrediente"
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ['kcal', 'kcal'],
                    ['P', 'protein'],
                    ['C', 'carbs'],
                    ['G', 'fats'],
                  ].map(([label, field]) => (
                    <label key={field} className="block">
                      <span className="mb-1 block text-[8px] font-black uppercase text-slate-400">
                        {label}
                      </span>
                      <input
                        type="number"
                        value={Number(ingredientDraft[field as keyof IngredientDraft])}
                        onChange={(event) => updateIngredientDraft(field as keyof Pick<IngredientDraft, 'kcal' | 'protein' | 'carbs' | 'fats'>, Number(event.target.value))}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Añadir
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
