'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from '@/lib/toast';
import { type DietPlan, saveDietPlan, autocompleteDietWithAi } from '@/app/nutrition/actions';

const dietPlanFormSchema = z.object({
  target_kcal: z.coerce.number().int().min(500, 'Mínimo 500 kcal').max(10000, 'Máximo 10000 kcal'),
  target_protein: z.coerce.number().int().min(0, 'Mínimo 0g').max(500, 'Máximo 500g'),
  target_carbs: z.coerce.number().int().min(0, 'Mínimo 0g').max(1000, 'Máximo 1000g'),
  target_fats: z.coerce.number().int().min(0, 'Mínimo 0g').max(300, 'Máximo 300g'),
  breakfast_plan: z.string().max(1000, 'Máximo 1000 caracteres'),
  lunch_plan: z.string().max(1000, 'Máximo 1000 caracteres'),
  dinner_plan: z.string().max(1000, 'Máximo 1000 caracteres'),
});

type FormValues = z.infer<typeof dietPlanFormSchema>;

interface DietPlanFormProps {
  initialPlan: DietPlan | null;
  onSaveSuccess: () => void;
}

export default function DietPlanForm({ initialPlan, onSaveSuccess }: DietPlanFormProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const defaultValues: FormValues = {
    target_kcal: initialPlan?.target_kcal ?? 2000,
    target_protein: initialPlan?.target_protein ?? 150,
    target_carbs: initialPlan?.target_carbs ?? 200,
    target_fats: initialPlan?.target_fats ?? 70,
    breakfast_plan: initialPlan?.breakfast_plan ?? '',
    lunch_plan: initialPlan?.lunch_plan ?? '',
    dinner_plan: initialPlan?.dinner_plan ?? '',
  };

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(dietPlanFormSchema),
    defaultValues,
  });

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      const res = await saveDietPlan(values);
      if (res.success) {
        toast.success('¡Plan de dieta guardado con éxito!');
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

  const handleAiAutocomplete = async () => {
    setIsAiLoading(true);
    toast.success('Analizando tus hábitos para estimar la mejor dieta...');
    try {
      const res = await autocompleteDietWithAi();
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Error en autocompletado');
      }
      // Rellenar campos del formulario reactivamente
      setValue('target_kcal', res.data.target_kcal);
      setValue('target_protein', res.data.target_protein);
      setValue('target_carbs', res.data.target_carbs);
      setValue('target_fats', res.data.target_fats);
      setValue('breakfast_plan', res.data.breakfast_plan);
      setValue('lunch_plan', res.data.lunch_plan);
      setValue('dinner_plan', res.data.dinner_plan);
      toast.success('¡Plan de dieta autocompletado! Revisa y haz clic en Guardar.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al conectar con la IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Sección Macros */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-slate-900">Macros Objetivo Diarios</h3>
        <p className="text-xs text-slate-500 mb-6">Establece tu consumo de calorías y reparto de macronutrientes.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Calorías */}
          <div className="rounded-[1.25rem] border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
            <label htmlFor="target_kcal" className="block text-xs font-bold uppercase tracking-wider text-violet-700">
              Calorías (kcal)
            </label>
            <input
              id="target_kcal"
              type="number"
              {...register('target_kcal')}
              className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xl font-semibold text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            {errors.target_kcal && (
              <span className="mt-1 block text-xs text-rose-500 font-medium">{errors.target_kcal.message}</span>
            )}
          </div>

          {/* Proteína */}
          <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
            <label htmlFor="target_protein" className="block text-xs font-bold uppercase tracking-wider text-emerald-700">
              Proteína (g)
            </label>
            <input
              id="target_protein"
              type="number"
              {...register('target_protein')}
              className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xl font-semibold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {errors.target_protein && (
              <span className="mt-1 block text-xs text-rose-500 font-medium">{errors.target_protein.message}</span>
            )}
          </div>

          {/* Carbohidratos */}
          <div className="rounded-[1.25rem] border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
            <label htmlFor="target_carbs" className="block text-xs font-bold uppercase tracking-wider text-sky-700">
              Carbohidratos (g)
            </label>
            <input
              id="target_carbs"
              type="number"
              {...register('target_carbs')}
              className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xl font-semibold text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {errors.target_carbs && (
              <span className="mt-1 block text-xs text-rose-500 font-medium">{errors.target_carbs.message}</span>
            )}
          </div>

          {/* Grasas */}
          <div className="rounded-[1.25rem] border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
            <label htmlFor="target_fats" className="block text-xs font-bold uppercase tracking-wider text-amber-700">
              Grasas (g)
            </label>
            <input
              id="target_fats"
              type="number"
              {...register('target_fats')}
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xl font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {errors.target_fats && (
              <span className="mt-1 block text-xs text-rose-500 font-medium">{errors.target_fats.message}</span>
            )}
          </div>
        </div>
      </div>

      {/* Sección Distribución de Comidas */}
      <div className="rounded-[1.75rem] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Distribución de Comidas</h3>
        <p className="text-xs text-slate-500 mb-2">Detalla los menús recomendados o planeados para cada momento del día.</p>

        {/* Desayuno */}
        <div className="space-y-1">
          <label htmlFor="breakfast_plan" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Desayuno 🥞
          </label>
          <textarea
            id="breakfast_plan"
            rows={3}
            placeholder="Ej: Tortilla de 3 claras y 1 huevo entero, 50g de avena cocida con fresas..."
            {...register('breakfast_plan')}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
          />
          {errors.breakfast_plan && (
            <span className="text-xs text-rose-500">{errors.breakfast_plan.message}</span>
          )}
        </div>

        {/* Comida */}
        <div className="space-y-1">
          <label htmlFor="lunch_plan" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Comida 🍗
          </label>
          <textarea
            id="lunch_plan"
            rows={3}
            placeholder="Ej: 150g de pechuga de pollo a la plancha, 200g de arroz basmati cocido, brócoli al vapor..."
            {...register('lunch_plan')}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
          />
          {errors.lunch_plan && (
            <span className="text-xs text-rose-500">{errors.lunch_plan.message}</span>
          )}
        </div>

        {/* Cena */}
        <div className="space-y-1">
          <label htmlFor="dinner_plan" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Cena 🐟
          </label>
          <textarea
            id="dinner_plan"
            rows={3}
            placeholder="Ej: 180g de filete de salmón al horno, ensalada verde mixta con una cucharada de aceite de oliva..."
            {...register('dinner_plan')}
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
          />
          {errors.dinner_plan && (
            <span className="text-xs text-rose-500">{errors.dinner_plan.message}</span>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isAiLoading || isSaving}
          onClick={handleAiAutocomplete}
          className="relative inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
        >
          {/* Brillo dinámico en hover */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/25 skew-x-12 -translate-x-full group-hover:animate-[shimmer_0.75s_ease-in-out]" />
          <span>✨ Autocompletar con IA</span>
        </button>

        <button
          type="submit"
          disabled={isAiLoading || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Guardando...' : '💾 Guardar Mi Plan'}
        </button>
      </div>
    </form>
  );
}
