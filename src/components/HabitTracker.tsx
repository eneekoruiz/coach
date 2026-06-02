'use client';

import React from 'react';
import Link from 'next/link';
import { useHabits } from '@/hooks/useHabits';
import { buildSummaryCards } from '@/lib/habits-utils';
import { getNormalizedDate } from '@/lib/date-utils';
import HabitTrackerSummaryCards from './HabitTrackerSummaryCards';
import HabitTrackerQuickAddForm from './HabitTrackerQuickAddForm';
import HabitTrackerCard from './HabitTrackerCard';

function HabitTrackerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="mt-2 h-3 w-48 rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className="mt-3 h-8 w-16 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-3 h-10 w-full rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

function StatusBanner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 text-sm shadow-sm ${
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {message}
    </div>
  );
}

export default function HabitTracker() {
  const {
    habits,
    values,
    recentLogs,
    loading,
    authRequired,
    statusMessage,
    errorMessage,
    savingMap,
    saveHabit,
    saveHabitValue,
    createHabitQuick,
    updateHabitValue,
    selectedDate,
    setSelectedDate,
  } = useHabits();

  const todayStr = getNormalizedDate(new Date());
  const yesterdayStr = getNormalizedDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const summaryCards = buildSummaryCards(habits, recentLogs);

  if (loading) {
    return <HabitTrackerSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Tracker activo
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Hábitos y rachas en un solo vistazo
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Registra cada hábito, revisa el patrón reciente y detecta en segundos qué está subiendo,
              qué está cayendo y dónde conviene intervenir.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            aria-label="Volver al inicio desde el tracker"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      {/* Selector de fecha de registro (GDPR-friendly y edición histórica) */}
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Fecha de Registro</h3>
          <p className="text-xs text-slate-400">Puedes registrar datos de hoy o modificar días anteriores.</p>
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${selectedDate === todayStr ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${selectedDate === yesterdayStr ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Ayer
          </button>
          <div className="relative flex items-center pl-2 border-l border-slate-200">
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer pr-1"
            />
          </div>
        </div>
      </div>

      {authRequired ? (
        <StatusBanner tone="info" message="Inicia sesión para ver y registrar tus hábitos." />
      ) : null}

      {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
      {statusMessage && !errorMessage ? <StatusBanner tone="info" message={statusMessage} /> : null}

      <HabitTrackerSummaryCards cards={summaryCards} />

      <HabitTrackerQuickAddForm onCreate={createHabitQuick} />

      {habits.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No hay hábitos creados todavía. Usa el bloque superior para añadir el primero.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {habits.map((habit) => (
            <HabitTrackerCard
              key={habit.id}
              habit={habit}
              value={values[habit.id] ?? 0}
              saving={Boolean(savingMap[habit.id])}
              onValueChange={updateHabitValue}
              onSave={saveHabit}
              onSaveValue={saveHabitValue}
              recentLogs={recentLogs}
            />
          ))}
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}