'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Plus, Trash2, Check, Sparkles, X, Loader2 } from 'lucide-react';
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

export default function DailyChecklist() {
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [isPending, startTransition] = useTransition();

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

  // Handle checking / unchecking
  const handleToggle = async (routineId: string) => {
    // Native HIG haptic feedback
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
      // Revert optimistic UI
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
  const handleAddTemplate = async (e: React.FormEvent) => {
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
        toast.error(res.error || 'Error al añadir rutina.');
      }
    });
  };

  // Delete a template
  const handleDeleteTemplate = async (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    
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

  const total = templates.length;
  const completed = templates.filter((t) => completedIds.has(t.id)).length;
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-3xl border border-white/40 shadow-sm min-h-[150px]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <span className="text-xs text-slate-500 font-bold mt-2">Cargando tus tareas diarias...</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/60 dark:bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.01)] p-5 relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tareas Diarias
            </h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Checklist de hoy
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 py-1.5 px-3 rounded-full transition active:scale-95 shadow-sm"
        >
          <Edit2 className="w-3 h-3" />
          Editar
        </button>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            <span>Progreso de hoy</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {completed}/{total} completadas
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200/50 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 15 }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {total === 0 && (
        <div className="text-center py-8 px-4 flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-indigo-400 mb-2 animate-pulse" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            No tienes tareas diarias configuradas.
          </p>
          <button
            onClick={() => setIsEditOpen(true)}
            className="mt-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-full shadow-sm active:scale-95 transition"
          >
            Crear primera rutina
          </button>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2.5">
        {templates.map((template) => {
          const isDone = completedIds.has(template.id);
          return (
            <div
              key={template.id}
              onClick={() => handleToggle(template.id)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 cursor-pointer hover:bg-white/70 dark:hover:bg-white/10 transition active:scale-[0.99] select-none shadow-sm"
            >
              {/* Custom Checkbox */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                  isDone
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-slate-300 dark:border-slate-600 bg-transparent'
                }`}
              >
                <AnimatePresence initial={false}>
                  {isDone && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Title & Icon */}
              <span className="text-base select-none">{template.icon || '✨'}</span>
              <span
                className={`text-sm font-bold transition-all ${
                  isDone
                    ? 'line-through text-slate-400/80 dark:text-slate-500/85'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {template.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Slide-over or Modal for Editing Templates */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-5 max-w-md w-full border border-white/20"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Gestionar Rutinas
                  </h4>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List of current templates */}
              <div className="max-h-48 overflow-y-auto mb-4 space-y-2 pr-1">
                {templates.length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-400 text-center py-4">
                    Aún no hay rutinas creadas.
                  </p>
                ) : (
                  templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t.icon}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {t.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add template form */}
              <form onSubmit={handleAddTemplate} className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Nueva Rutina
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Meditación 10 min, Beber té..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Selecciona un Icono
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {iconsList.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setNewIcon(ico)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition border ${
                          newIcon === ico
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                            : 'border-slate-200 dark:border-white/10 hover:bg-slate-50'
                        }`}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Rutina
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
