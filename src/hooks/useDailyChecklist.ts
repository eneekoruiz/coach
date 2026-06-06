import React, { useState, useEffect, useTransition } from 'react';
import toast from '@/lib/toast';
import { supabase } from '@/lib/supabase';
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

export function useDailyChecklist() {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userHabits, setUserHabits] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [linkedHabitId, setLinkedHabitId] = useState<number | null>(null);
  const [habitIncrementAmount, setHabitIncrementAmount] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const iconsList = ['✨', '💧', '🥗', '🏋️', '🧘', '📚', '💊', '😴', '🚶', '🍎'];

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [fetchedTemplates, fetchedLogs] = await Promise.all([
          getRoutineTemplates(),
          getTodayRoutineLogs(),
        ]);
        setTemplates(fetchedTemplates);
        setCompletedIds(new Set(fetchedLogs.map((log) => log.routine_id)));

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

  const handleToggle = async (routineId: string) => {
    hapticSuccess();

    const wasCompleted = completedIds.has(routineId);

    // Optimistic UI update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (wasCompleted) {
        next.delete(routineId);
      } else {
        next.add(routineId);
      }
      return next;
    });

    try {
      if (wasCompleted) {
        const res = await unmarkRoutineComplete(routineId);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await markRoutineComplete(routineId);
        if (!res.success) throw new Error(res.error);
      }
    } catch (err) {
      hapticError();
      console.error('Error toggling routine completion:', err);
      toast.error('Error al actualizar rutina.');
      // Revert optimistic UI on error
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (wasCompleted) {
          next.add(routineId);
        } else {
          next.delete(routineId);
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
        newIcon,
        timeOfDay,
        linkedHabitId,
        habitIncrementAmount
      );
      if (res.success && res.data) {
        setTemplates((prev) => [...prev, res.data!]);
        setNewTitle('');
        setLinkedHabitId(null);
        setHabitIncrementAmount(1);
        setTimeOfDay('morning');
        toast.success('Rutina añadida con éxito.');
      } else {
        toast.error(res?.error || 'Error al añadir rutina.');
      }
    });
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    startTransition(async () => {
      const res = await deleteRoutineTemplate(id);
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Rutina eliminada.');
      } else {
        toast.error(res.error || 'Error al eliminar rutina.');
      }
    });
  };

  return {
    templates,
    completedIds,
    userHabits,
    isLoading,
    isEditOpen,
    setIsEditOpen,
    newTitle,
    setNewTitle,
    newIcon,
    setNewIcon,
    timeOfDay,
    setTimeOfDay,
    linkedHabitId,
    setLinkedHabitId,
    habitIncrementAmount,
    setHabitIncrementAmount,
    isPending,
    mounted,
    iconsList,
    handleToggle,
    handleAddTemplate,
    handleDeleteTemplate,
  };
}
