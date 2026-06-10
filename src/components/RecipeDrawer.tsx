'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { type Recipe } from '@/lib/schema';
import { X, ChefHat, Scale, Flame, Beef, Wheat, Droplet } from 'lucide-react';

interface RecipeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
}

export default function RecipeDrawer({ isOpen, onClose, recipe }: RecipeDrawerProps) {
  if (!recipe) return null;

  const totals = React.useMemo(() => {
    return (recipe.ingredients_json || []).reduce(
      (acc, ing) => {
        acc.kcal += ing.kcal;
        acc.protein += ing.protein;
        acc.carbs += ing.carbs;
        acc.fats += ing.fats;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [recipe.ingredients_json]);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] transition-opacity" />

        <Drawer.Content className="bg-white border-t border-slate-200 flex flex-col rounded-t-[2.5rem] h-[85vh] fixed bottom-0 left-0 right-0 z-[150] outline-none shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <Drawer.Title className="sr-only">Ficha clínica de receta</Drawer.Title>
          <Drawer.Description className="sr-only">
            Panel con ingredientes, macros e instrucciones de preparación de la receta.
          </Drawer.Description>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 my-4 flex-shrink-0" />

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5" />
                  Ficha Clínica de Receta
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                  {recipe.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Macro Overview */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-150 rounded-3xl p-4 text-center">
              <div>
                <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Calorías
                </span>
                <span className="text-base font-black text-slate-800">{Math.round(recipe.total_kcal)} kcal</span>
              </div>
              <div>
                <Beef className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Proteínas
                </span>
                <span className="text-base font-black text-rose-500">{Math.round(recipe.total_protein)}g</span>
              </div>
              <div>
                <Wheat className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Carbohidratos
                </span>
                <span className="text-base font-black text-sky-500">{Math.round(recipe.total_carbs)}g</span>
              </div>
              <div>
                <Droplet className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Grasas
                </span>
                <span className="text-base font-black text-amber-500">{Math.round(recipe.total_fats)}g</span>
              </div>
            </div>

            {/* Ingredients List */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Ingredientes ({recipe.ingredients_json?.length || 0})
                </h3>
              </div>

              {recipe.ingredients_json && recipe.ingredients_json.length > 0 ? (
                <div className="space-y-2">
                  {recipe.ingredients_json.map((ing, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-700">{ing.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {ing.amount} {ing.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500">
                          {ing.kcal} kcal
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          P:{ing.protein}g C:{ing.carbs}g G:{ing.fats}g
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                  <p className="text-xs font-bold text-slate-400">Sin ingredientes registrados</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-emerald-500" />
                Instrucciones de Preparación
              </h3>

              {recipe.instructions && recipe.instructions.trim().length > 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="prose prose-sm prose-slate max-w-none">
                    {recipe.instructions.split('\n').filter(line => line.trim()).map((paragraph, idx) => (
                      <p key={idx} className="text-xs text-slate-600 leading-relaxed font-semibold mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                  <p className="text-xs font-bold text-slate-400">Sin instrucciones de preparación</p>
                  <p className="text-[10px] text-slate-300 mt-1">Añade los pasos desde el Recetario</p>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
