'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import toast from '@/lib/toast';
import { dietTemplateSchema, type DietTemplate, defaultTemplate } from '@/lib/schema';
import { saveDietTemplate, autocompleteDietWithAi } from '@/app/nutrition/actions';

type TemplateEditorModalProps = {
  template: DietTemplate | null;
  onClose: () => void;
  onSave: () => void;
};

export default function TemplateEditorModal({ template, onClose, onSave }: TemplateEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DietTemplate>({
    resolver: zodResolver(dietTemplateSchema),
    defaultValues: template || defaultTemplate,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'meals',
  });

  const watchMeals = useWatch({
    control,
    name: 'meals',
  });

  // Cálculo automático de totales
  useEffect(() => {
    if (!watchMeals) return;
    const totals = watchMeals.reduce(
      (acc, meal) => ({
        kcal: acc.kcal + (meal.target_kcal || 0),
        protein: acc.protein + (meal.target_protein || 0),
        carbs: acc.carbs + (meal.target_carbs || 0),
        fats: acc.fats + (meal.target_fats || 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
    
    setValue('target_kcal', totals.kcal);
    setValue('target_protein', totals.protein);
    setValue('target_carbs', totals.carbs);
    setValue('target_fats', totals.fats);
  }, [watchMeals, setValue]);

  // Usamos watch para el renderizado del sticky header
  const currentKcal = useWatch({ control, name: 'target_kcal' }) || 0;
  const currentProtein = useWatch({ control, name: 'target_protein' }) || 0;
  const currentCarbs = useWatch({ control, name: 'target_carbs' }) || 0;
  const currentFats = useWatch({ control, name: 'target_fats' }) || 0;
  const templateName = useWatch({ control, name: 'name' }) || '';

  const handleAiFill = async () => {
    if (!templateName) {
      toast.error('Por favor, ponle un nombre a la plantilla primero (ej. "Día de Descanso")');
      return;
    }

    setIsGeneratingAi(true);
    toast.success('Generando comidas con IA...');
    try {
      const res = await autocompleteDietWithAi(templateName);
      if (res.success && res.data) {
        toast.success('Plantilla rellenada por la IA.');
        reset(res.data);
      } else {
        toast.error(res.error || 'Error al generar.');
      }
    } catch (err) {
      toast.error('Error inesperado con la IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const onSubmit = async (values: DietTemplate) => {
    setIsSaving(true);
    try {
      const res = await saveDietTemplate(values);
      if (res.success) {
        toast.success('¡Plantilla guardada!');
        onSave();
      } else {
        toast.error(res.error || 'Error al guardar la plantilla.');
      }
    } catch (err) {
      toast.error('Ocurrió un error inesperado al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="Nombre (Ej. Día de Pierna)" 
              {...register('name')} 
              className="w-full text-2xl font-black text-slate-800 outline-none bg-transparent placeholder-slate-300"
            />
            {errors.name && <span className="text-[10px] text-rose-500">{errors.name.message}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAiFill}
              disabled={isGeneratingAi}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 text-violet-600 font-bold text-sm hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Rellenar con IA</span>
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sticky Header de Macros Totales */}
        <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 shrink-0 shadow-md flex gap-2 sm:gap-6 justify-center">
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-400">{currentKcal}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">kcal Totales</div>
          </div>
          <div className="w-px bg-slate-700 mx-2 sm:mx-4"></div>
          <div className="text-center">
            <div className="text-lg font-bold">{currentProtein}g</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Proteína</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{currentCarbs}g</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{currentFats}g</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grasas</div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
          <form id="template-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
            
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="pr-12 mb-4">
                    <input 
                      type="text" 
                      {...register(`meals.${index}.name`)} 
                      className="w-full text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none pb-1 transition-colors"
                      placeholder="Momento del Día (Ej. Almuerzo)"
                    />
                    {errors?.meals?.[index]?.name && <span className="text-[10px] text-rose-500">{errors.meals[index]?.name?.message}</span>}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">KCAL</label>
                      <input type="number" {...register(`meals.${index}.target_kcal`, { valueAsNumber: true })} className="w-full bg-transparent text-center font-semibold text-slate-700 outline-none" />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">PRO (g)</label>
                      <input type="number" {...register(`meals.${index}.target_protein`, { valueAsNumber: true })} className="w-full bg-transparent text-center font-semibold text-slate-700 outline-none" />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">CAR (g)</label>
                      <input type="number" {...register(`meals.${index}.target_carbs`, { valueAsNumber: true })} className="w-full bg-transparent text-center font-semibold text-slate-700 outline-none" />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">GRA (g)</label>
                      <input type="number" {...register(`meals.${index}.target_fats`, { valueAsNumber: true })} className="w-full bg-transparent text-center font-semibold text-slate-700 outline-none" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-2 pl-1">Alimentos sugeridos</label>
                    <textarea 
                      {...register(`meals.${index}.text`)} 
                      rows={2} 
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500 transition-colors bg-slate-50/50 resize-none" 
                      placeholder="Ej. 200g Pollo, 100g Arroz..."
                    />
                  </div>
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
                  <p className="font-medium">La plantilla está vacía.</p>
                  <p className="text-sm">Añade comidas o usa la IA para generar una estructura.</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => append({ 
                  id: `m-${Date.now()}`, 
                  name: '', 
                  text: '', 
                  target_kcal: 0, 
                  target_protein: 0, 
                  target_carbs: 0, 
                  target_fats: 0 
                })}
                className="w-full py-4 border-2 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-[2rem] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Añadir nuevo momento del día
              </button>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3">
          <button
            type="submit"
            form="template-form"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
