import React from 'react';
import { motion } from 'framer-motion';
import XRayOverlay from './XRayOverlay';

import { type DailyLog } from '@/lib/schema';

interface DashboardTheme {
  background: string;
  accent: string;
  glass: string;
  text: string;
  subtext: string;
}

type DashboardMainProps = {
  isXRayMode: boolean;
  setRayXModeFromGesture?: (v: boolean) => void;
  isLoading: boolean;
  theme: DashboardTheme;
  displayLog: DailyLog;
  momentum: number;
  energyLevel: number;
  mentalClarity: number;
};

function clampMomentum(value: number) {
  return Math.min(100, Math.max(0, value));
}

function CircularMomentum({ value }: { value: number }) {
  const normalized = clampMomentum(value);
  const circumference = 2 * Math.PI * 44;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" stroke="rgba(148,163,184,0.22)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          stroke="url(#momentum-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          style={{ strokeDasharray: circumference }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (normalized / 100) * circumference }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <defs>
          <linearGradient id="momentum-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-900">{normalized}</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Momentum</span>
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardMain({
  isXRayMode,
  isLoading,
  theme,
  displayLog,
  momentum,
  energyLevel,
  mentalClarity,
}: DashboardMainProps) {
  return (
    <section className="relative mt-4 flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/20 shadow-[0_18px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <motion.div className="relative z-10 flex w-full flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          {isLoading ? (
            <div className="flex min-h-[16rem] w-full items-center justify-center rounded-[2rem] border border-dashed border-white/60 bg-white/30 px-4 text-center text-sm text-slate-600 sm:min-h-[20rem]">
              Cargando el último registro...
            </div>
          ) : null}

          <div className="mx-auto flex aspect-square w-[min(78vw,26rem)] items-center justify-center">
            <svg viewBox="0 0 520 520" className="h-full w-full">
              <defs>
                <linearGradient id="avatar-fill" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#dbeafe" />
                </linearGradient>
              </defs>
              <g>
                <path
                  d="M174 144c18-42 63-70 116-70 66 0 124 42 142 103 7 25 5 50-4 72 20 16 33 42 33 70 0 50-37 91-86 97-12 47-56 82-108 82s-96-35-108-82c-49-6-86-47-86-97 0-33 17-62 43-78-10-23-12-49-4-74 7-22 22-42 42-55z"
                  fill="url(#avatar-fill)"
                />
              </g>
            </svg>
          </div>

          <motion.div className="mt-6 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CircularMomentum value={momentum} />
            <MetricChip label="Energía física" value={`${energyLevel}/5`} />
            <MetricChip label="Claridad mental" value={`${mentalClarity}/5`} />
            <MetricChip label="Hidratación" value={`${displayLog.hidratacion_ml} ml`} />
          </motion.div>
        </motion.div>

        <XRayOverlay
          isXRayMode={isXRayMode}
          theme={theme}
          displayLog={displayLog}
          momentum={momentum}
        />
      </div>
    </section>
  );
}
