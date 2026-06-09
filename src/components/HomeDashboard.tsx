'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Hero3D from '@/components/Hero3D';

import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardMain from '@/components/DashboardMain';
import FloatingChatButton from '@/components/FloatingChatButton';

const AchievementsModal = dynamic(() => import('@/components/AchievementsModal'), { ssr: false });
const AchievementUnlockedModal = dynamic(() => import('@/components/AchievementUnlockedModal'), { ssr: false });
const WeeklyReportModal = dynamic(() => import('@/components/WeeklyReportModal'), { ssr: false });
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
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
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
    hasLoggedToday,
    newUnlockedAch,
    setNewUnlockedAch,
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
    <div
      className={`relative flex flex-col flex-1 pb-6 min-h-0 h-[calc(100dvh-5.5rem)] md:h-full overflow-hidden ${theme.background} ${theme.text}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent}`} />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Hero3D />

      <div className="relative z-10 flex flex-col flex-1 px-2 py-2 sm:px-6 lg:px-8 h-full">
        <DashboardHeader
          theme={theme}
          momentum={momentum}
          streak={streak}
          onOpenRayX={() => setIsXRayMode(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
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
          onChatOpen={() => setIsChatOpen(true)}
        />
      </div>

      <FloatingChatButton onClick={() => setIsChatOpen(true)} isOpen={isChatOpen} hasLoggedToday={hasLoggedToday} />

      <AnimatePresence>
        {isChatOpen ? (
          <>
            {/* Soft backdrop on mobile only to prevent other interactions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 z-[140] bg-slate-900/10 backdrop-blur-xs md:hidden"
            />
            
            <motion.aside
              className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-24 right-4 md:right-8 z-[150] w-[calc(100vw-2rem)] sm:w-[440px] max-w-full overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <ChatInput
                momentum={momentum}
                onClose={() => setIsChatOpen(false)}
                onUpdate={async () => {
                  await reload();
                }}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
      <WeeklyReportModal />
    </div>
  );
}