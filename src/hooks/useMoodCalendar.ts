'use client';

import { useState, useMemo, useCallback, useEffect, useTransition } from 'react';
import { saveMoodEntry, deleteMoodEntry } from '@/app/mood/actions';
import toast from '@/lib/toast';

interface MoodEntry {
  id?: string;
  user_id?: string;
  date: string;
  mood_score?: number;
  valence_score?: number;
  impact_factors?: string[];
  impact_tags?: string[];
  created_at_timestamp?: string;
  logged_at?: string;
  is_daily_summary?: boolean;
}

interface UseMoodCalendarProps {
  entries: MoodEntry[];
  onDaySelect?: (date: string) => void;
  onSaved?: () => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function useMoodCalendar({ entries, onDaySelect, onSaved }: UseMoodCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Retroactive logging form state
  const [showLogForm, setShowLogForm] = useState(false);
  const [retroScore, setRetroScore] = useState<number>(0);
  const [retroFactors, setRetroFactors] = useState<string[]>([]);
  const [retroIsSummary, setRetroIsSummary] = useState(true);
  const [isPending, startTransition] = useTransition();

  const entriesByDate = useMemo(() => {
    const map = new Map<string, MoodEntry[]>();
    for (const entry of entries) {
      if (!entry.date) continue;
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const navigateMonth = useCallback((delta: number) => {
    startTransition(() => {
      setSelectedDay(null);
      setDirection(delta);
      setCurrentMonth((prev) => {
        let newMonth = prev + delta;
        let newYear = currentYear;
        if (newMonth < 0) {
          newMonth = 11;
          newYear -= 1;
        } else if (newMonth > 11) {
          newMonth = 0;
          newYear += 1;
        }
        setCurrentYear(newYear);
        return newMonth;
      });
    });
  }, [currentYear]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);

  const cells = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [firstDayOffset, daysInMonth]);

  const selectedDateEntries = useMemo(() => {
    if (!selectedDay) return [];
    return entriesByDate.get(selectedDay) || [];
  }, [selectedDay, entriesByDate]);

  // Actions
  const handleSaveRetro = () => {
    if (retroScore === 0 || !selectedDay) return;
    startTransition(async () => {
      try {
        const res = await saveMoodEntry(retroScore, retroFactors, selectedDay, retroIsSummary);
        if (res.success) {
          toast.success('Registro de ánimo retroactivo guardado');
          setShowLogForm(false);
          setRetroScore(0);
          setRetroFactors([]);
          if (onSaved) onSaved();
        } else {
          toast.error(res.error || 'Error al guardar');
        }
      } catch (err) {
        toast.error('Error inesperado al guardar el registro');
      }
    });
  };

  const handleDeleteEntry = (id: string) => {
    startTransition(async () => {
      try {
        const res = await deleteMoodEntry(id);
        if (res.success) {
          toast.success('Registro de ánimo eliminado');
          if (onSaved) onSaved();
        } else {
          toast.error(res.error || 'Error al eliminar');
        }
      } catch (err) {
        toast.error('Error inesperado al eliminar');
      }
    });
  };

  const toggleFactor = (factor: string) => {
    setRetroFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  return {
    currentMonth,
    currentYear,
    selectedDay,
    setSelectedDay,
    direction,
    mounted,
    showLogForm,
    setShowLogForm,
    retroScore,
    setRetroScore,
    retroFactors,
    setRetroFactors,
    retroIsSummary,
    setRetroIsSummary,
    isPending,
    entriesByDate,
    navigateMonth,
    cells,
    selectedDateEntries,
    handleSaveRetro,
    handleDeleteEntry,
    toggleFactor,
  };
}
