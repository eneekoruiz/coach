'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import dynamic from 'next/dynamic';
import XRayOverlay from './XRayOverlay';
import CircularProgressRing from './CircularProgressRing';
import { type DailyLog } from '@/lib/schema';
import toast from '@/lib/toast';
import PushNotificationManager from './PushNotificationManager';
import { triggerVibration } from '@/lib/haptics';
import { useDashboardState, type AvatarState, AVATAR_CONFIG } from '@/hooks/useDashboardState';

const NutritionContainer = dynamic(() => import('./NutritionContainer'), { ssr: false });
const HabitTracker = dynamic(() => import('./HabitTracker'), { ssr: false });
const HealthInsightsDashboard = dynamic(() => import('./HealthInsightsDashboard'), { ssr: false });

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
  onChatOpen?: () => void;
};

interface BentoCardProps extends HTMLMotionProps<"div"> {}

function BentoCard({ children, className = '', layoutId, ...props }: BentoCardProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={`bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)] p-4 sm:p-5 overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] cursor-pointer select-none ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── Water Glass sub-component ───────────────────────────────────────────────
function WaterGlass({
  amount,
  max,
  defaultGlass,
  addWater,
  updateSettings,
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

      <motion.div
        whileTap={{ scale: 0.95 }}
        onClick={() => { triggerVibration('light'); setIsOpen((prev) => !prev); }}
        className="cursor-pointer relative w-20 h-28 border-[5px] border-slate-100 rounded-b-2xl rounded-t-lg overflow-hidden bg-white shadow-inner flex items-end mt-4 group"
      >
        <motion.div
          className="w-full bg-cyan-400"
          initial={{ height: '0%' }}
          animate={{ height: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 45, damping: 13 }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
          <span className="text-xl font-black text-slate-800 drop-shadow-md">+</span>
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

      {isOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[90%] max-w-[14rem] rounded-3xl border border-slate-100 bg-white/95 backdrop-blur-xl p-4 shadow-2xl animate-fade-in flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Ajustes Agua</span>
            <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-650 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-slate-50">✕</button>
          </div>
          <button
            type="button"
            disabled={isLogging}
            onClick={async () => { triggerVibration('success'); setIsLogging(true); try { await addWater(); setIsOpen(false); } finally { setIsLogging(false); } }}
            className="w-full py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            {isLogging ? '...' : `Beber +${defaultGlass}ml`}
          </button>
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Meta Diaria (ml)</label>
              <input type="number" value={targetInput || ''} onChange={(e) => setTargetInput(Number(e.target.value))} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-cyan-500 outline-none" />
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                if (targetInput < 500 || targetInput > 10000) { toast.error('La meta debe estar entre 500 y 10000 ml.'); return; }
                setIsSaving(true);
                const success = await updateSettings(targetInput, glassInput);
                setIsSaving(false);
                if (success) { toast.success('¡Ajustes guardados!'); setIsOpen(false); } else { toast.error('Error al guardar.'); }
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

// ── Main Component ──────────────────────────────────────────────────────────
export default function DashboardMain({
  isXRayMode,
  setRayXModeFromGesture,
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
  onChatOpen,
}: DashboardMainProps) {
  const {
    normalizedMomentum,
    expandedCard,
    setExpandedCard,
    waterMl,
    completedHabitsCount,
    avatar,
  } = useDashboardState({
    momentum,
    displayLog,
    dietTargets,
    streak,
    dailyWaterTarget,
  });

  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  return (
    <section className="relative flex flex-1 flex-col px-4 md:px-6 pb-24 lg:pb-2 overflow-x-hidden lg:overflow-hidden lg:h-[calc(100vh-120px)]">
      <PushNotificationManager />

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 lg:h-full lg:items-stretch">
        {/* ══ COLUMNA IZQUIERDA: BioAvatar ══════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center py-6 lg:py-4 lg:justify-center h-full shrink-0">
          {/* Status dot */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2.5 h-2.5 rounded-full ${avatar.statusColor} shadow-sm animate-pulse`} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-550">
              {avatar.subLabel}
            </span>
          </div>

          {/* Avatar image with reactive aura */}
          <motion.div
            layoutId="avatar-card"
            onClick={() => { triggerVibration('light'); setExpandedCard('avatar'); }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className={`relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-[2.5rem] overflow-hidden bg-white cursor-pointer ${avatar.aura} border border-slate-100 transition-shadow duration-700`}
          >
            <img
              src={avatar.url}
              alt="Bio-Avatar"
              className="w-full h-full object-cover transition-all duration-700"
              loading="eager"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
            />
            {/* Subtle inner ring */}
            <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-white/30" />
          </motion.div>

          {/* State label */}
          <div className="mt-6 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
              {avatar.label}
            </h2>
            <p className="text-base sm:text-lg font-semibold text-slate-400 mt-2 tracking-tight">
              {normalizedMomentum}% de inercia
            </p>
          </div>

          {/* CTA Chat Button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { triggerVibration('light'); onChatOpen?.(); }}
            className="mt-6 inline-flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-slate-900 text-white text-base font-black shadow-2xl hover:bg-slate-800 transition-colors group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🐶</span>
            <span>Hablar con mi Coach</span>
          </motion.button>
        </div>

        {/* ══ COLUMNA DERECHA: Bento Grid ═══════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col gap-6 justify-center lg:overflow-y-auto lg:h-full pr-1 custom-scrollbar">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Bento Card 1: Inercia & Mini Stats */}
            <BentoCard
              onClick={() => { triggerVibration('light'); setExpandedCard('avatar'); }}
              className="col-span-1 sm:col-span-2 bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Estado Vital</span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Inercia & Métricas</h3>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerVibration('light');
                    setIsInsightsOpen(true);
                  }}
                  className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                >
                  Ver Análisis Profundo
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex flex-col items-center py-3 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Energía</span>
                  <span className="text-xl font-black text-slate-808 mt-1">{energyLevel}<span className="text-xs text-slate-400 font-bold">/5</span></span>
                </div>
                <div className="flex flex-col items-center py-3 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Inercia</span>
                  <span className="text-xl font-black text-slate-808 mt-1">{normalizedMomentum}<span className="text-xs text-slate-400 font-bold">%</span></span>
                </div>
                <div className="flex flex-col items-center py-3 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Claridad</span>
                  <span className="text-xl font-black text-slate-808 mt-1">{mentalClarity}<span className="text-xs text-slate-400 font-bold">/5</span></span>
                </div>
              </div>

              <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4">
                <span className="bg-sky-100 text-sky-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block mb-1.5 font-bold">Coach Inteligente</span>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed line-clamp-2">{insightText}</p>
              </div>
            </BentoCard>

            {/* Bento Card 2: Nutrición */}
            <BentoCard
              onClick={() => { triggerVibration('light'); setExpandedCard('nutrition'); }}
              className="bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Alimentación</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Nutrición</h3>
                </div>
                <span className="text-xl">🍎</span>
              </div>
              <div className="mt-2">
                <p className="text-3xl font-black text-rose-500 tracking-tighter">
                  {displayLog.total_kcal} <span className="text-sm font-bold text-slate-400">kcal</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Objetivo: {dietTargets?.kcal ?? 2000} kcal
                </p>
              </div>
              <div className="flex gap-1.5 mt-4 text-[9px] text-slate-550 font-bold">
                <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">P: {displayLog.protein_g}g</span>
                <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">C: {displayLog.carbs_g}g</span>
                <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">G: {displayLog.fats_g}g</span>
              </div>
            </BentoCard>

            {/* Bento Card 3: Hidratación */}
            <BentoCard
              onClick={() => { triggerVibration('light'); setExpandedCard('water'); }}
              className="bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Hidratación</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Agua</h3>
                </div>
                <span className="text-xl">💧</span>
              </div>
              <div className="mt-2">
                <p className="text-3xl font-black text-cyan-500 tracking-tighter">
                  {waterMl} <span className="text-sm font-bold text-slate-400">ml</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Meta: {dailyWaterTarget} ml
                </p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (waterMl / (dailyWaterTarget || 2000)) * 100)}%` }}
                />
              </div>
            </BentoCard>

            {/* Bento Card 4: Hábitos & Racha */}
            <BentoCard
              onClick={() => { triggerVibration('light'); setExpandedCard('habits'); }}
              className="bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Hábitos</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Rutinas</h3>
                </div>
                <span className="text-xl">🔥</span>
              </div>
              <div className="mt-2">
                <p className="text-3xl font-black text-orange-500 tracking-tighter">
                  {streak} <span className="text-sm font-bold text-slate-400">días</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Racha activa de hábitos
                </p>
              </div>
              <p className="text-xs text-slate-550 mt-4 font-semibold">
                {completedHabitsCount} hábitos registrados hoy
              </p>
            </BentoCard>

            {/* Bento Card 5: Ánimo */}
            <BentoCard
              onClick={() => { triggerVibration('light'); onChatOpen?.(); }}
              className="bg-white border border-slate-200/80 shadow-xs"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Salud Mental</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Bitácora</h3>
                </div>
                <span className="text-xl">🧠</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2 font-medium">
                ¿Quieres registrar retrospectivamente cómo te sientes o planificar hábitos con la IA?
              </p>
              <span className="text-emerald-500 text-xs font-bold mt-4 inline-flex items-center gap-1">
                Consultar al Coach →
              </span>
            </BentoCard>

          </div>

          <XRayOverlay
            isXRayMode={isXRayMode}
            theme={theme}
            displayLog={displayLog}
            momentum={momentum}
            onClose={() => setRayXModeFromGesture?.(false)}
          />
        </div>
      </div>

      {/* ══ MORPHING DETAIL MODALS ══════════════════════════════════════════ */}
      <AnimatePresence>
        {expandedCard === 'avatar' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              layoutId="avatar-card"
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto relative flex flex-col items-center text-center"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button onClick={() => setExpandedCard(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors z-30 shadow-sm">✕</button>
              <div className={`relative w-[200px] h-[200px] overflow-hidden rounded-[2.5rem] bg-white mb-6 mt-4 ${avatar.aura}`}>
                <img src={avatar.url} alt="Bio-Avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{avatar.label}</h3>
              <p className="text-sm text-slate-500 mt-1 font-semibold">{avatar.subLabel}</p>
              <div className="mt-6 bg-white rounded-2xl border border-sky-100 p-6 text-left w-full shadow-sm">
                <span className="bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg block mb-2 font-bold w-fit">Coach IA</span>
                <p className="text-sm text-slate-700 font-semibold leading-relaxed">{insightText}</p>
              </div>
            </motion.div>
          </div>
        )}

        {expandedCard === 'nutrition' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              layoutId="nutrition-modal"
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button onClick={() => setExpandedCard(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors z-30 shadow-sm">✕</button>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Nutrición</p>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Macros</h2>
                </div>
                <p className="text-2xl font-black text-rose-500 tracking-tighter">{displayLog.total_kcal}<span className="text-sm text-slate-400 font-bold ml-1">/ {dietTargets?.kcal ?? 2000} kcal</span></p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-8 bg-slate-50 border border-slate-150 p-6 rounded-3xl">
                <CircularProgressRing value={displayLog.total_kcal} max={dietTargets?.kcal ?? 2000} label="Calorías" unit="kcal" colorClass="stroke-rose-500" icon={<svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>} />
                <CircularProgressRing value={displayLog.protein_g} max={dietTargets?.protein ?? 150} label="Proteína" unit="g" colorClass="stroke-emerald-500" icon={<svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>} />
                <CircularProgressRing value={displayLog.carbs_g} max={dietTargets?.carbs ?? 200} label="Carbos" unit="g" colorClass="stroke-cyan-500" icon={<svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.342 6 9.3 6 10.428v4.293c0 1.128.845 2.086 1.976 2.112 2.654.062 5.394.062 8.048 0 1.131-.026 1.976-1.084 1.976-2.212v-4.293c0-1.128-.845-2.086-1.976-2.112A48.243 48.243 0 0 0 12 8.25Z" /></svg>} />
                <CircularProgressRing value={displayLog.fats_g} max={dietTargets?.fats ?? 70} label="Grasa" unit="g" colorClass="stroke-amber-500" icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              </div>
              <div className="mt-2 border-t border-slate-150 pt-6">
                <NutritionContainer />
              </div>
            </motion.div>
          </div>
        )}

        {expandedCard === 'water' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button onClick={() => setExpandedCard(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-650 transition-colors z-30 shadow-sm">✕</button>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-1">Hidratación</p>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-8 font-bold">Seguimiento de Agua</h2>
              <div className="w-full max-w-xs aspect-square flex items-center justify-center py-4">
                <WaterGlass amount={waterMl} max={dailyWaterTarget} defaultGlass={defaultGlassSize} addWater={addWaterIntake} updateSettings={updateWaterSettings} />
              </div>
            </motion.div>
          </div>
        )}

        {expandedCard === 'habits' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button onClick={() => setExpandedCard(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-650 transition-colors z-30 shadow-sm">✕</button>
              <div className="mt-2">
                <HabitTracker />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HealthInsightsDashboard isOpen={isInsightsOpen} onClose={() => setIsInsightsOpen(false)} />
    </section>
  );
}
