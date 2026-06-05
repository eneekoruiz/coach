'use client';

import React, { useState, useEffect } from 'react';
import { type Recipe, type IngredientItem } from '@/lib/schema';
import { getRecipes, saveRecipe, deleteRecipe } from '@/app/nutrition/actions';
import { Plus, Search, Trash2, Edit3, Sparkles, ChevronRight, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '@/lib/toast';

export default function RecipeLibrary() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  
  // Single ingredient form state
  const [ingName, setIngName] = useState('');
  const [ingAmount, setIngAmount] = useState<number>(100);
  const [ingUnit, setIngUnit] = useState('g');
  const [ingKcal, setIngKcal] = useState<number>(0);
  const [ingProtein, setIngProtein] = useState<number>(0);
  const [ingCarbs, setIngCarbs] = useState<number>(0);
  const [ingFats, setIngFats] = useState<number>(0);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await getRecipes();
    setRecipes(data);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setRecipeName('');
    setIngredients([]);
    resetIngredientForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    setIngredients(recipe.ingredients_json || []);
    resetIngredientForm();
    setIsModalOpen(true);
  };

  const resetIngredientForm = () => {
    setIngName('');
    setIngAmount(100);
    setIngUnit('g');
    setIngKcal(0);
    setIngProtein(0);
    setIngCarbs(0);
    setIngFats(0);
  };

  const handleAddIngredient = () => {
    if (!ingName.trim()) {
      toast.error('Introduce el nombre del ingrediente.');
      return;
    }
    const newIng: IngredientItem = {
      name: ingName,
      amount: Number(ingAmount),
      unit: ingUnit,
      kcal: Math.round(Number(ingKcal)),
      protein: Math.round(Number(ingProtein)),
      carbs: Math.round(Number(ingCarbs)),
      fats: Math.round(Number(ingFats)),
    };
    setIngredients([...ingredients, newIng]);
    resetIngredientForm();
    toast.success('Ingrediente añadido');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Calculated totals
  const totals = React.useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => {
        acc.kcal += ing.kcal;
        acc.protein += ing.protein;
        acc.carbs += ing.carbs;
        acc.fats += ing.fats;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [ingredients]);

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) {
      toast.error('Introduce el nombre de la receta.');
      return;
    }

    const recipeData: Recipe = {
      id: editingRecipe?.id,
      name: recipeName,
      ingredients_json: ingredients,
      total_kcal: totals.kcal,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fats: totals.fats,
    };

    const res = await saveRecipe(recipeData);
    if (res.success) {
      toast.success(editingRecipe ? 'Receta actualizada' : 'Receta creada');
      setIsModalOpen(false);
      loadRecipes();
    } else {
      toast.error(res.error || 'Error al guardar la receta');
    }
  };

  const handleDeleteRecipe = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que quieres eliminar esta receta de tu biblioteca?')) return;
    const res = await deleteRecipe(id);
    if (res.success) {
      toast.success('Receta eliminada');
      loadRecipes();
    } else {
      toast.error(res.error || 'Error al eliminar');
    }
  };

  const handleDragStart = (e: React.DragEvent, recipe: Recipe) => {
    e.dataTransfer.setData('application/json', JSON.stringify(recipe));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-50/50 rounded-[2rem] border border-slate-200/60 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            Biblioteca de Recetas
          </h3>
          <p className="text-xs text-slate-400 font-semibold">
            Gestiona tus platos clínicos y arrástralos al calendario.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-sm min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          Nueva Receta
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar recetas por nombre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          <div className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />
          <div className="h-16 bg-white rounded-2xl animate-pulse border border-slate-100" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-3xl">
          <p className="text-sm font-bold text-slate-500">No tienes recetas en tu biblioteca</p>
          <p className="text-xs text-slate-400 mt-1">
            Crea tu primera receta para asignarla rápidamente a tus comidas diarias.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              draggable
              onDragStart={(e) => handleDragStart(e, recipe)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing select-none relative"
            >
              <div className="flex justify-between items-start mb-2 pr-12">
                <div>
                  <h4 className="font-black text-slate-800 text-sm truncate max-w-[180px]">
                    {recipe.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {recipe.ingredients_json?.length || 0} Ingredientes
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 font-extrabold text-xs px-2 py-0.5 rounded-lg border border-emerald-100">
                  {recipe.total_kcal} kcal
                </div>
              </div>

              {/* Edit/Delete panel */}
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white border border-slate-100 rounded-lg p-0.5 shadow-sm">
                <button
                  onClick={() => handleOpenEdit(recipe)}
                  className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 rounded"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => recipe.id && handleDeleteRecipe(recipe.id, e)}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Macro Pills */}
              <div className="flex gap-1.5 mt-3 text-[10px] font-semibold text-slate-500">
                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                  P: {recipe.total_protein}g
                </span>
                <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-100">
                  C: {recipe.total_carbs}g
                </span>
                <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">
                  G: {recipe.total_fats}g
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal (Light Mode strict, zero shadow context issues) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-500" />
                  {editingRecipe ? 'Editar Receta' : 'Nueva Receta Clínica'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    Nombre del Plato / Receta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Avena con Arándanos y Suero"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Macro summary calculator panel */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Calorías
                    </span>
                    <span className="text-sm font-black text-emerald-600">{totals.kcal} kcal</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Proteínas
                    </span>
                    <span className="text-sm font-black text-rose-600">{totals.protein}g</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Carbohidratos
                    </span>
                    <span className="text-sm font-black text-sky-600">{totals.carbs}g</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Grasas
                    </span>
                    <span className="text-sm font-black text-amber-600">{totals.fats}g</span>
                  </div>
                </div>

                {/* List of current ingredients */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800">Ingredientes</h4>
                  {ingredients.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-bold italic py-2">
                      Sin ingredientes. Usa el formulario de abajo para rellenar la receta.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {ingredients.map((ing, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[11px]"
                        >
                          <span className="font-bold text-slate-700">
                            {ing.name} ({ing.amount}
                            {ing.unit})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-bold">
                              {ing.kcal} kcal • P:{ing.protein}g C:{ing.carbs}g G:{ing.fats}g
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(index)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add ingredient sub-form */}
                <div className="border-t border-slate-100 pt-4 space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/60">
                  <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    Añadir Ingrediente
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Avena, Huevo, Leche"
                        value={ingName}
                        onChange={(e) => setIngName(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Cantidad (g/ml)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={ingAmount}
                        onChange={(e) => setIngAmount(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        kcal
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={ingKcal}
                        onChange={(e) => setIngKcal(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Prot (g)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={ingProtein}
                        onChange={(e) => setIngProtein(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={ingCarbs}
                        onChange={(e) => setIngCarbs(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Grasa (g)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={ingFats}
                        onChange={(e) => setIngFats(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg outline-none font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all"
                  >
                    Añadir a la lista
                  </button>
                </div>

                <div className="flex gap-3 border-t border-slate-100 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold transition hover:bg-slate-50 active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Guardar Receta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
