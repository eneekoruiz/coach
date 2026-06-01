'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import XRayOverlay from './XRayOverlay';
import CircularProgressRing from './CircularProgressRing';
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
  insightText: string;
};

function clampMomentum(value: number) {
  return Math.min(100, Math.max(0, value));
}

function WaterGlass({ amount, max = 2000 }: { amount: number; max?: number }) {
  const percentage = Math.min(100, Math.max(0, (amount / max) * 100));

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md transition duration-200 select-none min-w-[7.5rem]">
      <div className="relative w-16 h-24 border-4 border-slate-300/80 rounded-b-2xl rounded-t-md overflow-hidden bg-slate-50 shadow-inner flex items-end">
        {/* Liquid wave representation */}
        <motion.div
          className="w-full bg-gradient-to-t from-sky-600 via-sky-400 to-cyan-300"
          initial={{ height: '0%' }}
          animate={{ height: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 40, damping: 12 }}
        />
        {/* Label Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[13px] font-extrabold text-slate-800 bg-white/50 px-1.5 py-0.5 rounded-full backdrop-blur-xs leading-none">
            {amount}
            <span className="text-[8px] font-medium ml-0.5">ml</span>
          </span>
          <span className="text-[9px] font-bold text-slate-500 mt-1">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
        Agua
      </span>
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
  insightText,
}: DashboardMainProps) {
  const normalizedMomentum = clampMomentum(momentum);

  const avatarUrl = useMemo(() => {
    // Tier 3: health_momentum > 80 (happy, strong, bright dog)
    if (normalizedMomentum > 80) {
      return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20strong,%20healthy,%20glowing%20coat,%20happy%20face,%20sitting%20proudly%20in%20a%20sunny%20meadow,%20high%20detail,%20warm%20lighting,%20no%20text?width=512&height=512&nologo=true';
    }
    // Tier 2: health_momentum 31-80 (neutral, balanced, calm dog)
    if (normalizedMomentum > 30) {
      return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20calm,%20neutral%20expression,%20balanced,%20natural%20forest,%20soft%20morning%20light,%20high%20detail,%20no%20text?width=512&height=512&nologo=true';
    }
    // Tier 1: health_momentum <= 30 (sad, tired, weak dog in shadows)
    return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20sad,%20tired,%20weak,%20lying%20down%20in%20dark%20shadows,%20somber%20mood,%20misty%20environment,%20high%20detail,%20no%20text?width=512&height=512&nologo=true';
  }, [normalizedMomentum]);

  return (
    <section className="relative mt-4 flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/20 shadow-[0_18px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <motion.div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {isLoading ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[2rem] bg-white/80 backdrop-blur-md text-sm text-slate-600 font-semibold">
              Cargando el último registro...
            </div>
          ) : null}

          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl">
            {/* Col 1: Bio-Avatar & Health Status */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-full border-[6px] border-white/90 shadow-xl bg-white/40 backdrop-blur-xs flex items-center justify-center group">
                <img
                  src={avatarUrl}
                  alt="Bio-Avatar"
                  className="w-full h-full object-cover transition-all duration-700 transform group-hover:scale-105"
                  loading="eager"
                />
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-800 tracking-tight">
                {normalizedMomentum > 80 ? '¡Excelente Salud!' : normalizedMomentum > 30 ? 'Salud Estable' : '¡Estado Crítico!'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                {normalizedMomentum > 80
                  ? 'Tu mascota está llena de vida, fuerte y feliz gracias a tus excelentes hábitos de hoy.'
                  : normalizedMomentum > 30
                  ? 'Tu mascota se mantiene estable, pero puedes mejorar el registro de hábitos para energizarla.'
                  : '¡Tu mascota está enferma y en peligro! Registra agua y comida sana urgentemente para salvarla.'}
              </p>

              {/* Pro-active Coach Insights Banner */}
              <div className="mt-4 w-full max-w-xs rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-left flex gap-2.5 items-start shadow-xs">
                <span className="text-base leading-none mt-0.5">💡</span>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-sky-600 font-extrabold">Consejo del Bio-Avatar</p>
                  <p className="mt-1 text-[11px] text-slate-700 font-semibold leading-relaxed">
                    {insightText}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3.5 justify-center">
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 text-center min-w-[5.5rem] shadow-xs">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Energía</p>
                  <p className="text-sm font-extrabold text-slate-800">{energyLevel}/5</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 text-center min-w-[5.5rem] shadow-xs">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Claridad</p>
                  <p className="text-sm font-extrabold text-slate-800">{mentalClarity}/5</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2 text-center min-w-[5.5rem] shadow-xs">
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Inercia</p>
                  <p className="text-sm font-extrabold text-slate-800">{normalizedMomentum}%</p>
                </div>
              </div>
            </div>

            {/* Col 2: Apple Watch Style Nutrition rings & Reactive Water */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Resumen de Hoy</p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">Nutrición y Hábitos</h2>
              </div>

              {/* Progress Rings Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <CircularProgressRing
                  value={displayLog.total_kcal}
                  max={2000}
                  label="Calorías"
                  unit="kcal"
                  colorClass="stroke-rose-500"
                  icon={
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                    </svg>
                  }
                />
                <CircularProgressRing
                  value={displayLog.protein_g}
                  max={150}
                  label="Proteína"
                  unit="g"
                  colorClass="stroke-emerald-500"
                  icon={
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  }
                />
                <CircularProgressRing
                  value={displayLog.carbs_g}
                  max={200}
                  label="Carbos"
                  unit="g"
                  colorClass="stroke-cyan-500"
                  icon={
                    <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.342 6 9.3 6 10.428v4.293c0 1.128.845 2.086 1.976 2.112 2.654.062 5.394.062 8.048 0 1.131-.026 1.976-1.084 1.976-2.212v-4.293c0-1.128-.845-2.086-1.976-2.112A48.243 48.243 0 0 0 12 8.25Z" />
                    </svg>
                  }
                />
                <CircularProgressRing
                  value={displayLog.fats_g}
                  max={70}
                  label="Grasa"
                  unit="g"
                  colorClass="stroke-amber-500"
                  icon={
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>

              {/* Water glass & Habits display */}
              <div className="flex gap-4 items-stretch flex-col sm:flex-row">
                <WaterGlass amount={displayLog.water_ml} />

                <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-sm min-h-[8.5rem]">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Hábitos Acumulados</p>
                    <div className="mt-2.5 space-y-1.5 overflow-y-auto max-h-[5.5rem] pr-1">
                      {Object.entries(displayLog.habits_count || {}).length > 0 ? (
                        Object.entries(displayLog.habits_count).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50/60 px-2.5 py-1 rounded-lg border border-slate-100/80">
                            <span className="font-semibold capitalize text-slate-700">{key.replace('_', ' ')}</span>
                            <span className="bg-slate-200/80 px-2 py-0.5 rounded-full font-black text-slate-800 text-[10px]">{val}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Sin hábitos registrados hoy.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Inercia acumulada</span>
                    <span className="text-slate-600 font-extrabold">{displayLog.metricas.variacion_inercia >= 0 ? `+${displayLog.metricas.variacion_inercia}` : displayLog.metricas.variacion_inercia} pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
