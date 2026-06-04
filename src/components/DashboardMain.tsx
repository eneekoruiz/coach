'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import XRayOverlay from './XRayOverlay';
import CircularProgressRing from './CircularProgressRing';
import { type DailyLog } from '@/lib/schema';
import toast from '@/lib/toast';
import PushNotificationManager from './PushNotificationManager';
import { triggerVibration } from '@/lib/haptics';

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
  streak: number;
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
};

function clampMomentum(value: number) {
  return Math.min(100, Math.max(0, value));
}

// Reusable Bento Card wrapper
function BentoCard({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100/50 p-5 sm:p-6 overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function WaterGlass({ 
  amount, 
  max, 
  defaultGlass, 
  addWater, 
  updateSettings 
}: { 
  amount: number; 
  max: number; 
  defaultGlass: number; 
  addWater: () => Promise<void>; 
  updateSettings: (target: number, glass: number) => Promise<boolean>; 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [targetInput, setTargetInput] = React.useState(max);
  const [glassInput, setGlassInput] = React.useState(defaultGlass);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLogging, setIsLogging] = React.useState(false);

  React.useEffect(() => {
    setTargetInput(max);
    setGlassInput(defaultGlass);
  }, [max, defaultGlass]);

  const percentage = Math.min(100, Math.max(0, (amount / max) * 100));
  const isGoalReached = amount >= max;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
      {isGoalReached && (
        <span className="absolute top-0 bg-sky-100 text-sky-600 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-sm tracking-widest z-20">
          ¡Meta lograda!
        </span>
      )}
      
      {/* Clickable glass area */}
      <motion.div 
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          triggerVibration('light');
          setIsOpen((prev) => !prev);
        }}
        className="cursor-pointer relative w-20 h-28 border-[5px] border-slate-100 rounded-b-2xl rounded-t-lg overflow-hidden bg-white shadow-inner flex items-end mt-4 group"
      >
        {/* Liquid wave representation */}
        <motion.div
          className="w-full bg-cyan-400"
          initial={{ height: '0%' }}
          animate={{ height: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 45, damping: 13 }}
        />
        {/* Label Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
          <span className="text-xl font-black text-slate-800 drop-shadow-md">
            +
          </span>
        </div>
      </motion.div>
      
      <div className="mt-4 text-center">
        <p className="text-3xl font-black text-slate-800 tracking-tighter">
          {amount} <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">ml</span>
        </p>
        <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mt-0.5">
          {percentage.toFixed(0)}% de tu meta
        </p>
      </div>

      {/* Popover / Config panel */}
      {isOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[90%] max-w-[14rem] rounded-3xl border border-slate-100 bg-white/95 backdrop-blur-xl p-4 shadow-2xl animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Ajustes Agua</span>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-slate-50"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            disabled={isLogging}
            onClick={async () => {
              triggerVibration('success');
              setIsLogging(true);
              try {
                await addWater();
                setIsOpen(false);
              } finally {
                setIsLogging(false);
              }
            }}
            className="w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>{isLogging ? '...' : `Beber +${defaultGlass}ml`}</span>
          </button>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                Meta Diaria (ml)
              </label>
              <input
                type="number"
                value={targetInput || ''}
                onChange={(e) => setTargetInput(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (targetInput < 500 || targetInput > 10000) {
                  toast.error('La meta debe estar entre 500 y 10000 ml.');
                  return;
                }
                setIsSaving(true);
                const success = await updateSettings(targetInput, glassInput);
                setIsSaving(false);
                if (success) {
                  toast.success('¡Ajustes guardados!');
                  setIsOpen(false);
                } else {
                  toast.error('Error al guardar.');
                }
              }}
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold transition active:scale-95"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardMain({
  isXRayMode,
  isLoading,
  theme,
  displayLog,
  momentum,
  streak,
  energyLevel,
  mentalClarity,
  insightText,
  dailyWaterTarget,
  defaultGlassSize,
  dietTargets,
  updateWaterSettings,
  addWaterIntake,
}: DashboardMainProps) {
  const normalizedMomentum = clampMomentum(momentum);

  const avatarUrl = useMemo(() => {
    if (normalizedMomentum > 80) return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20strong,%20healthy,%20glowing%20coat,%20happy%20face,%20sitting%20proudly%20in%20a%20sunny%20meadow,%20high%20detail,%20warm%20lighting,%20no%20text?width=512&height=512&nologo=true';
    if (normalizedMomentum > 30) return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20calm,%20neutral%20expression,%20balanced,%20natural%20forest,%20soft%20morning%20light,%20high%20detail,%20no%20text?width=512&height=512&nologo=true';
    return 'https://image.pollinations.ai/prompt/a%20beautiful%20photorealistic%20german%20shepherd%20dog,%20sad,%20tired,%20weak,%20lying%20down%20in%20dark%20shadows,%20somber%20mood,%20misty%20environment,%20high%20detail,%20no%20text?width=512&height=512&nologo=true';
  }, [normalizedMomentum]);

  return (
    <section className="relative mt-4 flex min-h-0 flex-1 flex-col pb-6">
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[2rem] bg-slate-50/50 backdrop-blur-sm">
            <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-slate-100 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-700">Sincronizando...</span>
            </div>
          </div>
        )}

        <PushNotificationManager />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          
          {/* Bento Box 1: Bio-Avatar (Main) */}
          <BentoCard className="md:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-sky-50 to-transparent pointer-events-none" />
            
            <div className="relative aspect-square w-[180px] sm:w-[220px] overflow-hidden rounded-[2rem] border-[8px] border-white shadow-2xl bg-white mb-6 mt-4 z-10">
              <img
                src={avatarUrl}
                alt="Bio-Avatar"
                className="w-full h-full object-cover transition-all duration-1000"
                loading="eager"
              />
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 tracking-tight z-10">
              {normalizedMomentum > 80 ? 'Óptimo' : normalizedMomentum > 30 ? 'Estable' : 'Crítico'}
            </h3>
            
            {/* AI Insight Badge */}
            <div className="mt-4 mb-2 bg-white rounded-2xl border border-sky-100 p-4 shadow-sm z-10 text-left w-full">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-sky-100 text-sky-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                  Coach IA
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {insightText}
              </p>
            </div>
          </BentoCard>

          {/* Bento Box 2: Nutrition Rings */}
          <BentoCard className="md:col-span-2 lg:col-span-2">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Nutrición</p>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Macros</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-rose-500 tracking-tighter leading-none">
                  {displayLog.total_kcal}
                  <span className="text-sm text-slate-400 font-bold ml-1 uppercase">/ {dietTargets?.kcal ?? 2000} kcal</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-auto">
              <CircularProgressRing
                value={displayLog.total_kcal}
                max={dietTargets?.kcal ?? 2000}
                label="Calorías"
                unit="kcal"
                colorClass="stroke-rose-500"
                icon={<svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>}
              />
              <CircularProgressRing
                value={displayLog.protein_g}
                max={dietTargets?.protein ?? 150}
                label="Proteína"
                unit="g"
                colorClass="stroke-emerald-500"
                icon={<svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>}
              />
              <CircularProgressRing
                value={displayLog.carbs_g}
                max={dietTargets?.carbs ?? 200}
                label="Carbos"
                unit="g"
                colorClass="stroke-cyan-500"
                icon={<svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.342 6 9.3 6 10.428v4.293c0 1.128.845 2.086 1.976 2.112 2.654.062 5.394.062 8.048 0 1.131-.026 1.976-1.084 1.976-2.212v-4.293c0-1.128-.845-2.086-1.976-2.112A48.243 48.243 0 0 0 12 8.25Z" /></svg>}
              />
              <CircularProgressRing
                value={displayLog.fats_g}
                max={dietTargets?.fats ?? 70}
                label="Grasa"
                unit="g"
                colorClass="stroke-amber-500"
                icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>
          </BentoCard>

          {/* Bento Box 3: Water */}
          <BentoCard className="md:col-span-1 lg:col-span-1 items-center">
            <div className="w-full text-left absolute top-5 left-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Hidratación</p>
            </div>
            <div className="pt-6 w-full h-full flex items-center justify-center">
              <WaterGlass 
                amount={displayLog.water_ml ?? displayLog.hidratacion_ml ?? 0} 
                max={dailyWaterTarget}
                defaultGlass={defaultGlassSize}
                addWater={addWaterIntake}
                updateSettings={updateWaterSettings}
              />
            </div>
          </BentoCard>

          {/* Bento Box 4: Habits & Mini Stats */}
          <BentoCard className="md:col-span-1 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-4">Hábitos Completados</p>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-4 max-h-[140px]">
              {Object.entries(displayLog.habits_count || {}).length > 0 ? (
                Object.entries(displayLog.habits_count).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center bg-slate-50 rounded-2xl px-4 py-3">
                    <span className="font-bold capitalize text-slate-700 text-sm">{key.replace(/_/g, ' ')}</span>
                    <div className="bg-lime-400 text-lime-950 px-2.5 py-0.5 rounded-full font-black text-xs">
                      {val}x
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium italic border-2 border-dashed border-slate-100 rounded-2xl p-4">
                  Sin hábitos hoy
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4 flex justify-between items-end mt-auto">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Inercia Ganada</p>
                <p className="text-xl font-black text-lime-500">
                  {displayLog.metricas.variacion_inercia >= 0 ? '+' : ''}{displayLog.metricas.variacion_inercia}
                </p>
              </div>
            </div>
          </BentoCard>

          {/* Bento Box 5: Minor Stats Grid */}
          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            <BentoCard className="p-4 sm:p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Inercia Total</p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{normalizedMomentum}<span className="text-sm text-slate-400 ml-1">%</span></p>
            </BentoCard>
            
            <BentoCard className="p-4 sm:p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">🔥 Racha</p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{streak}<span className="text-sm text-slate-400 ml-1">días</span></p>
            </BentoCard>

            <BentoCard className="p-4 sm:p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Energía</p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{energyLevel}<span className="text-sm text-slate-400 ml-1">/5</span></p>
            </BentoCard>

            <BentoCard className="p-4 sm:p-5 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Claridad</p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{mentalClarity}<span className="text-sm text-slate-400 ml-1">/5</span></p>
            </BentoCard>
          </div>

        </div>

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
