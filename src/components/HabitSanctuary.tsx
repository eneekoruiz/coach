'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Flame,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  Target,
  Ban,
} from 'lucide-react';
import HabitCreateModal from './HabitCreateModal';
import HabitTrackerCard from './HabitTrackerCard';
import RecoveryHabitCard from './RecoveryHabitCard';
import ScreenGuideButton from './ScreenGuideButton';
import { useHabits } from '@/hooks/useHabits';
import { computeHabitOutcome } from '@/lib/habits';

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel: string;
}

function ProgressRing({ value, size = 236, stroke = 18, label, sublabel }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="grid place-items-center" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90 [grid-area:1/1]"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
          className="text-emerald-500"
        />
      </svg>
      <div className="flex flex-col items-center justify-center text-center [grid-area:1/1]">
        <span className="text-6xl font-black tracking-tight text-slate-950">
          {Math.round(value)}%
        </span>
        <span className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-slate-400">
          {label}
        </span>
        <span className="mt-2 max-w-36 text-xs font-semibold leading-5 text-slate-500">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

export default function HabitSanctuary() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeView, setActiveView] = useState<'today' | 'stats'>('today');
  const {
    habits,
    values,
    recentLogs,
    recoveryCheckIns,
    loading,
    authRequired,
    errorMessage,
    savingMap,
    saveHabit,
    saveHabitValue,
    createHabitQuick,
    updateHabitSettings,
    updateHabitValue,
    saveRecoveryCheckIn,
    selectedDate,
  } = useHabits();

  const sanctuaryStats = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter((habit) => {
      const outcome = computeHabitOutcome(habit, values[habit.id] ?? 0);
      return outcome === 'perfect';
    }).length;
    const topStreakHabit = habits.reduce<(typeof habits)[number] | null>((top, habit) => {
      if (!top) return habit;
      return (habit.current_streak ?? 0) > (top.current_streak ?? 0) ? habit : top;
    }, null);
    const shieldCount = habits.reduce((sum, habit) => sum + (habit.shields ?? 0), 0);
    const longestStreak = habits.reduce(
      (max, habit) => Math.max(max, habit.longest_streak ?? 0),
      0
    );

    return {
      total,
      completed,
      progress: total > 0 ? (completed / total) * 100 : 0,
      shieldCount,
      longestStreak,
      topStreakHabit,
      topStreak: topStreakHabit?.current_streak ?? 0,
    };
  }, [habits, values]);
  const positiveHabits = useMemo(
    () => habits.filter((habit) => habit.type === 'positive'),
    [habits]
  );
  const negativeHabits = useMemo(
    () => habits.filter((habit) => habit.type === 'negative'),
    [habits]
  );

  if (authRequired) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">Inicia sesión para ver tus hábitos.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden bg-slate-50 text-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
              Hábitos
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">Hoy</h1>
          </div>
          <div className="flex items-center gap-2">
            <ScreenGuideButton
              title="Hábitos"
              description="La pantalla prioriza acciones del día y desplaza las estadísticas a una vista secundaria."
              goal="Entrar, prometer, registrar y revisar sin hacer scroll innecesario."
              bullets={[
                'Hoy muestra primero las tarjetas accionables.',
                'Recuperación separa promesa, reloj y revisión.',
                'Estadísticas queda detrás de una pestaña táctil.',
              ]}
              compact
            />
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all duration-200 ease-in-out active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl min-w-0 grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveView('today')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeView === 'today' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setActiveView('stats')}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeView === 'stats' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </button>
        </div>
      </div>

      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-4 sm:px-6 md:pb-6 lg:px-8 scrollbar-hide">
        <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden">
          {activeView === 'stats' ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
              <aside className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex justify-center">
                    <ProgressRing
                      value={sanctuaryStats.progress}
                      label="Hoy"
                      sublabel={`${sanctuaryStats.completed}/${sanctuaryStats.total} hábitos protegidos`}
                    />
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {sanctuaryStats.longestStreak}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Mejor racha
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <Activity className="h-5 w-5 text-indigo-500" />
                      <p className="mt-2 text-2xl font-black text-slate-950">
                        {sanctuaryStats.total}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Hábitos vivos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Racha viva
                      </p>
                      <p className="text-sm font-black text-slate-950">
                        {sanctuaryStats.topStreakHabit?.name ?? 'Sin hábitos activos'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-5xl font-black tracking-tight text-slate-950">
                    {sanctuaryStats.topStreak}
                    <span className="ml-2 text-sm font-black uppercase tracking-widest text-slate-400">
                      días
                    </span>
                  </p>
                </div>
              </aside>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                      Resumen
                    </p>
                    <h2 className="text-xl font-black text-slate-950">Tendencia de hábitos</h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {sanctuaryStats.shieldCount}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Escudos
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <Target className="h-5 w-5 text-cyan-500" />
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {positiveHabits.length}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Construcción
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <Ban className="h-5 w-5 text-rose-500" />
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {negativeHabits.length}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Recuperación
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                    {selectedDate}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Acciones del día</h2>
                </div>
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </div>

              {loading ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                    />
                  ))}
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : habits.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <ShieldCheck className="h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-600">
                    Crea tu primer hábito para activar rachas.
                  </p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider text-white transition-all duration-200 ease-in-out active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Crear hábito
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <section className="min-w-0 overflow-hidden rounded-3xl border border-rose-100 bg-rose-50/40 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                          <Ban className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                            Recuperación
                          </p>
                          <h3 className="text-sm font-black text-slate-950">
                            Relojes de Sobriedad
                          </h3>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                        {negativeHabits.length}
                      </span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-gray-100">
                      {negativeHabits.map((habit) => (
                        <RecoveryHabitCard
                          key={habit.id}
                          habit={habit}
                          value={values[habit.id] ?? 0}
                          checkIn={recoveryCheckIns.find(
                            (row) => row.habit_id === habit.id && row.checkin_date === selectedDate
                          )}
                          saving={!!savingMap[habit.id]}
                          onValueChange={updateHabitValue}
                          onSaveValue={saveHabitValue}
                          onSaveRecoveryCheckIn={saveRecoveryCheckIn}
                        />
                      ))}
                      {negativeHabits.length === 0 && (
                        <div className="p-5 text-sm text-slate-500 bg-white">
                          Añade un hábito de resiliencia: tabaco, alcohol, ultraprocesados o
                          scrolling.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                          <Target className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            Construcción
                          </p>
                          <h3 className="text-sm font-black text-slate-950">Hábitos Positivos</h3>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        {positiveHabits.length}
                      </span>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-gray-100">
                      {positiveHabits.map((habit) => (
                        <HabitTrackerCard
                          key={habit.id}
                          habit={habit}
                          value={values[habit.id] ?? 0}
                          saving={!!savingMap[habit.id]}
                          onValueChange={updateHabitValue}
                          onSave={saveHabit}
                          onSaveValue={saveHabitValue}
                          onUpdateSettings={updateHabitSettings}
                          recentLogs={recentLogs}
                        />
                      ))}
                      {positiveHabits.length === 0 && (
                        <div className="p-5 text-sm text-slate-500 bg-white">
                          Añade un hábito de construcción: agua, lectura, pasos o proteína.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <HabitCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={createHabitQuick}
      />
    </main>
  );
}
