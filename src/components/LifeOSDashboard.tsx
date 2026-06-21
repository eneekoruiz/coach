'use client';

import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from 'react';
import { Check, Flame, ChevronDown, Calendar, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import { triggerVibration } from '@/lib/haptics';
import toast from '@/lib/toast';

// Types
import type { HabitRow, HabitTrackingEntry } from '@/types/habits';

interface LifeOSDashboardProps {
  initialHabits?: HabitRow[];
}

// 1. Memoized Row Component for Ultimate Rendering Performance
interface DayRowProps {
  dateStr: string;
  habits: HabitRow[];
  tracking: HabitTrackingEntry[];
  isToday: boolean;
  onToggleHabit: (dateStr: string, habitId: number, currentAmount: number) => void;
}

const DayRow = React.memo(function DayRow({
  dateStr,
  habits,
  tracking,
  isToday,
  onToggleHabit,
}: DayRowProps) {
  // Parse date for display
  const dateObj = useMemo(() => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return {
      day: d,
      month: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
    };
  }, [dateStr]);

  // Calculate daily completion stats
  const { completedCount, successPercent } = useMemo(() => {
    if (habits.length === 0) return { completedCount: 0, successPercent: 0 };
    let completed = 0;
    habits.forEach((habit) => {
      const entry = tracking.find((t) => t.habit_id === habit.id);
      const amount = entry ? entry.amount : 0;
      const target = habit.target_value ?? 1;
      const tolerance = habit.tolerance_threshold ?? 0;
      
      const isMet = habit.type === 'positive' ? amount >= target : amount <= tolerance;
      if (isMet) completed++;
    });
    return {
      completedCount: completed,
      successPercent: Math.round((completed / habits.length) * 100),
    };
  }, [habits, tracking]);

  return (
    <tr
      id={isToday ? 'row-today' : undefined}
      className={`border-b border-slate-100 transition-colors duration-150 ${
        isToday 
          ? 'bg-[#D1F2EB]/40 hover:bg-[#D1F2EB]/60 border-l-4 border-l-[#34C759]' 
          : 'hover:bg-slate-50/50'
      }`}
    >
      {/* Date Column */}
      <td className="py-3.5 px-4 sticky left-0 bg-white/95 backdrop-blur-sm z-10 w-24 border-r border-slate-100">
        <div className="flex flex-col text-left">
          <span className="text-sm font-bold text-[#1D1D1F] capitalize">
            {dateObj.day} {dateObj.month}
          </span>
          <span className="text-[10px] text-[#86868B] font-semibold uppercase tracking-wider">
            {dateObj.weekday}
          </span>
        </div>
      </td>

      {/* Habit Columns */}
      {habits.map((habit) => {
        const entry = tracking.find((t) => t.habit_id === habit.id);
        const amount = entry ? entry.amount : 0;
        const target = habit.target_value ?? 1;
        const tolerance = habit.tolerance_threshold ?? 0;
        
        const isChecked = habit.type === 'positive' ? amount >= target : amount <= tolerance;

        return (
          <td key={habit.id} className="py-3 px-2 text-center border-r border-slate-100/50">
            <div className="flex justify-center items-center">
              <button
                onClick={() => onToggleHabit(dateStr, habit.id, amount)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform active:scale-90 cursor-pointer ${
                  isChecked
                    ? 'bg-[#34C759] border-[#34C759] text-white shadow-sm ring-2 ring-[#34C759]/20'
                    : 'border-[#D2D2D7] bg-transparent text-transparent hover:border-[#86868B]'
                }`}
                title={`${habit.name} - ${isChecked ? 'Completado' : 'Pendiente'}`}
              >
                <Check className="w-4 h-4 stroke-[3.5]" />
              </button>
            </div>
          </td>
        );
      })}

      {/* Daily Progress Ring Column */}
      <td className="py-3 px-4 text-right pr-6 w-20">
        <div className="flex items-center justify-end">
          <svg className="w-6 h-6 transform -rotate-90">
            <circle cx="12" cy="12" r="9" stroke="#E5E5EA" strokeWidth="2" fill="transparent" />
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="#34C759"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={56.5}
              strokeDashoffset={56.5 - (56.5 * successPercent) / 100}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="text-[11px] font-bold text-[#1D1D1F] ml-2 w-8 text-right">
            {successPercent}%
          </span>
        </div>
      </td>
    </tr>
  );
});

// Helper: Calculate monthly statistics from deferred logs state
interface MonthData {
  name: string;
  shortName: string;
  value: number;
}

function calculateMonthlyAverages(
  logsMap: Record<string, HabitTrackingEntry[]>,
  year: number,
  habits: HabitRow[]
): MonthData[] {
  const monthNames = [
    { name: 'Enero', shortName: 'Ene' },
    { name: 'Febrero', shortName: 'Feb' },
    { name: 'Marzo', shortName: 'Mar' },
    { name: 'Abril', shortName: 'Abr' },
    { name: 'Mayo', shortName: 'May' },
    { name: 'Junio', shortName: 'Jun' },
    { name: 'Julio', shortName: 'Jul' },
    { name: 'Agosto', shortName: 'Ago' },
    { name: 'Septiembre', shortName: 'Sep' },
    { name: 'Octubre', shortName: 'Dic' }, // wait, October shortName is Oct, name is Octubre
    { name: 'Noviembre', shortName: 'Nov' },
    { name: 'Diciembre', shortName: 'Dic' },
  ];

  // Let's fix the typo in the list name above:
  monthNames[9] = { name: 'Octubre', shortName: 'Oct' };

  if (habits.length === 0) {
    return monthNames.map((m) => ({ ...m, value: 0 }));
  }

  return monthNames.map((m, index) => {
    const month = index;
    const totalDays = new Date(year, month + 1, 0).getDate();
    let sumProgress = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const tracking = logsMap[dateStr];

      const trackingEntries = tracking || [];
      let completedCount = 0;
      habits.forEach((habit) => {
        const entry = trackingEntries.find((t) => t.habit_id === habit.id);
        const amount = entry ? entry.amount : 0;
        const target = habit.target_value ?? 1;
        const tolerance = habit.tolerance_threshold ?? 0;
        
        const isMet = habit.type === 'positive' ? amount >= target : amount <= tolerance;
        if (isMet) completedCount++;
      });

      const dailyProgress = (completedCount / habits.length) * 100;
      sumProgress += dailyProgress;
    }

    const averageProgress = Math.round(sumProgress / totalDays);
    return {
      name: m.name,
      shortName: m.shortName,
      value: averageProgress,
    };
  });
}

// 2. Main Dashboard Component
export default function LifeOSDashboard({ initialHabits }: LifeOSDashboardProps) {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [habits, setHabits] = useState<HabitRow[]>(initialHabits ?? []);
  const [logsMap, setLogsMap] = useState<Record<string, HabitTrackingEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayStr = useMemo(() => getNormalizedDate(new Date()), []);

  // Performance isolation: Defer updating monthly averages calculation
  const deferredLogsMap = useDeferredValue(logsMap);
  const deferredYear = useDeferredValue(selectedYear);
  const deferredHabits = useDeferredValue(habits);

  const monthlyAverages = useMemo(() => {
    return calculateMonthlyAverages(deferredLogsMap, deferredYear, deferredHabits);
  }, [deferredLogsMap, deferredYear, deferredHabits]);

  // Generate calendar dates list (descending chronological order)
  const yearDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    
    for (let d = new Date(endDate); d >= startDate; d.setDate(d.getDate() - 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  }, [selectedYear]);

  // Fetch habits and year logs
  const loadYearData = useCallback(async (year: number) => {
    setLoading(true);
    setAuthRequired(false);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      // Safe Demo Fallback
      if (userError || !user) {
        console.warn('[LifeOS] Running in demo mode: Supabase authentication not active.');
        setAuthRequired(true);
        loadMockData(year);
        setLoading(false);
        return;
      }

      // 1. Fetch habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', user.id);

      if (habitsError) throw habitsError;
      
      const loadedHabits = habitsData || [];
      setHabits(loadedHabits);

      // Calculate overall streak
      const maxStreak = loadedHabits.reduce((max, h) => Math.max(max, h.current_streak || 0), 0);
      setCurrentStreak(maxStreak);

      // 2. Fetch logs for selected year
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (logsError) throw logsError;

      const map: Record<string, HabitTrackingEntry[]> = {};
      (logsData || []).forEach((log) => {
        map[log.date] = Array.isArray(log.habit_tracking) ? (log.habit_tracking as HabitTrackingEntry[]) : [];
      });
      setLogsMap(map);

    } catch (err) {
      console.error('[LifeOS] Error loading data from Supabase:', err);
      toast.error('Error al cargar datos históricos.');
      loadMockData(year);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock data generator for preview/local demo
  const loadMockData = (year: number) => {
    const mockHabits: HabitRow[] = [
      {
        id: 1,
        name: 'Agua',
        type: 'positive',
        target_value: 2000,
        tolerance_threshold: 0,
        current_streak: 4,
        longest_streak: 15,
        shields: 1,
      },
      {
        id: 2,
        name: 'Pasos',
        type: 'positive',
        target_value: 8000,
        tolerance_threshold: 0,
        current_streak: 7,
        longest_streak: 12,
        shields: 0,
      },
      {
        id: 3,
        name: 'Sin fumar',
        type: 'negative',
        target_value: 0,
        tolerance_threshold: 1,
        current_streak: 11,
        longest_streak: 21,
        shields: 1,
      },
    ];
    setHabits(mockHabits);
    setCurrentStreak(11);

    const map: Record<string, HabitTrackingEntry[]> = {};
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Seed random mock logs
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (Math.random() > 0.4) {
        map[dateStr] = [
          { habit_id: 1, amount: Math.random() > 0.3 ? 2000 : 750, metric_type: 'volume' },
          { habit_id: 2, amount: Math.random() > 0.4 ? 8000 : 3000, metric_type: 'counter' },
          { habit_id: 3, amount: Math.random() > 0.8 ? 2 : 0, metric_type: 'counter' },
        ];
      }
    }
    setLogsMap(map);
  };

  useEffect(() => {
    loadYearData(selectedYear);
  }, [selectedYear, loadYearData]);

  // Handle year change
  const handleYearChange = (year: number) => {
    triggerVibration('light');
    setSelectedYear(year);
  };

  // Smooth scroll to "Today"
  const scrollToToday = () => {
    triggerVibration('medium');
    const todayEl = document.getElementById('row-today');
    if (todayEl) {
      todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      toast.info('No se encontró hoy en este año.');
    }
  };

  // Performant Toggle Habit Logic (Local State Update + Debounced Sync)
  const handleToggleHabit = useCallback(
    async (dateStr: string, habitId: number, currentAmount: number) => {
      triggerVibration('light');

      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const target = habit.target_value ?? 1;
      const isPositive = habit.type === 'positive';
      const tolerance = habit.tolerance_threshold ?? 0;

      let nextAmount = 0;
      const wasCompleted = isPositive ? currentAmount >= target : currentAmount <= tolerance;

      if (!wasCompleted) {
        nextAmount = isPositive ? target : 0;
      } else {
        nextAmount = isPositive ? 0 : tolerance + 1;
      }

      // 1. Optimistic Update (Local State)
      setLogsMap((prev) => {
        const next = { ...prev };
        const currentTracking = next[dateStr] ? [...next[dateStr]] : [];
        const entryIndex = currentTracking.findIndex((t) => t.habit_id === habitId);

        const updatedEntry: HabitTrackingEntry = {
          habit_id: habitId,
          amount: nextAmount,
          metric_type: habit.metric_type,
          unit_label: habit.unit_label,
        };

        if (entryIndex >= 0) {
          currentTracking[entryIndex] = updatedEntry;
        } else {
          currentTracking.push(updatedEntry);
        }

        next[dateStr] = currentTracking;
        return next;
      });

      // 2. Database Sync (API call)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/habits/update-today', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            habit_id: habitId,
            amount: nextAmount,
            date: dateStr,
          }),
        });

        if (!res.ok) {
          throw new Error('Sync failed');
        }
      } catch (err) {
        console.error('[LifeOS] Database sync failed, reverting:', err);
        toast.error('Error al guardar registro.');
        
        // Revert State
        setLogsMap((prev) => {
          const next = { ...prev };
          const currentTracking = next[dateStr] ? [...next[dateStr]] : [];
          const entryIndex = currentTracking.findIndex((t) => t.habit_id === habitId);
          if (entryIndex >= 0) {
            currentTracking[entryIndex] = {
              ...currentTracking[entryIndex],
              amount: currentAmount,
            };
            next[dateStr] = currentTracking;
          }
          return next;
        });
      }
    },
    [habits]
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F5F7] overflow-hidden">
      
      {/* SECTION 1: STICKY DASHBOARD (UPPER HALF) */}
      <header className="flex-none bg-[#F5F5F7] border-b border-slate-200 px-4 pt-6 pb-5 z-20 shadow-sm relative">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Top Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-[#1D1D1F]">
                LifeOS
              </h1>
              
              {/* Minimalist Dropdown Year Selector */}
              <div className="relative inline-flex items-center bg-white/60 px-3 py-1 rounded-full border border-slate-200/50 shadow-inner backdrop-blur-md">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="appearance-none bg-transparent text-sm font-bold text-[#1D1D1F] pr-6 focus:outline-none cursor-pointer"
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                  <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
                  <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#86868B] absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Streak Stat Widget */}
            <div className="flex items-center gap-3 select-none">
              <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-full border border-slate-200/50 shadow-sm">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-xs font-bold text-[#1D1D1F]">
                  Racha: {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
                </span>
              </div>

              {/* Jump to Today Button */}
              <button
                onClick={scrollToToday}
                className="flex items-center gap-1 bg-[#34C759] hover:bg-[#30b551] text-white px-3.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Hoy
              </button>
            </div>
          </div>

          {/* Dynamic Month Columns Graph */}
          <div>
            <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider mb-2">
              Cumplimiento Promedio Mensual ({selectedYear})
            </p>
            
            <div className="flex items-end justify-between gap-1.5 bg-white/60 p-4 rounded-2xl border border-slate-200/30 shadow-inner h-28 backdrop-blur-md">
              {monthlyAverages.map((month) => (
                <div key={month.name} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30 transition-opacity">
                    <div className="bg-[#1D1D1F] text-white text-[9px] py-0.5 px-2 rounded-md font-bold shadow-md whitespace-nowrap">
                      {month.name}: {month.value}%
                    </div>
                    <div className="w-1 h-1 bg-[#1D1D1F] rotate-45 -mt-0.5" />
                  </div>

                  {/* Empty Background Column */}
                  <div className="w-full bg-slate-200/40 rounded-t-sm h-full flex items-end relative overflow-hidden">
                    {/* Fill Level */}
                    <div
                      className="w-full bg-[#34C759] rounded-t-sm transition-all duration-700 ease-out"
                      style={{ height: `${month.value}%` }}
                    />
                  </div>
                  
                  {/* Month Shortname */}
                  <span className="text-[9px] text-[#86868B] mt-1.5 font-bold uppercase tracking-wide">
                    {month.shortName}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </header>

      {/* SECTION 2: REGISTRY LIST (SCROLLABLE) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:pb-6"
      >
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden">
          
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34C759]" />
              <p className="text-sm font-semibold text-[#86868B] mt-4 font-sans">Cargando LifeOS...</p>
            </div>
          ) : habits.length === 0 ? (
            <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-[#86868B] mb-4 stroke-1" />
              <p className="text-base font-bold text-[#1D1D1F]">Sin hábitos para mostrar</p>
              <p className="text-xs text-[#86868B] mt-1.5 max-w-xs font-semibold">
                Crea tu primer hábito positivo o negativo en la pestaña de Hábitos para comenzar el registro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-4 text-left text-[11px] font-bold text-[#86868B] uppercase tracking-wider sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10 w-24">
                      Fecha
                    </th>
                    {habits.map((habit) => (
                      <th key={habit.id} className="py-3 px-2 text-center text-[11px] font-bold text-[#86868B] uppercase tracking-wider max-w-[120px] truncate">
                        {habit.name}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right pr-6 text-[11px] font-bold text-[#86868B] uppercase tracking-wider w-20">
                      % Éxito
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearDates.map((dateStr) => {
                    const isToday = dateStr === todayStr;
                    const tracking = logsMap[dateStr] || [];
                    
                    return (
                      <DayRow
                        key={dateStr}
                        dateStr={dateStr}
                        habits={habits}
                        tracking={tracking}
                        isToday={isToday}
                        onToggleHabit={handleToggleHabit}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
