'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Shield, Snowflake, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getNormalizedDate } from '@/lib/date-utils';
import BottomSheet from './BottomSheet';

interface StreakCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
}

interface LogEntry {
  date: string;
  health_momentum: number;
  saved_by_shield: boolean;
}

export default function StreakCalendarModal({ isOpen, onClose, streak }: StreakCalendarModalProps) {
  const [shields, setShields] = useState(2);
  const [dailyLogs, setDailyLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const goToPrevMonth = () =>
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (next <= new Date()) setViewDate(next);
  };

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch shields
        const { data: profile } = await supabase
          .from('profiles')
          .select('shields_available')
          .eq('id', user.id)
          .maybeSingle();
        setShields(profile?.shields_available ?? 2);

        // Fetch daily logs for the viewed month
        const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

        const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-01`;
        const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('date, health_momentum, saved_by_shield')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr);

        setDailyLogs(logs || []);
      } catch (err) {
        console.error('Error fetching calendar stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [isOpen, viewDate]);

  // Calendar calculations
  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Shift starting index to start from Monday (0: Mon, ..., 6: Sun)
  const startingDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const todayStr = getNormalizedDate(new Date());

  const getDayStatus = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const log = dailyLogs.find((l) => l.date === dateStr);

    if (log) {
      if (log.saved_by_shield) {
        return 'shielded';
      }
      return log.health_momentum > 80 ? 'perfect' : 'failed';
    }

    // If day is past and has no log, it counts as failed
    const checkDate = new Date(year, month, dayNum);
    const comparisonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (checkDate < comparisonToday) {
      return 'failed';
    }

    return 'future';
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="El Santuario de la Racha">
      <div className="select-none">
        {/* Racha actual indicator */}
        <div className="text-center -mt-4 mb-4">
          <p className="text-sm font-semibold text-slate-500">
            Racha actual: <span className="text-orange-500 font-extrabold">{streak} días</span>
          </p>
        </div>

        {/* Inventory Box */}
        <div className="mt-6 bg-slate-50 border border-slate-200 p-4 rounded-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Shield className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 leading-tight">
                Escudos Protectores
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Evitan que pierdas tu racha si fallas un día
              </p>
            </div>
          </div>
          <span className="text-lg font-black tracking-tight text-slate-800 px-4 py-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
            🛡️ {shields}/2 Equipados
          </span>
        </div>

        {/* Month Header */}
        <div className="mt-8 mb-4 flex items-center justify-between px-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Mes anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h3 className="text-xl font-black tracking-tight text-slate-900 capitalize">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={goToNextMonth}
            disabled={new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) > new Date()}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mes siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex justify-center items-center h-10">
                  <div className="w-6 h-3 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center h-10">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Day Labels Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-400 mb-2">
              {dayLabels.map((lbl, idx) => (
                <div key={idx} className="w-10 h-10 flex items-center justify-center">
                  {lbl}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty offsets for starting day */}
              {Array.from({ length: startingDay }).map((_, idx) => (
                <div key={`empty-${idx}`} className="w-10 h-10" />
              ))}

              {/* Calendar Days */}
              {daysArray.map((dayNum) => {
                const status = getDayStatus(dayNum);
                const isToday = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` === todayStr;

                let dayStyle = 'bg-slate-55 text-slate-400';
                let dayIcon = null;

                if (status === 'perfect') {
                  dayStyle = 'bg-orange-500 text-white font-extrabold shadow-sm shadow-orange-500/20';
                  dayIcon = <Flame className="w-4.5 h-4.5 fill-current" />;
                } else if (status === 'shielded') {
                  dayStyle = 'bg-blue-50 text-blue-500 font-extrabold border border-blue-100';
                  dayIcon = <Snowflake className="w-4.5 h-4.5" />;
                } else if (status === 'failed') {
                  dayStyle = 'bg-slate-100 text-slate-400';
                  dayIcon = <span className="text-[10px] font-black">✕</span>;
                } else if (status === 'future') {
                  dayStyle = 'bg-transparent text-slate-400 border border-dashed border-slate-200';
                }

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`relative w-10 h-10 rounded-2xl flex flex-col items-center justify-center text-xs transition-transform hover:scale-105 ${dayStyle} ${
                      isToday ? 'ring-2 ring-offset-2 ring-orange-500' : ''
                    }`}
                  >
                    <span className={dayIcon ? 'text-[9px] font-bold leading-none' : 'font-bold'}>
                      {dayNum}
                    </span>
                    {dayIcon && (
                      <div className="mt-0.5 leading-none">
                        {dayIcon}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-orange-500 flex items-center justify-center text-white text-[8px]">🔥</span>
            <span>Perfecto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-500 flex items-center justify-center text-[8px]">❄️</span>
            <span>Salvado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-[8px]">✕</span>
            <span>Fallido</span>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
