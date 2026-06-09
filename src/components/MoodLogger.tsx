'use client';

import { useState, useTransition, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ArrowLeft } from 'lucide-react';
import { saveMoodEntry } from '@/app/mood/actions';
import toast from '@/lib/toast';
import { useHaptic } from '@/hooks/useHaptic';

/* ─── Types ────────────────────────────────────────────────────── */

interface MoodLoggerProps {
  onSaved?: () => void;
  existingEntry?: { mood_score: number; impact_factors: string[] } | null;
}

/* ─── Config ───────────────────────────────────────────────────── */

const MOOD_CONFIG: Record<number, { bg: string; text: string; label: string; emoji: string }> = {
  1: { bg: 'linear-gradient(135deg, #1e1b4b, #581c87, #0f172a)', text: 'text-white',     label: 'Muy Desagradable', emoji: '😔' },
  2: { bg: 'linear-gradient(135deg, #475569, #1d4ed8, #334155)', text: 'text-white',     label: 'Desagradable',     emoji: '😕' },
  3: { bg: 'linear-gradient(135deg, #e2e8f0, #d1fae5, #e2e8f0)', text: 'text-slate-800', label: 'Neutral',          emoji: '😐' },
  4: { bg: 'linear-gradient(135deg, #fde68a, #ffedd5, #fef3c7)', text: 'text-slate-800', label: 'Agradable',        emoji: '😊' },
  5: { bg: 'linear-gradient(135deg, #fb923c, #fcd34d, #fde047)', text: 'text-slate-900', label: 'Muy Agradable',    emoji: '😄' },
};

const IMPACT_FACTORS = [
  'Trabajo', 'Familia', 'Dinero', 'Sueño',
  'Nutrición', 'Ejercicio', 'Social', 'Salud',
] as const;

/* Dot ring colors per score (outer glow / ring) */
const DOT_RING: Record<number, string> = {
  1: 'rgba(139,92,246,0.5)',
  2: 'rgba(59,130,246,0.5)',
  3: 'rgba(16,185,129,0.45)',
  4: 'rgba(245,158,11,0.45)',
  5: 'rgba(249,115,22,0.5)',
};

/* ─── Component ────────────────────────────────────────────────── */

export default function MoodLogger({ onSaved, existingEntry }: MoodLoggerProps) {
  const haptic = useHaptic();
  const [step, setStep] = useState<'type' | 'log'>('type');
  const [moodScore, setMoodScore] = useState<number>(existingEntry?.mood_score ?? 0);
  const [selectedFactors, setSelectedFactors] = useState<string[]>(existingEntry?.impact_factors ?? []);
  const [isDailySummary, setIsDailySummary] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const hasSelectedMood = moodScore > 0;
  const config = MOOD_CONFIG[moodScore] ?? MOOD_CONFIG[3];

  /* ── Handlers ─────────────────────────────────────────────── */

  const handleMoodSelect = useCallback((score: number) => {
    setMoodScore(score);
    haptic.light();
  }, [haptic]);

  const toggleFactor = useCallback((factor: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factor)
        ? prev.filter((f) => f !== factor)
        : [...prev, factor],
    );
  }, []);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        await saveMoodEntry(moodScore, selectedFactors, undefined, isDailySummary);
        toast.success('Estado de ánimo guardado');
        onSaved?.();
      } catch {
        toast.error('Error al guardar. Inténtalo de nuevo.');
      }
    });
  }, [moodScore, selectedFactors, isDailySummary, onSaved]);

  const getConfirmationDateString = () => {
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const dayName = days[now.getDay()];
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${capitalizedDay}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  };

  /* ── Render ───────────────────────────────────────────────── */

  if (step === 'type') {
    return (
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-sm space-y-6 select-none">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Confirmar fecha de registro</span>
          <h3 className="text-lg font-black text-slate-800 capitalize">{getConfirmationDateString()}</h3>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 text-center">
            Selecciona el tipo de registro:
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                haptic.light();
                setIsDailySummary(false);
                setStep('log');
              }}
              className="w-full py-4 px-6 rounded-2xl border border-slate-200 bg-white text-left hover:bg-slate-50 transition active:scale-[0.98] group flex items-start gap-4 shadow-sm"
            >
              <span className="text-3xl p-2 bg-sky-50 rounded-xl group-hover:scale-110 transition duration-300">⚡</span>
              <div>
                <h4 className="text-sm font-black text-slate-800">Registro Puntual de este momento</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Captura cómo te sientes en este instante preciso.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                haptic.light();
                setIsDailySummary(true);
                setStep('log');
              }}
              className="w-full py-4 px-6 rounded-2xl border border-slate-200 bg-white text-left hover:bg-slate-50 transition active:scale-[0.98] group flex items-start gap-4 shadow-sm"
            >
              <span className="text-3xl p-2 bg-amber-50 rounded-xl group-hover:scale-110 transition duration-300">🌅</span>
              <div>
                <h4 className="text-sm font-black text-slate-800">Balance General del Día</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Reflexiona y evalúa el promedio emocional de toda tu jornada.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5">
      {/* Back button to return to type step */}
      <button
        onClick={() => {
          haptic.light();
          setStep('type');
        }}
        className="self-start text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
      >
        <ArrowLeft size={14} />
        Volver a selección de tipo ({isDailySummary ? 'Balance General' : 'Registro Puntual'})
      </button>

      {/* ─ Phase 1 · Emotional Slider Card ─────────────────── */}
      <motion.div
        layout
        className="relative overflow-hidden rounded-[2.5rem] shadow-xl"
        animate={{ background: hasSelectedMood ? config.bg : 'linear-gradient(135deg, #e2e8f0, #f1f5f9, #e2e8f0)' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Ambient shimmer layer */}
        <motion.div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, white 0%, transparent 50%), radial-gradient(circle at 70% 80%, white 0%, transparent 50%)',
          }}
          animate={{ opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col items-center px-8 py-10 gap-6">
          {/* Emoji + Label */}
          <AnimatePresence mode="wait">
            <motion.div
              key={moodScore}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.9 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-5xl select-none" role="img" aria-label={config.label}>
                {hasSelectedMood ? config.emoji : '🫥'}
              </span>
              <h2 className={`text-3xl font-black tracking-tight ${hasSelectedMood ? config.text : 'text-slate-400'}`}>
                {hasSelectedMood ? config.label : '¿Cómo te sientes?'}
              </h2>
            </motion.div>
          </AnimatePresence>

          {/* ─ Step Indicator Dots (clickable) ──────────────── */}
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((score) => {
              const isActive = score === moodScore;
              return (
                <motion.button
                  key={score}
                  type="button"
                  aria-label={MOOD_CONFIG[score].label}
                  onClick={() => handleMoodSelect(score)}
                  className="relative flex items-center justify-center focus:outline-none"
                  whileTap={{ scale: 0.85 }}
                >
                  {/* Glow ring behind active dot */}
                  {isActive && (
                    <motion.span
                      layoutId="mood-ring"
                      className="absolute rounded-full"
                      style={{
                        width: 44,
                        height: 44,
                        background: DOT_RING[score],
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    />
                  )}

                  <motion.span
                    animate={{
                      scale: isActive ? 1.35 : 1,
                      opacity: hasSelectedMood ? (isActive ? 1 : 0.45) : 0.55,
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                    className="relative z-10 block rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: hasSelectedMood
                        ? moodScore <= 2 ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.75)'
                        : 'rgba(148,163,184,0.6)',
                    }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Hidden range input for a11y / semantics */}
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={moodScore || 3}
            onChange={(e) => handleMoodSelect(Number(e.target.value))}
            className="sr-only"
            aria-label="Nivel de ánimo"
          />
        </div>
      </motion.div>

      {/* ─ Phase 2 · Impact Factors & Type Selector ────────── */}
      <AnimatePresence>
        {hasSelectedMood && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden space-y-4"
          >
            <div className="rounded-[2rem] bg-white border border-slate-200 shadow-md p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                ¿Qué influyó?
              </p>

              <div className="flex flex-wrap gap-2.5 mb-6">
                {IMPACT_FACTORS.map((factor) => {
                  const isSelected = selectedFactors.includes(factor);
                  return (
                    <motion.button
                      key={factor}
                      type="button"
                      onClick={() => toggleFactor(factor)}
                      whileTap={{ scale: 0.92 }}
                      animate={{
                        backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#475569',
                        borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative rounded-full border px-4 py-2 text-sm font-semibold transition-shadow hover:shadow-sm focus:outline-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <AnimatePresence mode="popLayout">
                          {isSelected && (
                            <motion.span
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 16, opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="inline-flex overflow-hidden"
                            >
                              <Check size={14} strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {factor}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 pt-2 border-t border-slate-100">
                ¿Tipo de Registro?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsDailySummary(false)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] ${!isDailySummary ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  ⚡ Registro puntual
                </button>
                <button
                  type="button"
                  onClick={() => setIsDailySummary(true)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] ${isDailySummary ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  🌅 Balance del día
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─ Phase 3 · Save Button ───────────────────────────── */}
      <AnimatePresence>
        {hasSelectedMood && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-lg
                         hover:bg-slate-800 active:bg-slate-950
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={20} className="animate-spin" />
                    Guardando…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    Guardar
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
