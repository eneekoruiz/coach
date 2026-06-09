'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
  Battery,
  Brain,
  CheckCircle2,
  Droplets,
  Loader2,
  MessageCircle,
  Moon,
  Utensils,
  Zap,
} from 'lucide-react';
import { type DailyLog } from '@/lib/schema';
import { triggerVibration } from '@/lib/haptics';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useTimeContext } from '@/hooks/useTimeContext';

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

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
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
  addWaterIntake,
  pendingSyncCount,
  onChatOpen,
}: DashboardMainProps) {
  const timeContext = useTimeContext();
  const [avatarMotion, setAvatarMotion] = useState<AvatarMotionState>('idle');
  const [waterBusy, setWaterBusy] = useState(false);
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
    } finally {
      setWaterBusy(false);
    }
  };

  const handleCoach = () => {
    triggerVibration('light');
    setAvatarMotion('success');
    onChatOpen?.();
  };

  const handleNightLog = () => {
    triggerVibration('medium');
    setAvatarMotion('success');
    onChatOpen?.();
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-5 py-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-emerald-600" />}
            {timeContext.greeting} · {timeContext.label}
          </div>

          <motion.div
            variants={avatarVariants}
            animate={avatarMotion}
            className={`relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm sm:h-56 sm:w-56 ${avatar.aura}`}
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

          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              BioAvatar State Machine
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              {avatar.label}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              {avatar.subLabel}
            </p>
          </div>

          <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleWater}
              disabled={waterBusy}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-cyan-400 disabled:opacity-70"
            >
              {waterBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
              +{defaultGlassSize}ml
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleCoach}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              <MessageCircle className="h-4 w-4" />
              Coach
            </motion.button>

            {timeContext.block === 'night' ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleNightLog}
                className="col-span-2 inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-700 transition hover:bg-violet-100 sm:col-span-1"
              >
                <Moon className="h-4 w-4" />
                Sueño/Ánimo
              </motion.button>
            ) : (
              <Link
                href="/nutrition"
                onClick={() => {
                  triggerVibration('light');
                  setAvatarMotion('success');
                }}
                className="col-span-2 inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 sm:col-span-1"
              >
                <Utensils className="h-4 w-4" />
                {timeContext.mealFocus}
              </Link>
            )}
          </div>

          {pendingSyncCount > 0 && (
            <p className="mt-3 text-[10px] font-bold text-amber-600">
              {pendingSyncCount} acción en cola. Se sincronizará al recuperar conexión.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Foco proactivo
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {timeContext.priority}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{primaryAction}</p>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Siguiente comida
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">{timeContext.mealFocus}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Coach contextual
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {insightText || timeContext.coachPrompt}
          </p>
          <button
            type="button"
            onClick={timeContext.block === 'night' ? handleNightLog : handleCoach}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 active:scale-95"
          >
            {timeContext.block === 'night' ? <Moon className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {timeContext.block === 'night' ? 'Registrar Sueño/Ánimo final' : 'Abrir Coach'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile
          label="Agua"
          value={`${waterMl}ml`}
          icon={<Droplets className="h-4 w-4 text-cyan-600" />}
        />
        <MetricTile
          label="Nutrición"
          value={`${kcalPercent}%`}
          icon={<Utensils className="h-4 w-4 text-emerald-600" />}
        />
        <MetricTile
          label="Energía"
          value={`${energyLevel}/5`}
          icon={<Battery className="h-4 w-4 text-amber-600" />}
        />
        <MetricTile
          label="Claridad"
          value={`${mentalClarity}/5`}
          icon={<Brain className="h-4 w-4 text-sky-600" />}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Hidratación</p>
            <p className="text-xs font-black text-cyan-600">{waterPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${waterPercent}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Inercia</p>
            <p className="text-xs font-black text-slate-900">{normalizedMomentum}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all duration-500" style={{ width: `${normalizedMomentum}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Inicio sin histórico: solo estado del día actual.
      </div>
    </main>
  );
}
