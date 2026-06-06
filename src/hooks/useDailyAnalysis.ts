'use client';

import React, { useState, useEffect, useRef } from 'react';
import { type DailyLog, type DietTemplate } from '@/lib/schema';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import { analyzeFoodImage } from '@/app/nutrition/actions';
import toast from '@/lib/toast';

interface UseDailyAnalysisProps {
  realLog: DailyLog | null;
  dietPlan: DietTemplate | null;
  dailyWaterTarget: number;
  onUpdate?: () => void | Promise<void>;
}

export function useDailyAnalysis({
  realLog,
  dietPlan,
  dailyWaterTarget,
  onUpdate,
}: UseDailyAnalysisProps) {
  const todayStr = getNormalizedDate(new Date());

  const targets = {
    kcal: dietPlan?.target_kcal ?? 2000,
    protein: dietPlan?.target_protein ?? 150,
    carbs: dietPlan?.target_carbs ?? 200,
    fats: dietPlan?.target_fats ?? 70,
    water: dailyWaterTarget ?? 2000,
  };

  const [engineMode, setEngineMode] = useState<'agile' | 'surgical'>('agile');
  const [loading, setLoading] = useState(false);

  // OCR Scan States
  const [isScanDrawerOpen, setIsScanDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{
    items: Array<{
      name: string;
      quantity_grams: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  } | null>(null);

  // Agile sliders / inputs
  const [kcalInput, setKcalInput] = useState(0);
  const [proteinInput, setProteinInput] = useState(0);
  const [carbsInput, setCarbsInput] = useState(0);
  const [fatsInput, setFatsInput] = useState(0);
  const [waterInput, setWaterInput] = useState(0);

  // Surgical list
  const [mealsList, setMealsList] = useState<
    Array<{ hora: string; descripcion: string; calidad_nutricional: 'buena' | 'regular' | 'mala' }>
  >([]);

  // Form for new meal in surgical mode
  const [newMealDesc, setNewMealDesc] = useState('');
  const [newMealHour, setNewMealHour] = useState('08:00');
  const [newMealQuality, setNewMealQuality] = useState<'buena' | 'regular' | 'mala'>('buena');

  // Sync state with incoming realLog
  useEffect(() => {
    if (realLog) {
      setKcalInput(realLog.total_kcal ?? 0);
      setProteinInput(realLog.protein_g ?? 0);
      setCarbsInput(realLog.carbs_g ?? 0);
      setFatsInput(realLog.fats_g ?? 0);
      setWaterInput(realLog.water_ml ?? realLog.hidratacion_ml ?? 0);
      setMealsList(realLog.comidas ?? []);
    } else {
      setKcalInput(0);
      setProteinInput(0);
      setCarbsInput(0);
      setFatsInput(0);
      setWaterInput(0);
      setMealsList([]);
    }
  }, [realLog]);

  // Dopamina visual: Confetti trigger
  const isKcalGoalMet = kcalInput >= targets.kcal && targets.kcal > 0;
  const confettiTriggeredRef = useRef(false);

  useEffect(() => {
    if (isKcalGoalMet && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;
      import('@/utils/rewards').then((mod) => mod.triggerStreakConfetti());
    } else if (!isKcalGoalMet) {
      confettiTriggeredRef.current = false;
    }
  }, [isKcalGoalMet]);

  // Save updates to Supabase
  const handleSave = async (
    updatedKcal = kcalInput,
    updatedProtein = proteinInput,
    updatedCarbs = carbsInput,
    updatedFats = fatsInput,
    updatedWater = waterInput,
    updatedMeals = mealsList
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión.');
        return;
      }

      // Fetch existing daily log to preserve non-nutrition data
      const { data: logRecord } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      const existingAiData = logRecord?.ai_data || {};
      const newAiData: DailyLog = {
        date: todayStr,
        comidas: updatedMeals,
        hidratacion_ml: updatedWater,
        toxinas: existingAiData.toxinas || [],
        bio_avatar: existingAiData.bio_avatar || {
          estado_fisiologico: 'Estable',
          energia_fisica: 3,
          claridad_mental: 3,
        },
        metricas: existingAiData.metricas || {
          variacion_inercia: 0,
          aciertos: [],
          error_clave: 'ninguno',
          accion_manana: 'Ninguna',
        },
        water_ml: updatedWater,
        total_kcal: updatedKcal,
        protein_g: updatedProtein,
        carbs_g: updatedCarbs,
        fats_g: updatedFats,
        habits_count: existingAiData.habits_count || {},
        propuestas_habitos: existingAiData.propuestas_habitos || [],
        alimentos_registrados: existingAiData.alimentos_registrados || [],
      };

      const { error } = await supabase.from('daily_logs').upsert(
        {
          user_id: user.id,
          date: todayStr,
          health_momentum: logRecord?.health_momentum ?? 50,
          ai_data: newAiData,
          habit_tracking: logRecord?.habit_tracking ?? [],
        },
        { onConflict: 'user_id,date' }
      );

      if (error) throw error;

      toast.success('¡Nutrición actualizada con éxito!');
      if (onUpdate) await onUpdate();
    } catch (err: any) {
      console.error('Error saving nutrition:', err);
      toast.error('Error al guardar: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Quick increment handlers for agile mode
  const quickKcal = (amount: number) => {
    const nextVal = Math.max(0, kcalInput + amount);
    setKcalInput(nextVal);
  };
  const quickProtein = (amount: number) => {
    const nextVal = Math.max(0, proteinInput + amount);
    setProteinInput(nextVal);
  };
  const quickWater = (amount: number) => {
    const nextVal = Math.max(0, waterInput + amount);
    setWaterInput(nextVal);
  };

  // Surgical mode additions
  const addMeal = async () => {
    if (!newMealDesc.trim()) {
      toast.error('Escribe una descripción de la comida.');
      return;
    }

    const newMeal = {
      hora: newMealHour,
      descripcion: newMealDesc.trim(),
      calidad_nutricional: newMealQuality,
    };

    const updatedMeals = [...mealsList, newMeal];
    setMealsList(updatedMeals);
    setNewMealDesc('');

    // Save and update
    await handleSave(kcalInput, proteinInput, carbsInput, fatsInput, waterInput, updatedMeals);
  };

  const removeMeal = async (idx: number) => {
    const updatedMeals = mealsList.filter((_, i) => i !== idx);
    setMealsList(updatedMeals);
    await handleSave(kcalInput, proteinInput, carbsInput, fatsInput, waterInput, updatedMeals);
  };

  // Image scanner methods
  const handleImageUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setOcrImage(base64Data);
      setIsScanning(true);
      setOcrResult(null);

      try {
        const res = await analyzeFoodImage(base64Data, file.type);
        if (res.success && res.data) {
          setOcrResult(res.data);
          toast.success('¡Plato analizado con éxito!');
        } else {
          toast.error(res.error || 'No se pudo extraer información nutricional de la foto.');
        }
      } catch (err) {
        console.error('Error al analizar la imagen:', err);
        toast.error('Error al procesar la imagen con la IA.');
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmOcr = async () => {
    if (!ocrResult || ocrResult.items.length === 0) return;

    let addedKcal = 0;
    let addedProtein = 0;
    let addedCarbs = 0;
    let addedFats = 0;
    const foodDescriptions: string[] = [];

    ocrResult.items.forEach((item) => {
      addedKcal += Math.round(item.calories ?? 0);
      addedProtein += Math.round(item.protein ?? 0);
      addedCarbs += Math.round(item.carbs ?? 0);
      addedFats += Math.round(item.fat ?? 0);
      foodDescriptions.push(`${item.name} (${item.quantity_grams}g)`);
    });

    const description = foodDescriptions.join(', ') + ' (OCR IA Visual)';

    const now = new Date();
    const currentHourStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newMeal = {
      hora: currentHourStr,
      descripcion: description,
      calidad_nutricional: 'buena' as const,
    };

    const updatedMeals = [...mealsList, newMeal];
    const newKcal = kcalInput + addedKcal;
    const newProtein = proteinInput + addedProtein;
    const newCarbs = carbsInput + addedCarbs;
    const newFats = fatsInput + addedFats;

    setKcalInput(newKcal);
    setProteinInput(newProtein);
    setCarbsInput(newCarbs);
    setFatsInput(newFats);
    setMealsList(updatedMeals);

    setIsScanDrawerOpen(false);
    setOcrResult(null);
    setOcrImage(null);

    await handleSave(newKcal, newProtein, newCarbs, newFats, waterInput, updatedMeals);
  };

  return {
    targets,
    engineMode,
    setEngineMode,
    loading,
    isScanDrawerOpen,
    setIsScanDrawerOpen,
    isScanning,
    dragOver,
    setDragOver,
    ocrImage,
    setOcrImage,
    ocrResult,
    setOcrResult,
    kcalInput,
    setKcalInput,
    proteinInput,
    setProteinInput,
    carbsInput,
    setCarbsInput,
    fatsInput,
    setFatsInput,
    waterInput,
    setWaterInput,
    mealsList,
    newMealDesc,
    setNewMealDesc,
    newMealHour,
    setNewMealHour,
    newMealQuality,
    setNewMealQuality,
    handleSave,
    quickKcal,
    quickProtein,
    quickWater,
    addMeal,
    removeMeal,
    handleImageUpload,
    handleConfirmOcr,
  };
}
