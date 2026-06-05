'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { type MoodEntry } from '@/lib/schema';
import { getMoodEntriesForMonth } from '@/app/mood/actions';
import MoodLogger from '@/components/MoodLogger';
import MoodCalendar from '@/components/MoodCalendar';

export default function MoodContainer() {
  const [monthEntries, setMonthEntries] = useState<(MoodEntry & { date: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = await getMoodEntriesForMonth(now.getFullYear(), now.getMonth());
      const validEntries = month.filter((e): e is MoodEntry & { date: string } => typeof e.date === 'string');
      setMonthEntries(validEntries);
    } catch (err) {
      console.error('Error loading mood data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <MoodCalendar entries={monthEntries} onSaved={loadData} />
      )}
    </div>
  );
}
