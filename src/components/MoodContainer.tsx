'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { type MoodEntry } from '@/lib/schema';
import { getTodayMoodEntries, getMoodEntriesForMonth, deleteMoodEntry } from '@/app/mood/actions';
import MoodLogger from '@/components/MoodLogger';
import MoodCalendar from '@/components/MoodCalendar';
import toast from '@/lib/toast';

const MOODS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '😔', label: 'Muy Desagradable' },
  2: { emoji: '😕', label: 'Desagradable' },
  3: { emoji: '😐', label: 'Neutral' },
  4: { emoji: '😊', label: 'Agradable' },
  5: { emoji: '😄', label: 'Muy Agradable' },
};

// MoodCalendar expects date to be required — we filter/map from schema's optional date
type CalendarEntry = { date: string; mood_score: number; impact_factors: string[] };

export default function MoodContainer() {
  const [todayEntries, setTodayEntries] = useState<MoodEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [today, month] = await Promise.all([
        getTodayMoodEntries(),
        getMoodEntriesForMonth(now.getFullYear(), now.getMonth()),
      ]);
      setTodayEntries(today);
      // Map to guarantee date is always a string for the calendar
      setMonthEntries(
        month
          .filter((e): e is MoodEntry & { date: string } => !!e.date)
          .map(e => ({ date: e.date!, mood_score: e.mood_score, impact_factors: e.impact_factors }))
      );
    } catch (err) {
      console.error('Error loading mood data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteMoodEntry(id);
      if (res.success) {
        toast.success('Registro de ánimo eliminado');
        await loadData();
      } else {
        toast.error(res.error || 'Error al eliminar el registro');
      }
    } catch (err) {
      toast.error('Error inesperado al eliminar');
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top CTA Button / Logger Card */}
      <div className="flex flex-col gap-6">
        {!isLogging ? (
          <button
            onClick={() => setIsLogging(true)}
            className="w-full max-w-md mx-auto py-6 px-8 rounded-[2rem] border border-white/60 bg-white/70 shadow-lg backdrop-blur-xl flex flex-col items-center gap-2 transition hover:bg-white/80 active:scale-[0.98] group"
          >
            <span className="text-4xl animate-pulse group-hover:scale-110 transition duration-300">💝</span>
            <span className="text-lg font-bold text-slate-800">Registrar cómo me siento AHORA</span>
            <span className="text-xs text-slate-400">Guarda un registro rápido de tu estado mental actual</span>
          </button>
        ) : (
          <div className="relative w-full max-w-md mx-auto bg-slate-50/50 p-4 rounded-[3rem] border border-slate-100 shadow-inner">
            <button
              onClick={() => setIsLogging(false)}
              className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm hover:scale-105 active:scale-95 transition"
              title="Cancelar"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <MoodLogger
              onSaved={async () => {
                setIsLogging(false);
                await loadData();
              }}
            />
          </div>
        )}

        {/* Today's registrations list */}
        {todayEntries.length > 0 && (
          <div className="w-full max-w-md mx-auto space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Registros de hoy
            </h3>
            <div className="space-y-2.5">
              {todayEntries.map((entry) => {
                const info = MOODS[entry.mood_score] || MOODS[3];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white/80 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{info.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{info.label}</span>
                          <span className="text-xs text-slate-400 font-medium">
                            {formatTime(entry.logged_at)}
                          </span>
                        </div>
                        {entry.impact_factors.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {entry.impact_factors.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id!)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Eliminar registro"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Calendar */}
      {loading ? (
        <div className="rounded-[2.5rem] border border-white/80 bg-white/60 backdrop-blur-2xl p-6 shadow-sm">
          <div className="h-64 animate-pulse flex flex-col gap-4">
            <div className="w-40 h-6 bg-slate-200 rounded-full" />
            <div className="flex-1 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      ) : (
        <MoodCalendar entries={monthEntries} />
      )}
    </div>
  );
}

