'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { type MoodEntry } from '@/lib/schema';
import { getTodayMoodEntry, getMoodEntriesForMonth } from '@/app/mood/actions';
import MoodLogger from '@/components/MoodLogger';
import MoodCalendar from '@/components/MoodCalendar';

// MoodCalendar expects date to be required — we filter/map from schema's optional date
type CalendarEntry = { date: string; mood_score: number; impact_factors: string[] };

export default function MoodContainer() {
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [monthEntries, setMonthEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [today, month] = await Promise.all([
        getTodayMoodEntry(),
        getMoodEntriesForMonth(now.getFullYear(), now.getMonth()),
      ]);
      setTodayEntry(today);
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

  return (
    <div className="space-y-8">
      {/* Logger Card */}
      <MoodLogger
        onSaved={loadData}
        existingEntry={todayEntry}
      />

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

