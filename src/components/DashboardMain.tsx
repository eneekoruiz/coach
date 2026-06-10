'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Battery, Brain, Droplets, Loader2, MessageCircle, Scale, Zap, X } from 'lucide-react';
import { type DailyLog } from '@/lib/schema';
import { triggerVibration } from '@/lib/haptics';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useTimeContext } from '@/hooks/useTimeContext';
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
  defaultGlassSize: number;
  dietTargets: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  updateWaterSettings: (target: number, glass: number) => Promise<boolean>;
  addWaterIntake: () => Promise<void>;
  pendingSyncCount: number;
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

function clampPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function WaterIntakeModal({
  open,
  amount,
  max,
  glass,
  busy,
  onClose,
  onConfirm,
  onSaveSettings,
}: {
  open: boolean;
  amount: number;
  max: number;
  glass: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onSaveSettings: (target: number, glass: number) => Promise<boolean>;
}) {
  const [targetInput, setTargetInput] = useState(max);
  const [glassInput, setGlassInput] = useState(glass);
  const nextAmount = amount + glass;
  const currentPercent = clampPercent(amount, max);
  const nextPercent = clampPercent(nextAmount, max);

  useEffect(() => {
    setTargetInput(max);
    setGlassInput(glass);
  }, [glass, max]);

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
                  animate={{ height: `${nextPercent}%` }}
                  transition={{ type: 'spring', stiffness: 55, damping: 16 }}
                />
                <motion.div
                  className="absolute inset-x-0 top-1/3 h-12 bg-white/20"
                  animate={{ x: [-24, 24, -24] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <p className="rounded-full bg-white/85 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    {nextPercent}%
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                {amount} <span className="text-sm font-bold text-slate-400">ml</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">+{glass}ml ahora · meta {max}ml</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Meta</span>
                <input
                  type="number"
                  value={targetInput}
                  onChange={(event) => setTargetInput(Number(event.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vaso</span>
                <input
                  type="number"
                  value={glassInput}
                  onChange={(event) => setGlassInput(Number(event.target.value))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:bg-white"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <button
                type="button"
                onClick={() => void onSaveSettings(targetInput, glassInput)}
                className="h-12 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-wider text-slate-600 transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95"
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-sm font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-cyan-400 active:scale-95 disabled:opacity-70"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
                Confirmar +{glass}ml
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
  defaultGlassSize,
  dietTargets,
  updateWaterSettings,
  addWaterIntake,
  pendingSyncCount,
  onChatOpen,
}: DashboardMainProps) {
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

  const handleWater = async () => {
    triggerVibration('success');
    setAvatarMotion('action');
    setWaterBusy(true);
    try {
      await addWaterIntake();
      setAvatarMotion('success');
      setIsWaterOpen(false);
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
    <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col justify-center gap-3 overflow-hidden px-1 py-1 sm:gap-4">
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-xl">
        Bienestar {normalizedMomentum}%
      </div>

      <section className="min-h-0 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-emerald-600" />}
            {timeContext.greeting} · {timeContext.label}
          </div>

          <motion.div
            variants={avatarVariants}
            animate={avatarMotion}
            className={`relative flex h-40 w-full max-w-[22rem] items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm sm:h-44 lg:h-48 ${avatar.aura}`}
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
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/60"
              animate={avatarMotion === 'success' ? { opacity: [0, 1, 0], scale: [0.94, 1.05, 1.12] } : { opacity: 0 }}
              transition={{ duration: 0.55 }}
            />
          </motion.div>

          <div className="mt-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {avatar.label}
            </h1>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              {avatar.subLabel}
            </p>
          </div>

          <div className="mt-3 flex w-full max-w-lg flex-col gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleCoach}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-slate-800"
            >
              <MessageCircle className="h-4 w-4" />
              Hablar con el Coach
            </motion.button>
            <button
              type="button"
              onClick={() => {
                triggerVibration('light');
                setIsWeightOpen(true);
              }}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-95"
            >
              <Scale className="h-4 w-4" />
              Peso de hoy
            </button>
          </div>

          {pendingSyncCount > 0 && (
            <p className="mt-3 text-[10px] font-bold text-amber-600">
              {pendingSyncCount} acción en cola. Se sincronizará al recuperar conexión.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Foco proactivo
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
            {timeContext.priority}
          </h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{primaryAction}</p>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">
                Agua unificada
              </p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
                {waterMl}/{dailyWaterTarget}ml
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                triggerVibration('light');
                setIsWaterOpen(true);
              }}
              disabled={waterBusy}
              className="inline-flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 text-xs font-black text-white shadow-sm transition-all duration-200 ease-in-out hover:bg-cyan-400 disabled:opacity-70"
            >
              {waterBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
              +{defaultGlassSize}ml
            </motion.button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${waterPercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {insightText || timeContext.coachPrompt}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <Battery className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Energía</p>
          <p className="mt-0.5 text-base font-black tracking-tight text-slate-900">{energyLevel}/5</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <Brain className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Claridad</p>
          <p className="mt-0.5 text-base font-black tracking-tight text-slate-900">{mentalClarity}/5</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Nutrición</p>
          <p className="mt-0.5 text-base font-black tracking-tight text-slate-900">{kcalPercent}%</p>
        </div>
      </section>

      <WaterIntakeModal
        open={isWaterOpen}
        amount={waterMl}
        max={dailyWaterTarget}
        glass={defaultGlassSize}
        busy={waterBusy}
        onClose={() => setIsWaterOpen(false)}
        onConfirm={handleWater}
        onSaveSettings={updateWaterSettings}
      />
      <WeightLogSheet isOpen={isWeightOpen} onClose={() => setIsWeightOpen(false)} />
    </main>
  );
}
