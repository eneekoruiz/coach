'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardMain from '@/components/DashboardMain';
import type { DailyLog } from '@/lib/schema';

const fallbackLog: DailyLog = {
  comidas: [],
  hidratacion_ml: 0,
  water_ml: 0,
  total_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fats_g: 0,
  habits_count: {},
  toxinas: [],
  bio_avatar: {
    estado_fisiologico: 'equilibrio estable',
    energia_fisica: 3,
    claridad_mental: 3,
  },
  metricas: {
    variacion_inercia: 0,
    aciertos: [],
    error_clave: 'sin datos todavía',
    accion_manana: 'registra el primer log para activar el seguimiento',
  },
};

export default function HomeDashboard() {
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const {
    isLoading,
    lastLog,
    momentum,
    streak,
    insightText,
    reload,
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    updateWaterSettings,
    addWaterIntake,
  } = useDashboard();


  const theme = useMemo(() => {
    if (momentum >= 75) {
      return {
        background:
          'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(230,246,244,0.92)_38%,_rgba(202,232,226,0.88)_100%)]',
        accent: 'from-emerald-300/25 via-cyan-200/20 to-transparent',
        glass: 'border-white/70 bg-white/65',
        text: 'text-slate-900',
        subtext: 'text-slate-600',
      };
    }

    if (momentum >= 40) {
      return {
        background:
          'bg-[radial-gradient(circle_at_top,_rgba(246,247,249,0.98),_rgba(224,228,233,0.92)_48%,_rgba(203,208,215,0.9)_100%)]',
        accent: 'from-slate-300/35 via-sky-200/15 to-transparent',
        glass: 'border-white/60 bg-white/55',
        text: 'text-slate-900',
        subtext: 'text-slate-600',
      };
    }

    return {
      background:
        'bg-[radial-gradient(circle_at_top,_rgba(245,246,248,0.98),_rgba(208,214,222,0.95)_45%,_rgba(168,176,188,0.92)_100%)]',
      accent: 'from-slate-400/35 via-slate-500/20 to-transparent',
      glass: 'border-white/55 bg-white/45',
      text: 'text-slate-900',
      subtext: 'text-slate-600',
    };
  }, [momentum]);

  const displayLog = lastLog ?? fallbackLog;
  const energyLevel = displayLog.bio_avatar.energia_fisica;
  const mentalClarity = displayLog.bio_avatar.claridad_mental;

  const setRayXModeFromGesture = (nextValue: boolean) => setIsXRayMode(nextValue);

  return (
    <main
      className={`relative min-h-dvh overflow-x-hidden overflow-y-auto ${theme.background} ${theme.text}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent}`} />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative z-10 flex min-h-dvh flex-col px-4 py-4 sm:px-6 lg:px-8">
        <DashboardHeader
          theme={theme}
          momentum={momentum}
          streak={streak}
          setRayXModeFromGesture={setRayXModeFromGesture}
        />

        <DashboardMain
          isXRayMode={isXRayMode}
          setRayXModeFromGesture={setRayXModeFromGesture}
          isLoading={isLoading}
          theme={theme}
          displayLog={displayLog}
          momentum={momentum}
          streak={streak}
          energyLevel={energyLevel}
          mentalClarity={mentalClarity}
          insightText={insightText}
          dailyWaterTarget={dailyWaterTarget}
          defaultGlassSize={defaultGlassSize}
          dietTargets={dietTargets}
          updateWaterSettings={updateWaterSettings}
          addWaterIntake={addWaterIntake}
        />
      </div>

      <button
        type="button"
        aria-label="Abrir chat"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] transition hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M7 8h10M7 12h6m-6 4h4" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M20 12c0 4.418-3.582 8-8 8-1.05 0-2.052-.2-2.97-.564L5 20l1.039-3.03A7.958 7.958 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8Z"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isChatOpen ? (
          <motion.aside
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-none p-0 sm:max-w-2xl sm:p-6"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <ChatInput
              momentum={momentum}
              onClose={() => setIsChatOpen(false)}
              onUpdate={async () => {
                await reload();
              }}
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}