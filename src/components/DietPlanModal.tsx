'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from '@/lib/toast';
import { type WeeklyDietSchedule, type DailyDietTarget, saveDietPlan, dailyDietTargetSchema, defaultDailyPlan } from '@/app/nutrition/actions';

type DietPlanModalProps = {
  day: string;
  currentData: DailyDietTarget;
  fullSchedule: WeeklyDietSchedule;
  onClose: () => void;
  onSaveSuccess: () => void;
};

type FormValues = {
  target_kcal: number;
  target_protein: number;
  target_carbs: number;
  target_fats: number;
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string;
  };
};

export default function DietPlanModal({ day, currentData, fullSchedule, onClose, onSaveSuccess }: DietPlanModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(dailyDietTargetSchema),
    defaultValues: {
      target_kcal: currentData.target_kcal ?? defaultDailyPlan.target_kcal,
      target_protein: currentData.target_protein ?? defaultDailyPlan.target_protein,
      target_carbs: currentData.target_carbs ?? defaultDailyPlan.target_carbs,
      target_fats: currentData.target_fats ?? defaultDailyPlan.target_fats,
      meals: {
        breakfast: currentData.meals?.breakfast ?? '',
        lunch: currentData.meals?.lunch ?? '',
        dinner: currentData.meals?.dinner ?? '',
        snacks: currentData.meals?.snacks ?? '',
      }
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const newSchedule = { ...fullSchedule };
      
      const cleanedValues = {
        ...values,
        meals: {
          breakfast: values.meals.breakfast || '',
          lunch: values.meals.lunch || '',
          dinner: values.meals.dinner || '',
          snacks: values.meals.snacks || '',
        }
      };

      if (applyToAll) {
        Object.keys(newSchedule).forEach((k) => {
          newSchedule[k as keyof WeeklyDietSchedule] = cleanedValues;
        });
      } else {
        newSchedule[day as keyof WeeklyDietSchedule] = cleanedValues;
      }

      const res = await saveDietPlan(newSchedule);
      if (res.success) {
        toast.success(applyToAll ? '¡Plan semanal actualizado!' : `¡Plan del ${day} actualizado!`);
        onSaveSuccess();
      } else {
        toast.error(res.error || 'Error al guardar el plan.');
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
        className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800">Editar {day}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Ajusta los macros y comidas para este día.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="diet-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Macros Objetivo</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Calorías (kcal)</label>
                  <input type="number" {...register('target_kcal')} className="w-full font-semibold text-lg outline-none" />
                  {errors.target_kcal && <span className="text-[10px] text-rose-500">{errors.target_kcal.message}</span>}
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Proteína (g)</label>
                  <input type="number" {...register('target_protein')} className="w-full font-semibold text-lg outline-none" />
                  {errors.target_protein && <span className="text-[10px] text-rose-500">{errors.target_protein.message}</span>}
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Carbohidratos (g)</label>
                  <input type="number" {...register('target_carbs')} className="w-full font-semibold text-lg outline-none" />
                  {errors.target_carbs && <span className="text-[10px] text-rose-500">{errors.target_carbs.message}</span>}
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Grasas (g)</label>
                  <input type="number" {...register('target_fats')} className="w-full font-semibold text-lg outline-none" />
                  {errors.target_fats && <span className="text-[10px] text-rose-500">{errors.target_fats.message}</span>}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Comidas</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desayuno</label>
                  <textarea {...register('meals.breakfast')} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Comida</label>
                  <textarea {...register('meals.lunch')} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cena</label>
                  <textarea {...register('meals.dinner')} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Snacks</label>
                  <textarea {...register('meals.snacks')} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500 transition-colors" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input 
                type="checkbox" 
                id="applyAll" 
                checked={applyToAll} 
                onChange={(e) => setApplyToAll(e.target.checked)} 
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="applyAll" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Aplicar estos mismos datos a toda la semana
              </label>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-semibold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="diet-form"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-full font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors text-sm disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
