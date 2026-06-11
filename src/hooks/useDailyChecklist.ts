import React, { useState, useEffect, useTransition } from 'react';
import toast from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import { hapticSuccess, hapticError } from '@/utils/haptics';
import {
  getRoutineTemplates,
  getTodayRoutineLogs,
  createRoutineTemplate,
  deleteRoutineTemplate,
  markRoutineComplete,
  unmarkRoutineComplete,
  type RoutineTemplate,
} from '@/app/routines/actions';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildNotificationSlots(count: number) {
  const safeCount = Math.max(1, Math.min(8, Math.floor(count)));
  if (safeCount === 1) return ['09:00'];

  const startMinutes = 9 * 60;
  const endMinutes = 20 * 60;
  const step = (endMinutes - startMinutes) / (safeCount - 1);

  return Array.from({ length: safeCount }, (_, index) => {
    const totalMinutes = Math.round((startMinutes + step * index) / 15) * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });
}

export function useDailyChecklist() {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [userHabits, setUserHabits] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'night' | 'all_day'>('morning');
  const [linkedHabitId, setLinkedHabitId] = useState<number | null>(null);
  const [habitIncrementAmount, setHabitIncrementAmount] = useState<number>(1);
  const [notificationTimes, setNotificationTimes] = useState<string[]>(() => buildNotificationSlots(1));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const safeCount = Math.max(1, Math.min(8, Math.floor(habitIncrementAmount)));
    if (safeCount !== habitIncrementAmount) {
      setHabitIncrementAmount(safeCount);
      return;
    }

    setNotificationTimes((current) => {
      const defaults = buildNotificationSlots(safeCount);
      return defaults.map((fallback, index) => current[index] ?? fallback);
    });

    if (safeCount > 1) {
      setTimeOfDay('all_day');
      return;
    }

    setTimeOfDay((current) => (current === 'all_day' ? 'morning' : current));
  }, [habitIncrementAmount]);

  const updateNotificationTime = (index: number, value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    setNotificationTimes((current) => {
      const next = [...current];
      next[index] = value;
      return next.slice(0, habitIncrementAmount);
    });
  };

  const incrementRepetitions = (delta: number) => {
    setHabitIncrementAmount((current) => Math.max(1, Math.min(8, current + delta)));
  };

  const handleTitleChange = (value: string) => {
    setNewTitle(value);

    const normalizedTitle = normalizeText(value);
    if (!normalizedTitle) {
      return;
    }

    const matchedHabit = userHabits.find((habit) => {
      const normalizedHabit = normalizeText(habit.name);
      return normalizedTitle.includes(normalizedHabit) || normalizedHabit.includes(normalizedTitle);
    });

    if (matchedHabit) {
      setLinkedHabitId(matchedHabit.id);
    }
  };

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedTemplates, fetchedLogs] = await Promise.all([
          getRoutineTemplates(),
          getTodayRoutineLogs(getNormalizedDate(new Date())),
        ]);
        setTemplates(fetchedTemplates);
        setProgressMap(
          fetchedLogs.reduce<Record<string, number>>((acc, log) => {
            acc[log.routine_id] = Math.max(1, Number(log.progress_count ?? 1));
            return acc;
          }, {})
        );

        // Load active user habits
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: habitsData } = await supabase
            .from('user_habits')
            .select('id, name')
            .eq('user_id', userData.user.id);
          if (habitsData) {
            setUserHabits(habitsData);
          }
        }
      } catch (error) {
        console.error('Error loading checklist data:', error);
        toast.error('Error al cargar rutinas.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggle = async (routineId: string, targetRepetitions: number) => {
    hapticSuccess();
    const currentProgress = progressMap[routineId] ?? 0;
    const isCompleted = currentProgress >= targetRepetitions;
    const willCompleteNow = !isCompleted && currentProgress + 1 >= targetRepetitions;
    const routineTitle = templates.find((template) => template.id === routineId)?.title ?? 'Rutina';

    // Optimistic UI update
    setProgressMap((prev) => {
      const next = { ...prev };
      if (isCompleted) {
        delete next[routineId];
      } else {
        next[routineId] = Math.min(targetRepetitions, currentProgress + 1);
      }
      return next;
    });

    try {
      if (isCompleted) {
        const res = await unmarkRoutineComplete(routineId, getNormalizedDate(new Date()));
        if (!res.success) throw new Error(res.error);
        toast.success('Rutina reabierta.', {
          description: routineTitle,
        });
      } else {
        const res = await markRoutineComplete(routineId, getNormalizedDate(new Date()));
        if (!res.success) throw new Error(res.error);
        toast.success(willCompleteNow ? 'Rutina completada.' : 'Progreso actualizado.', {
          description:
            targetRepetitions > 1
              ? `${routineTitle}: ${Math.min(targetRepetitions, currentProgress + 1)}/${targetRepetitions}`
              : routineTitle,
        });
        if (willCompleteNow) {
          const { triggerMicroCelebrate } = await import('@/utils/rewards');
          triggerMicroCelebrate();
        }
      }
    } catch (err) {
      hapticError();
      console.error('[DailyChecklist] Routine mutation failed:', err);
      toast.error('Error al actualizar la rutina.');
      // Revert optimistic UI on error
      setProgressMap((prev) => {
        const next = { ...prev };
        if (currentProgress > 0) {
          next[routineId] = currentProgress;
        } else {
          delete next[routineId];
        }
        return next;
      });
    }
  };

  // Add new template
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('El título no puede estar vacío.');
      return;
    }

    startTransition(async () => {
      const res = await createRoutineTemplate(
        newTitle.trim(),
        notificationsEnabled ? '🔔' : '📝',
        timeOfDay,
        linkedHabitId,
        habitIncrementAmount,
        1,
        notificationsEnabled ? notificationTimes.slice(0, habitIncrementAmount) : null
      );
      if (res.success && res.data) {
        setTemplates((prev) => [...prev, res.data!]);
        setNewTitle('');
        setLinkedHabitId(null);
        setHabitIncrementAmount(1);
        setNotificationTimes(buildNotificationSlots(1));
        setNotificationsEnabled(true);
        setTimeOfDay('morning');
        setIsEditOpen(false);
        toast.success('Rutina añadida con éxito.');
      } else {
        toast.error('Error al añadir rutina.');
      }
    });
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    startTransition(async () => {
      const res = await deleteRoutineTemplate(id);
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setProgressMap((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        toast.success('Rutina eliminada.');
      } else {
        toast.error('Error al eliminar rutina.');
      }
    });
  };

  return {
    templates,
    progressMap,
    userHabits,
    isLoading,
    isEditOpen,
    setIsEditOpen,
    newTitle,
    setNewTitle: handleTitleChange,
    timeOfDay,
    setTimeOfDay,
    linkedHabitId,
    setLinkedHabitId,
    habitIncrementAmount,
    setHabitIncrementAmount,
    notificationTimes,
    setNotificationTimes,
    updateNotificationTime,
    incrementRepetitions,
    notificationsEnabled,
    setNotificationsEnabled,
    isPending,
    mounted,
    handleToggle,
    handleAddTemplate,
    handleDeleteTemplate,
  };
}
