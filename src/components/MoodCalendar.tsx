'use client';

import { useState, useMemo, useCallback, useEffect, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MoodEntry {
  date: string;
  mood_score: number;
  impact_factors: string[];
}

interface MoodCalendarProps {
  entries: MoodEntry[];
  onDaySelect?: (date: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MOOD_ORBS: Record<number, { gradient: string; glow: string; ring: string }> = {
  1: {
    gradient: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(67,56,202,0.3) 50%, transparent 80%)',
    glow: 'shadow-[0_0_18px_rgba(99,102,241,0.4)]',
    ring: 'ring-indigo-400/30',
  },
  2: {
    gradient: 'radial-gradient(circle, rgba(96,165,250,0.45) 0%, rgba(59,130,246,0.2) 50%, transparent 80%)',
    glow: 'shadow-[0_0_16px_rgba(96,165,250,0.35)]',
    ring: 'ring-blue-400/25',
  },
  3: {
    gradient: 'radial-gradient(circle, rgba(167,243,208,0.5) 0%, rgba(110,231,183,0.25) 50%, transparent 80%)',
    glow: 'shadow-[0_0_14px_rgba(110,231,183,0.3)]',
    ring: 'ring-emerald-300/25',
  },
  4: {
    gradient: 'radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(251,191,36,0.3) 50%, transparent 80%)',
    glow: 'shadow-[0_0_18px_rgba(251,191,36,0.4)]',
    ring: 'ring-amber-300/30',
  },
  5: {
    gradient: 'radial-gradient(circle, rgba(251,146,60,0.6) 0%, rgba(245,158,11,0.35) 50%, transparent 80%)',
    glow: 'shadow-[0_0_22px_rgba(251,146,60,0.5)]',
    ring: 'ring-orange-400/35',
  },
};

const MOOD_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Muy Desagradable', emoji: '😔' },
  2: { label: 'Desagradable', emoji: '😕' },
  3: { label: 'Neutral', emoji: '😐' },
  4: { label: 'Agradable', emoji: '😊' },
  5: { label: 'Muy Agradable', emoji: '😄' },
};

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

// ─── Slide animation variants ────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoodCalendar({ entries, onDaySelect }: MoodCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  const entryMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const entry of entries) map.set(entry.date, entry);
    return map;
  }, [entries]);

  // Close tooltip on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        startTransition(() => {
          setSelectedDay(null);
        });
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateMonth = useCallback((delta: number) => {
    startTransition(() => {
      setSelectedDay(null);
      setDirection(delta);
      setCurrentMonth((prev) => {
        let newMonth = prev + delta;
        let newYear = currentYear;
        if (newMonth < 0) { newMonth = 11; newYear -= 1; }
        else if (newMonth > 11) { newMonth = 0; newYear += 1; }
        setCurrentYear(newYear);
        return newMonth;
      });
    });
  }, [currentYear]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);

  const cells: (number | null)[] = useMemo(() => {
    const result: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(d);
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [firstDayOffset, daysInMonth]);

  const monthKey = `${currentYear}-${currentMonth}`;

  return (
    <div
      ref={calendarRef}
      className="rounded-[2.5rem] border border-white/80 bg-white/60 backdrop-blur-2xl p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <Heart className="h-4 w-4 text-rose-400" />
        <span className="text-sm font-semibold text-slate-700 tracking-tight">
          Estado de Ánimo
        </span>
      </div>

      {/* ── Month navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => navigateMonth(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100/60 hover:bg-slate-200/70 transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </motion.button>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.span
            key={monthKey}
            custom={direction}
            initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
            transition={{ duration: 0.2 }}
            className="text-base font-bold text-slate-800 tracking-tight"
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </motion.span>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => navigateMonth(1)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100/60 hover:bg-slate-200/70 transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </motion.button>
      </div>

      {/* ── Weekday headers ────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="flex items-center justify-center h-8 text-xs font-semibold tracking-widest text-gray-400 uppercase text-center"
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Calendar grid with slide transition ────────────────────────── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={monthKey}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
          className="grid grid-cols-7 gap-y-1"
        >
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="w-full aspect-square" />;
            }

            const dateKey = toDateKey(currentYear, currentMonth, day);
            const entry = entryMap.get(dateKey);
            const isTodayCell = isToday(currentYear, currentMonth, day);
            const isSelected = selectedDay === dateKey;
            const orb = entry ? MOOD_ORBS[entry.mood_score] : null;

            return (
              <div key={dateKey} className="relative flex items-center justify-center">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    startTransition(() => {
                      if (entry) {
                        setSelectedDay(isSelected ? null : dateKey);
                        if (onDaySelect) onDaySelect(dateKey);
                      } else {
                        setSelectedDay(null);
                      }
                    });
                  }}
                  className={[
                    'relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200',
                    isTodayCell && !entry ? 'ring-[1.5px] ring-slate-900/80' : '',
                    entry ? 'cursor-pointer' : 'cursor-default',
                  ].join(' ')}
                >
                  {/* ── Orb glow behind the number ──────────────────────── */}
                  {orb && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={[
                        'absolute inset-0 rounded-full blur-[6px]',
                        orb.glow,
                        isTodayCell ? `ring-2 ${orb.ring}` : '',
                      ].join(' ')}
                      style={{ background: orb.gradient }}
                    />
                  )}

                  {/* ── Day number ──────────────────────────────────────── */}
                  <span
                    className={[
                      'relative z-10 text-sm font-medium tabular-nums',
                      entry ? 'text-slate-800' : 'text-gray-300',
                      isTodayCell && !entry ? 'text-slate-900 font-bold' : '',
                    ].join(' ')}
                  >
                    {day}
                  </span>
                </motion.button>

                {/* ── iOS Popover ──────────────────────────────────────── */}
                <AnimatePresence>
                  {isSelected && entry && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: -6 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="absolute top-full mt-3 z-50 min-w-[180px] rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-4 shadow-xl shadow-slate-200/50"
                    >
                      {/* Caret */}
                      <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white/80 backdrop-blur-md border-l border-t border-white/20" />

                      {/* Mood header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl leading-none">
                          {MOOD_LABELS[entry.mood_score]?.emoji}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">
                            {MOOD_LABELS[entry.mood_score]?.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-ES', {
                              day: 'numeric', month: 'long',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Impact factor pills */}
                      {entry.impact_factors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.impact_factors.map((factor) => (
                            <span
                              key={factor}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-semibold text-slate-600 backdrop-blur-sm"
                            >
                              <span className="text-[8px] text-slate-400">✦</span>
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
