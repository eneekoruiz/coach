'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Battery, Brain, Droplets, Loader2, MessageCircle, Scale, Zap, X, ChevronRight, Sparkles } from 'lucide-react';
import { type DailyLog } from '@/lib/schema';
import { triggerVibration } from '@/lib/haptics';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useTimeContext } from '@/hooks/useTimeContext';
import { useRouter } from 'next/navigation';
import WeightLogSheet from '@/components/WeightLogSheet';

interface DashboardTheme {
  background: string;
  accent: string;
  glass: string;
  text: string;
  subtext: string;
}

type AvatarMotionState = 'idle' | 'success' | 'action';

type DashboardMainProps = {
  isLoading: boolean;
  theme: DashboardTheme;
  displayLog: DailyLog;
  momentum: number;
  energyLevel: number;
  mentalClarity: number;
  insightText: string;
  dailyWaterTarget: number;
  dietTargets: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  addWaterIntake: (delta?: number) => Promise<void>;
  pendingSyncCount: number;
  smartTrigger: {
    id: string;
    title: string;
    body: string;
    cta?: string;
  } | null;
  onChatOpen?: () => void;
};

const avatarVariants: Variants = {
  idle: {
    y: [0, -4, 0],
    scale: [1, 1.015, 1],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  success: {
    y: [0, -10, 0],
    scale: [1, 1.08, 1],
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
  action: {
    rotate: [0, -2, 2, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

const WATER_STEP_ML = 250;
const MAX_DAILY_WATER_ML = 10000;

function clampPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function WaterIntakeModal({
  open,
  amount,
  max,
  busy,
  onClose,
  onDelta,
}: {
  open: boolean;
  amount: number;
  max: number;
  busy: boolean;
  onClose: () => void;
  onDelta: (delta: number) => Promise<void>;
}) {
  const currentPercent = clampPercent(amount, max);
  const canDecrease = amount > 0 && !busy;
  const canIncrease = amount < MAX_DAILY_WATER_ML && !busy;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/25 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-2xl backdrop-blur-2xl"
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.96 }}
            onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-500">Hidratación</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Registrar agua</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="relative h-44 w-28 overflow-hidden rounded-b-[2rem] rounded-t-xl border-[7px] border-slate-100 bg-white shadow-inner">
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-sky-300"
                  initial={{ height: `${currentPercent}%` }}
                  animate={{ height: `${currentPercent}%` }}
                  transition={{ type: 'spring', stiffness: 55, damping: 16 }}
                />
                <motion.div
                  className="absolute inset-x-0 top-1/3 h-12 bg-white/20"
                  animate={{ x: [-24, 24, -24] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <p className="rounded-full bg-white/85 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    {currentPercent}%
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                {amount} <span className="text-sm font-bold text-slate-400">ml</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Paso fijo de 250ml · máximo {MAX_DAILY_WATER_ML}ml/día</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void onDelta(-WATER_STEP_ML)}
                disabled={!canDecrease}
                className="h-12 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-wider text-slate-700 transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95 disabled:opacity-40"
              >
                -250ml
              </button>
              <button
                type="button"
                onClick={() => void onDelta(WATER_STEP_ML)}
                disabled={!canIncrease}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-sm font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-cyan-400 active:scale-95 disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                +250ml
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function DashboardMain({
  isLoading,
  displayLog,
  momentum,
  energyLevel,
  mentalClarity,
  insightText,
  dailyWaterTarget,
  dietTargets,
  addWaterIntake,
  pendingSyncCount,
  smartTrigger,
  onChatOpen,
}: DashboardMainProps) {
  const router = useRouter();
  const timeContext = useTimeContext();
  const [avatarMotion, setAvatarMotion] = useState<AvatarMotionState>('idle');
  const [waterBusy, setWaterBusy] = useState(false);
  const [isWaterOpen, setIsWaterOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const {
    normalizedMomentum,
    waterMl,
    completedHabitsCount,
    avatar,
  } = useDashboardState({
    momentum,
    displayLog,
    dietTargets,
    dailyWaterTarget,
  });

  useEffect(() => {
    if (avatarMotion === 'idle') return;
    const timeout = window.setTimeout(() => setAvatarMotion('idle'), 700);
    return () => window.clearTimeout(timeout);
  }, [avatarMotion]);

  const waterPercent = clampPercent(waterMl, dailyWaterTarget);
  const kcalPercent = clampPercent(displayLog.total_kcal ?? 0, dietTargets.kcal);

  const primaryAction = useMemo(() => {
    if (timeContext.block === 'morning') {
      return displayLog.metricas?.accion_manana || 'Completa la primera rutina y registra el desayuno.';
    }
    if (timeContext.block === 'afternoon') {
      return `Hidratación al ${waterPercent}%. Mantén el ritmo antes de la merienda.`;
    }
    return `Cierre del día: ${completedHabitsCount} acciones registradas. Añade sueño o ánimo final.`;
  }, [completedHabitsCount, displayLog.metricas?.accion_manana, timeContext.block, waterPercent]);

  const handleWater = async (delta: number = WATER_STEP_ML) => {
    triggerVibration('success');
    setAvatarMotion('action');
    setWaterBusy(true);
    try {
      await addWaterIntake(delta);
      setAvatarMotion('success');
    } finally {
      setWaterBusy(false);
    }
  };

  const handleCoach = () => {
    triggerVibration('light');
    setAvatarMotion('success');
    onChatOpen?.();
  };

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-4xl flex-col justify-start gap-2 overflow-hidden px-2 py-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-3 md:pb-4">
      <section className="relative w-full rounded-[1.25rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 flex w-full flex-wrap items-center justify-center gap-1.5">
            <div className="inline-flex min-h-[24px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-emerald-600" />}
              {timeContext.greeting} · {timeContext.label}
            </div>
            <div className="inline-flex min-h-[24px] items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700">
              Bienestar {normalizedMomentum}%
            </div>
          </div>

          <motion.div
            variants={avatarVariants}
            animate={avatarMotion}
            className={`relative flex h-24 w-full max-w-[20rem] items-center justify-center overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm sm:h-28 lg:h-32 ${avatar.aura}`}
          >
            <img
              src={avatar.url}
              alt="Bio-Avatar"
              className="h-full w-full object-cover"
              loading="eager"
              onError={(event) => {
                (event.target as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
          </motion.div>

          <div className="mt-1.5">
            <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              {avatar.label}
            </h1>
            <p className="mx-auto mt-0.5 max-w-md text-[10px] leading-snug text-slate-500">
              {avatar.subLabel}
            </p>
          </div>

          {smartTrigger ? (
            <motion.div
              key={smartTrigger.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-2 w-full max-w-lg rounded-[1rem] border border-cyan-100 bg-cyan-50/80 p-2 text-left shadow-sm"
            >
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-700">
                {smartTrigger.title}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-normal text-slate-700">
                {smartTrigger.body}
              </p>
              {smartTrigger.cta ? (
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                  {smartTrigger.cta}
                </p>
              ) : null}
            </motion.div>
          ) : null}

          <div className="mt-2 grid w-full max-w-lg grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleCoach}
              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-800"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Coach
            </motion.button>
            <button
              type="button"
              onClick={() => {
                triggerVibration('light');
                setIsWeightOpen(true);
              }}
              className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-95"
            >
              <Scale className="h-3.5 w-3.5" />
              Peso de hoy
            </button>
          </div>

          {pendingSyncCount > 0 && (
            <p className="mt-2 text-[9px] font-bold text-amber-600">
              {pendingSyncCount} acción en cola. Se sincronizará al recuperar conexión.
            </p>
          )}
        </div>
      </section>

      <section className="grid w-full grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            Foco proactivo
          </p>
          <h2 className="mt-0.5 text-base font-black tracking-tight text-slate-900">
            {timeContext.priority}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-normal text-slate-600">{primaryAction}</p>
        </div>

        <div className="relative w-full rounded-2xl border border-cyan-100 bg-cyan-50 p-2.5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-600">
                Agua unificada
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-slate-950">
                {waterMl}/{dailyWaterTarget}ml
              </p>
            </div>
            <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:items-center">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => void handleWater(-WATER_STEP_ML)}
                disabled={waterBusy || waterMl <= 0}
                className="inline-flex h-9 min-w-[64px] items-center justify-center rounded-xl border border-cyan-200 bg-white px-2.5 text-xs font-black text-cyan-700 shadow-sm transition-all duration-200 ease-in-out hover:bg-cyan-50 disabled:opacity-40"
              >
                -250ml
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => void handleWater(WATER_STEP_ML)}
                disabled={waterBusy || waterMl >= MAX_DAILY_WATER_ML}
                className="inline-flex h-9 min-w-[64px] items-center justify-center gap-1 rounded-xl bg-cyan-500 px-2.5 text-xs font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-cyan-400 disabled:opacity-70"
              >
                {waterBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplets className="h-3.5 w-3.5" />}
                +250ml
              </motion.button>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${waterPercent}%` }} />
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
            {insightText || timeContext.coachPrompt}
          </p>
        </div>
      </section>

      <section className="grid w-full grid-cols-3 gap-2">
        <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-sm">
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
            <Battery className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Energía</p>
          <p className="mt-0.5 text-sm font-black tracking-tight text-slate-900">{energyLevel}/5</p>
        </div>
        <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-sm">
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
            <Brain className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Claridad</p>
          <p className="mt-0.5 text-sm font-black tracking-tight text-slate-900">{mentalClarity}/5</p>
        </div>
        <div className="relative w-full rounded-2xl border border-slate-200 bg-white p-2 sm:p-2.5 shadow-sm">
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Nutri</p>
          <p className="mt-0.5 text-sm font-black tracking-tight text-slate-900">{kcalPercent}%</p>
        </div>
      </section>

      <section className="relative w-full rounded-[1.25rem] border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-indigo-700">
              <Sparkles className="h-2.5 w-2.5" /> Gamificación
            </div>
            <h2 className="mt-1 text-sm font-black tracking-tight text-slate-950">Knowledge Quest</h2>
            <p className="mt-0.5 hidden text-[10px] leading-relaxed text-slate-600 sm:block">
              Domina tus metas y conceptos de aprendizaje en nuestro mapa interactivo de quizzes generados por IA.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerVibration('light');
              router.push('/quest');
            }}
            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white shadow-sm hover:bg-indigo-500 transition-colors shrink-0"
          >
            Jugar
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </section>

      <WaterIntakeModal
        open={isWaterOpen}
        amount={waterMl}
        max={dailyWaterTarget}
        busy={waterBusy}
        onClose={() => setIsWaterOpen(false)}
        onDelta={handleWater}
      />
      <WeightLogSheet isOpen={isWeightOpen} onClose={() => setIsWeightOpen(false)} />
    </main>
  );
}
