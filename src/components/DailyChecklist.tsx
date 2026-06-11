'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Sparkles, Loader2, ListTodo, Sun, CloudSun, Moon, Link2, BellRing, Minus } from 'lucide-react';
import BottomSheet from './BottomSheet';
import ScreenGuideButton from './ScreenGuideButton';
import { useDailyChecklist } from '@/hooks/useDailyChecklist';

interface DailyChecklistProps {
  isDedicatedPage?: boolean;
}

type TimeOfDay = 'morning' | 'afternoon' | 'night' | 'all_day';

export default function DailyChecklist({ isDedicatedPage = false }: DailyChecklistProps) {
  const router = useRouter();

  const {
    templates,
    progressMap,
    isLoading,
    isEditOpen,
    setIsEditOpen,
    newTitle,
    setNewTitle,
    timeOfDay,
    setTimeOfDay,
    linkedHabitId,
    setLinkedHabitId,
    habitIncrementAmount,
    notificationTimes,
    updateNotificationTime,
    incrementRepetitions,
    notificationsEnabled,
    setNotificationsEnabled,
    userHabits,
    isPending,
    handleToggle,
    handleAddTemplate,
  } = useDailyChecklist();

  const handleEditClick = () => {
    if (isDedicatedPage) {
      setIsEditOpen(true);
    } else {
      router.push('/routines');
    }
  };

  const total = templates.length;
  const completed = templates.filter((t) => (progressMap[t.id] ?? 0) >= Math.max(1, t.target_repetitions ?? 1)).length;
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
  const pendingCount = total - completed;

  useEffect(() => {
    if (pendingCount <= 0) return;
    const now = new Date();
    if (now.getHours() >= 20) {
      document.documentElement.dataset.pendingDailyTasks = String(pendingCount);
    }
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
  const allDayTemplates = templates.filter((t) => t.time_of_day === 'all_day');
  const afternoonTemplates = templates.filter((t) => t.time_of_day === 'afternoon');
  const nightTemplates = templates.filter((t) => t.time_of_day === 'night');

  const renderTimeGroup = (title: string, groupIcon: React.ReactNode, groupTemplates: typeof templates) => {
    if (groupTemplates.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-4 mb-2 pl-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200/60 text-xs">
            {groupIcon}
          </span>
          <span>{title}</span>
        </h4>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden divide-y divide-gray-100">
          {groupTemplates.map((template) => {
            const targetRepetitions = Math.max(1, template.target_repetitions ?? 1);
            const currentProgress = Math.min(targetRepetitions, progressMap[template.id] ?? 0);
            const isDone = currentProgress >= targetRepetitions;
            return (
              <motion.div
                key={template.id}
                data-testid={`routine-item-${template.id}`}
                onClick={() => handleToggle(template.id, targetRepetitions)}
                className={`flex min-h-[48px] items-center gap-3.5 bg-white px-4 py-3.5 transition-all duration-200 ease-in-out cursor-pointer select-none hover:bg-slate-50/80 ${
                  isDone ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {/* Custom Circular Checkbox */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0 ${
                    isDone
                      ? 'bg-indigo-650 border-indigo-650 shadow-[0_2px_8px_rgba(79,70,229,0.25)]'
                      : 'border-slate-350 bg-transparent'
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -15 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white stroke-[3.5px]" />
                      </motion.div>
                    ) : targetRepetitions > 1 && currentProgress > 0 ? (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="text-[10px] font-black text-indigo-700"
                      >
                        {currentProgress}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Title & Icon */}
                <span className="text-lg select-none flex-shrink-0">{template.icon || '✨'}</span>
                <div className="flex-1 flex flex-col text-left min-w-0">
                  <span
                    className={`text-sm font-bold w-full break-words whitespace-normal transition-all duration-300 ${
                      isDone
                        ? 'line-through text-slate-400 font-semibold'
                        : 'text-slate-900'
                    }`}
                  >
                    {template.title}
                  </span>
                  
                  {/* Premium iOS Progress Bar for partial progress */}
                  {targetRepetitions > 1 && !isDone && (
                    <div className="mt-1.5 w-full max-w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${(currentProgress / targetRepetitions) * 100}%` }}
                      />
                    </div>
                  )}

                  {template.linked_habit_id && (
                    <span className="text-[9px] font-extrabold text-indigo-650 uppercase tracking-wider mt-0.5 inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      Alimenta hábito (+{Math.max(1, template.habit_increment_amount ?? 1)} por toque)
                    </span>
                  )}
                </div>
                {targetRepetitions > 1 && (
                  <div data-testid={`routine-progress-${template.id}`} className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-650'
                  }`}>
                    {currentProgress}/{targetRepetitions}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isDedicatedPage) {
    return (
      <div className="w-full space-y-6">
        {/* Single iOS Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Tareas</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Centro de Tareas Diarias</p>
          </div>
          <div className="flex items-center gap-2">
            <ScreenGuideButton
              title="Tareas"
              description="Esta pantalla reúne tus recordatorios operativos del día por mañana, tarde y noche."
              goal="Sirve para tachar rápido, mantener foco y alimentar hábitos vinculados sin abrir más paneles."
              bullets={[
                'Usa Nueva Tarea para crear recordatorios simples.',
                'Si la vinculas a un hábito, al completarla sumará progreso automáticamente.',
                'Piensa en esta vista como el centro de ejecución del día.',
              ]}
              compact
            />
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full bg-slate-950 hover:bg-slate-800 px-4 text-xs font-bold text-white shadow-sm transition-all duration-200 ease-in-out active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>

        {/* Progress Bar inside its own card */}
        {total > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              <span>Progreso de hoy</span>
              <span className="text-indigo-650 font-black">
                {completed}/{total} completadas
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="text-center py-12 px-4 flex flex-col items-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <Sparkles className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
            <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
              No tienes tareas diarias configuradas. Añade algunas rutinas para empezar a organizar tu día.
            </p>
            <button
              onClick={() => setIsEditOpen(true)}
              className="mt-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-650 hover:bg-indigo-550 px-6 py-3 rounded-full shadow-lg active:scale-95 transition min-h-[44px]"
            >
              Crear primera tarea
            </button>
          </div>
        )}

        {/* Checklist items grouped chronologically */}
        <div className="space-y-5">
          {renderTimeGroup('Mañana', <Sun className="h-3.5 w-3.5" />, morningTemplates)}
          {renderTimeGroup('A lo largo del día', <BellRing className="h-3.5 w-3.5" />, allDayTemplates)}
          {renderTimeGroup('Tarde', <CloudSun className="h-3.5 w-3.5" />, afternoonTemplates)}
          {renderTimeGroup('Noche', <Moon className="h-3.5 w-3.5" />, nightTemplates)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
      {/* Header for Dashboard Widget */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Tareas Diarias
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Checklist de hoy
            </p>
          </div>
        </div>

        <button
          onClick={handleEditClick}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-indigo-500 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="mb-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-550 uppercase tracking-wider mb-1.5">
            <span>Progreso de hoy</span>
            <span className="text-indigo-650">
              {completed}/{total} completadas
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
          <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
            No tienes tareas diarias configuradas. Añade algunas rutinas para empezar a organizar tu día.
          </p>
          <button
            onClick={handleEditClick}
            className="mt-4 text-xs font-black uppercase tracking-wider text-white bg-indigo-650 hover:bg-indigo-550 px-6 py-3 rounded-full shadow-lg active:scale-95 transition min-h-[44px]"
          >
            Crear primera tarea
          </button>
        </div>
      )}

      {/* Checklist items in Apple Reminders Style grouped chronologically */}
      <div className="space-y-4">
        {renderTimeGroup('Mañana', <Sun className="h-3.5 w-3.5" />, morningTemplates)}
        {renderTimeGroup('A lo largo del día', <BellRing className="h-3.5 w-3.5" />, allDayTemplates)}
        {renderTimeGroup('Tarde', <CloudSun className="h-3.5 w-3.5" />, afternoonTemplates)}
        {renderTimeGroup('Noche', <Moon className="h-3.5 w-3.5" />, nightTemplates)}
      </div>

      {/* Drawer for Editing Templates (Only on Dedicated Page) */}
      {isEditOpen && isDedicatedPage && (
        <BottomSheet isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Nueva Tarea">
          <div className="space-y-4">
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  1. Nombre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Meditación 10 min"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  2. Momento del día
                </label>
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
                  disabled={habitIncrementAmount > 1}
                  className="w-full px-4 py-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[44px]"
                >
                  <option value="morning">☀️ Mañana</option>
                  <option value="all_day">🔁 A lo largo del día</option>
                  <option value="afternoon">⛅ Tarde</option>
                  <option value="night">🌙 Noche</option>
                </select>
                {habitIncrementAmount > 1 && (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    Al repetirse varias veces, la tarea pasa automáticamente a "A lo largo del día".
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  3. Repeticiones
                </label>
                <div className="grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <button
                    type="button"
                    onClick={() => incrementRepetitions(-1)}
                    disabled={habitIncrementAmount <= 1}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-95 disabled:opacity-40"
                    aria-label="Reducir repeticiones"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="text-center">
                    <p className="text-3xl font-black tabular-nums text-slate-950">
                      {habitIncrementAmount}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {habitIncrementAmount === 1 ? 'vez al día' : 'veces al día'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => incrementRepetitions(1)}
                    disabled={habitIncrementAmount >= 8}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-600 text-white transition active:scale-95 disabled:opacity-40"
                    aria-label="Aumentar repeticiones"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      4. Notificación
                    </label>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Guarda la preferencia en el tipo de tarea.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationsEnabled((current) => !current)}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-4 text-xs font-black transition-all duration-200 ease-in-out ${
                      notificationsEnabled ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                    }`}
                  >
                    <BellRing className="h-4 w-4" />
                  </button>
                </div>
                {notificationsEnabled && (
                  <div className="mt-4 grid gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                      Horas sugeridas
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Array.from({ length: habitIncrementAmount }, (_, index) => (
                        <label
                          key={index}
                          className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3"
                        >
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            Aviso {index + 1}
                          </span>
                          <input
                            type="time"
                            value={notificationTimes[index] ?? '09:00'}
                            onChange={(event) => updateNotificationTime(index, event.target.value)}
                            className="h-11 rounded-xl bg-slate-50 px-3 text-sm font-black tabular-nums text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-indigo-300"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  5. Vincular a hábito
                </label>
                <select
                  value={linkedHabitId ?? ''}
                  onChange={(event) => setLinkedHabitId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin vincular</option>
                  {userHabits.map((habit) => (
                    <option key={habit.id} value={habit.id}>
                      {habit.name}
                    </option>
                  ))}
                </select>
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
                    <span>Guardar Tarea</span>
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
