'use client';

import { useState, useMemo, useCallback, useEffect, useRef, startTransition, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, Plus, Trash, X, Loader2, Check } from 'lucide-react';
import { saveMoodEntry, deleteMoodEntry } from '@/app/mood/actions';
import toast from '@/lib/toast';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface MoodCalendarProps {
  entries: MoodEntry[];
  onDaySelect?: (date: string) => void;
  onSaved?: () => void;
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

const MOOD_CONFIG: Record<number, { bg: string; text: string; label: string; emoji: string }> = {
  1: { bg: 'linear-gradient(135deg, #1e1b4b, #581c87, #0f172a)', text: 'text-white',     label: 'Muy Desagradable', emoji: '😔' },
  2: { bg: 'linear-gradient(135deg, #475569, #1d4ed8, #334155)', text: 'text-white',     label: 'Desagradable',     emoji: '😕' },
  3: { bg: 'linear-gradient(135deg, #e2e8f0, #d1fae5, #e2e8f0)', text: 'text-slate-800', label: 'Neutral',          emoji: '😐' },
  4: { bg: 'linear-gradient(135deg, #fde68a, #ffedd5, #fef3c7)', text: 'text-slate-800', label: 'Agradable',        emoji: '😊' },
  5: { bg: 'linear-gradient(135deg, #fb923c, #fcd34d, #fde047)', text: 'text-slate-900', label: 'Muy Agradable',    emoji: '😄' },
};

const DOT_RING: Record<number, string> = {
  1: 'rgba(139,92,246,0.5)',
  2: 'rgba(59,130,246,0.5)',
  3: 'rgba(16,185,129,0.45)',
  4: 'rgba(245,158,11,0.45)',
  5: 'rgba(249,115,22,0.5)',
};

const IMPACT_FACTORS_LIST = [
  'Trabajo', 'Familia', 'Dinero', 'Sueño',
  'Nutrición', 'Ejercicio', 'Social', 'Salud',
];

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

export default function MoodCalendar({ entries, onDaySelect, onSaved }: MoodCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={calendarRef}
      className="rounded-[2.5rem] border border-white/80 bg-white/60 backdrop-blur-2xl p-7 shadow-[0_18px_55px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <Heart className="h-4 w-4 text-rose-400" />
        <span className="text-sm font-semibold text-slate-700 tracking-tight">
          Calendario de Ánimo Omnitemporal
        </span>
      </div>

      {/* ── Month navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          type="button"
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
          type="button"
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
            const dayEntries = entriesByDate.get(dateKey) || [];

            // Grab the daily summary or fallback to first entry
            const dailySummary = dayEntries.find((e) => e.is_daily_summary);
            const displayEntry = dailySummary || dayEntries[0];

            const isTodayCell = isToday(currentYear, currentMonth, day);
            const scoreVal = displayEntry ? (displayEntry.valence_score ?? displayEntry.mood_score ?? 3) : 3;
            const orb = dayEntries.length > 0 ? MOOD_ORBS[Math.round(scoreVal)] : null;

            return (
              <div key={dateKey} className="relative flex items-center justify-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setSelectedDay(dateKey);
                    setShowLogForm(dayEntries.length === 0);
                    if (onDaySelect) onDaySelect(dateKey);
                  }}
                  className={[
                    'relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer',
                    isTodayCell ? 'ring-[1.5px] ring-slate-900/80 font-bold' : '',
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
                      dayEntries.length > 0 ? 'text-slate-800' : 'text-slate-400 hover:text-slate-700',
                      isTodayCell ? 'text-slate-900 font-bold' : '',
                    ].join(' ')}
                  >
                    {day}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom Sheet/Modal Elegant ── */}
      <AnimatePresence>
        {selectedDay && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDay(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] border-t border-slate-200 shadow-2xl p-6 pb-10 z-10 max-h-[90vh] overflow-y-auto pt-[env(safe-area-inset-top)]"
            >
              {/* Pull indicator */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer" onClick={() => setSelectedDay(null)} />

              {/* Close Button always visible */}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="absolute top-4 right-4 p-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center z-20"
              >
                <X size={18} />
              </button>

              <div className="mt-6">
                <h3 className="text-xl font-black text-slate-950 tracking-tight mb-4">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>

                {/* Timeline view of logs */}
                {!showLogForm && selectedDateEntries.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Línea de tiempo de Ánimo</span>
                      <button
                        type="button"
                        onClick={() => setShowLogForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-semibold hover:bg-slate-800 transition min-h-[44px]"
                      >
                        <Plus size={12} /> Añadir registro
                      </button>
                    </div>

                    <div className="space-y-3">
                      {selectedDateEntries.map((entry) => {
                        const score = entry.valence_score ?? entry.mood_score ?? 3;
                        const labelInfo = MOOD_LABELS[Math.round(score)] || MOOD_LABELS[3];
                        const factors = entry.impact_tags ?? entry.impact_factors ?? [];

                        return (
                          <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{labelInfo.emoji}</span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-slate-800">{labelInfo.label}</span>
                                  {entry.is_daily_summary && (
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                      Balance Diario
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {formatTime(entry.created_at_timestamp || entry.logged_at)}
                                  </span>
                                </div>
                                {factors.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {factors.map((f) => (
                                      <span key={f} className="text-[9px] bg-white px-2 py-0.5 border border-slate-200/80 rounded-full text-slate-600 font-medium">
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => entry.id && handleDeleteEntry(entry.id)}
                              disabled={isPending}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Eliminar registro"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Form to log retroactively / add entry using Premium Slider */
                  <div className="mt-4 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">
                        {selectedDateEntries.length > 0 ? 'Añadir Nuevo Registro' : 'Añadir Registro Retroactivo'}
                      </span>
                      {selectedDateEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowLogForm(false)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 min-h-[44px] px-3"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {/* Premium Interpolating Mood Slider */}
                    <motion.div
                      layout
                      className="relative overflow-hidden rounded-[2rem] shadow-md p-6"
                      animate={{ 
                        background: retroScore > 0 
                          ? MOOD_CONFIG[retroScore].bg 
                          : 'linear-gradient(135deg, #e2e8f0, #f1f5f9, #e2e8f0)' 
                      }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={retroScore}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center gap-1.5"
                          >
                            <span className="text-4xl select-none" role="img">
                              {retroScore > 0 ? MOOD_CONFIG[retroScore].emoji : '🫥'}
                            </span>
                            <h4 className={`text-xl font-black tracking-tight ${retroScore > 0 ? MOOD_CONFIG[retroScore].text : 'text-slate-400'}`}>
                              {retroScore > 0 ? MOOD_CONFIG[retroScore].label : '¿Cómo fue tu ánimo?'}
                            </h4>
                          </motion.div>
                        </AnimatePresence>

                        {/* Interactive dots slider */}
                        <div className="flex items-center gap-3.5 mt-2">
                          {[1, 2, 3, 4, 5].map((score) => {
                            const isActive = score === retroScore;
                            return (
                              <button
                                key={score}
                                type="button"
                                onClick={() => setRetroScore(score)}
                                className="relative flex items-center justify-center focus:outline-none min-h-[44px] min-w-[44px]"
                              >
                                {isActive && (
                                  <motion.span
                                    layoutId="retro-mood-ring"
                                    className="absolute rounded-full"
                                    style={{
                                      width: 32,
                                      height: 32,
                                      background: DOT_RING[score],
                                    }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                                  />
                                )}
                                <span
                                  className="relative z-10 block rounded-full transition-transform duration-200"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: retroScore > 0
                                      ? retroScore <= 2 ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.75)'
                                      : 'rgba(148,163,184,0.6)',
                                    transform: isActive ? 'scale(1.3)' : 'scale(1)'
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>

                    {/* Impact factors list */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">¿Qué factores influyeron?</span>
                      <div className="flex flex-wrap gap-2">
                        {IMPACT_FACTORS_LIST.map((factor) => {
                          const isSelected = retroFactors.includes(factor);
                          return (
                            <button
                              key={factor}
                              type="button"
                              onClick={() => toggleFactor(factor)}
                              className={[
                                'px-3.5 py-2 rounded-full text-xs font-semibold border transition min-h-[44px]',
                                isSelected ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                              ].join(' ')}
                            >
                              {factor}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggle daily summary */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Establecer como Balance Diario</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Define el color del orbe en el calendario para este día.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={retroIsSummary}
                        onChange={(e) => setRetroIsSummary(e.target.checked)}
                        className="h-5 w-5 text-slate-900 focus:ring-slate-900 border-slate-300 rounded"
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      type="button"
                      disabled={retroScore === 0 || isPending}
                      onClick={handleSaveRetro}
                      className="w-full py-4 bg-slate-950 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-900 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                    >
                      {isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Guardando...
                        </>
                      ) : (
                        'Guardar Registro'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
