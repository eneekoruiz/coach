'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Edit2, Plus, Trash2, Check, Sparkles, X, Loader2, ListTodo } from 'lucide-react';
import toast from '@/lib/toast';
import BottomSheet from './BottomSheet';
import { useDailyChecklist } from '@/hooks/useDailyChecklist';
import { useHabits } from '@/hooks/useHabits';
import { buildSummaryCards } from '@/lib/habits-utils';
import HabitTrackerSummaryCards from './HabitTrackerSummaryCards';
import {
  getRoutineTemplates,
  getTodayRoutineLogs,
  createRoutineTemplate,
  deleteRoutineTemplate,
  markRoutineComplete,
  unmarkRoutineComplete,
  type RoutineTemplate,
} from '@/app/routines/actions';

interface DailyChecklistProps {
  isDedicatedPage?: boolean;
}

export default function DailyChecklist({ isDedicatedPage = false }: DailyChecklistProps) {
  const router = useRouter();

  const {
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
  } = useDailyChecklist();

  // Load habits details for top metrics
  const { habits, recentLogs, loading: habitsLoading } = useHabits();
  const summaryCards = buildSummaryCards(habits, recentLogs);

  const handleEditClick = () => {
    if (isDedicatedPage) {
      setIsEditOpen(true);
    } else {
      router.push('/routines');
    }
  };

  const total = templates.length;
  const completed = templates.filter((t) => completedIds.has(t.id)).length;
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
  const pendingCount = total - completed;

  // Smart Reminder batch notifier check simulated for client feedback
  useEffect(() => {
    const checkSmartReminder = () => {
      const now = new Date();
      if (now.getHours() >= 20 && pendingCount > 0) {
        console.log(`[Smart Reminder] Te faltan ${pendingCount} tareas diarias, ¡casi cierras el día!`);
      }
    };
    checkSmartReminder();
  }, [pendingCount]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-40 bg-slate-200 rounded-full" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150/50 rounded-2xl">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/5" />
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter templates chronologically
  const morningTemplates = templates.filter((t) => t.time_of_day === 'morning' || !t.time_of_day);
  const afternoonTemplates = templates.filter((t) => t.time_of_day === 'afternoon');
  const nightTemplates = templates.filter((t) => t.time_of_day === 'night');

  const renderTimeGroup = (title: string, groupIcon: string, groupTemplates: typeof templates) => {
    if (groupTemplates.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-5 mb-2 pl-1">
          <span className="text-sm">{groupIcon}</span>
          <span>{title}</span>
        </h4>
        <div className="space-y-3">
          {groupTemplates.map((template) => {
            const isDone = completedIds.has(template.id);
            return (
              <motion.div
                key={template.id}
                onClick={() => handleToggle(template.id)}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition active:scale-[0.99] select-none shadow-sm min-h-[48px]"
              >
                {/* Custom Circular Checkbox */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0 ${
                    isDone
                      ? 'bg-indigo-600 border-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.3)]'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isDone && (
                      <motion.div
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -15 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white stroke-[3.5px]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Title & Icon */}
                <span className="text-lg select-none flex-shrink-0">{template.icon || '✨'}</span>
                <div className="flex-1 flex flex-col text-left">
                  <span
                    className={`text-sm font-bold transition-all duration-300 ${
                      isDone
                        ? 'line-through text-slate-400/80 dark:text-slate-500/85 font-semibold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {template.title}
                  </span>
                  {template.linked_habit_id && (
                    <span className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mt-0.5">
                      Vinculado a hábito (+{template.habit_increment_amount})
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full ${isDedicatedPage ? 'bg-white/80 dark:bg-black/60 p-6 md:p-8 rounded-[2.5rem]' : 'bg-white/60 dark:bg-black/60 p-5 rounded-3xl'} backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.01)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)]`}>
      
      {/* Habits metrics / rings inside page */}
      {isDedicatedPage && (
        <div className="mb-8 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
            Anillos de Hábitos
          </h4>
          {habitsLoading ? (
            <div className="h-24 rounded-2xl bg-white animate-pulse" />
          ) : (
            <HabitTrackerSummaryCards cards={summaryCards} />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {isDedicatedPage ? 'Mis Rutinas Diarias' : 'Tareas Diarias'}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Checklist de hoy
            </p>
          </div>
        </div>

        <button
          onClick={handleEditClick}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 py-2.5 px-4 rounded-full transition active:scale-95 shadow-sm min-h-[44px] min-w-[44px] justify-center"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Editar</span>
        </button>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="mb-5 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            <span>Progreso de hoy</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {completed}/{total} completadas
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200/50 dark:bg-white/10 rounded-full overflow-hidden">
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
        <div className="text-center py-10 px-4 flex flex-col items-center">
          <Sparkles className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            No tienes tareas diarias configuradas. Añade algunas rutinas para empezar a organizar tu día.
          </p>
          <button
            onClick={handleEditClick}
            className="mt-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-full shadow-lg active:scale-95 transition min-h-[44px]"
          >
            Crear primera rutina
          </button>
        </div>
      )}

      {/* Checklist items in Apple Reminders Style grouped chronologically */}
      <div className="space-y-4">
        {renderTimeGroup('Mañana', '☀️', morningTemplates)}
        {renderTimeGroup('Tarde', '⛅', afternoonTemplates)}
        {renderTimeGroup('Noche', '🌙', nightTemplates)}
      </div>

      {/* Drawer for Editing Templates (Only on Dedicated Page) */}
      {isEditOpen && isDedicatedPage && (
        <BottomSheet isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Gestionar Plantillas">
          <div className="space-y-4">
            {/* List of current templates */}
            <div className="max-h-48 overflow-y-auto mb-4 space-y-2 pr-1 custom-scrollbar">
              {templates.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 text-center py-6">
                  Aún no hay rutinas creadas.
                </p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.icon}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {t.title}
                        {t.time_of_day && (
                          <span className="ml-1.5 text-[9px] uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {t.time_of_day === 'morning' ? 'Mañana' : t.time_of_day === 'afternoon' ? 'Tarde' : 'Noche'}
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      disabled={isPending}
                      className="text-red-500 hover:text-red-600 dark:hover:text-red-400 p-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add template form */}
            <form onSubmit={handleAddTemplate} className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/10">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Nueva Rutina
                </label>
                <input
                  type="text"
                  placeholder="Ej. Meditación 10 min, Beber té..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Momento del Día
                </label>
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value as any)}
                  className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                >
                  <option value="morning">☀️ Mañana</option>
                  <option value="afternoon">⛅ Tarde</option>
                  <option value="night">🌙 Noche</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  ¿Alimenta algún hábito?
                </label>
                <select
                  value={linkedHabitId || ''}
                  onChange={(e) => setLinkedHabitId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                >
                  <option value="">No alimenta ningún hábito</option>
                  {userHabits.map((habit) => (
                    <option key={habit.id} value={habit.id}>
                      {habit.name}
                    </option>
                  ))}
                </select>
              </div>

              {linkedHabitId !== null && (
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Cantidad a sumar al completar
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={habitIncrementAmount}
                    onChange={(e) => setHabitIncrementAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 text-xs border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Selecciona un Icono
                </label>
                <div className="flex flex-wrap gap-2">
                  {iconsList.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setNewIcon(ico)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition border min-h-[44px] min-w-[44px] ${
                        newIcon === ico
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
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
                className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Añadir Rutina</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
