'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useHabits } from '@/hooks/useHabits';
import { buildSummaryCards } from '@/lib/habits-utils';
import { getNormalizedDate } from '@/lib/date-utils';
import HabitTrackerSummaryCards from './HabitTrackerSummaryCards';
import HabitCreateModal from './HabitCreateModal';
import HabitTrackerCard from './HabitTrackerCard';

function HabitTrackerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm h-16" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm h-32" />
        ))}
      </div>
      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm h-24" />
    </div>
  );
}

function StatusBanner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 text-sm shadow-sm font-semibold ${
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const todayStr = getNormalizedDate(new Date());
  const yesterdayStr = getNormalizedDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const summaryCards = buildSummaryCards(habits, recentLogs);

  if (loading) {
    return <HabitTrackerSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black tracking-tight text-slate-950">
          Hábitos
        </h2>
        
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            title="Volver al inicio"
          >
            ←
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-950 text-white font-black text-xl shadow-sm hover:scale-105 active:scale-95 transition-transform"
            title="Nuevo Hábito"
          >
            +
          </button>
        </div>
      </div>

      <HabitTrackerSummaryCards cards={summaryCards} />

      {/* Selector de fecha de registro (GDPR-friendly y edición histórica) */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm flex items-center justify-between mt-6">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition ${selectedDate === todayStr ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition ${selectedDate === yesterdayStr ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            Ayer
          </button>
          <div className="flex items-center pl-2 ml-1 border-l border-slate-200">
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {authRequired ? (
        <StatusBanner tone="info" message="Inicia sesión para ver y registrar tus hábitos." />
      ) : null}

      {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
      {statusMessage && !errorMessage ? <StatusBanner tone="info" message={statusMessage} /> : null}

      {habits.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-10 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="text-4xl mb-4">🌱</div>
          <h3 className="text-lg font-black text-slate-900">Empieza tu viaje</h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">Usa el botón + para añadir tu primer hábito.</p>
        </div>
      ) : (
        <div className="grid gap-3 mt-4">
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

      <HabitCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createHabitQuick}
      />

      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}