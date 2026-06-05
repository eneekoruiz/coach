'use client';

import React, { useState, useEffect, useTransition } from 'react';
import toast from '@/lib/toast';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
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
      } catch (error) {
        console.error('Error loading checklist data:', error);
        toast.error('Error al cargar rutinas.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle checking / unchecking with Optimistic UI and Haptic vibration
  const handleToggle = async (routineId: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }

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
      const res = await createRoutineTemplate(newTitle.trim(), newIcon);
      if (res.success && res.data) {
        setTemplates((prev) => [...prev, res.data!]);
        setNewTitle('');
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
    isLoading,
    isEditOpen,
    setIsEditOpen,
    newTitle,
    setNewTitle,
    newIcon,
    setNewIcon,
    isPending,
    mounted,
    iconsList,
    handleToggle,
    handleAddTemplate,
    handleDeleteTemplate,
  };
}
