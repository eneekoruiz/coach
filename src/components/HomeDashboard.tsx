'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import Hero3D from '@/components/Hero3D';

import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardMain from '@/components/DashboardMain';
import FloatingChatButton from '@/components/FloatingChatButton';
import AchievementsModal from '@/components/AchievementsModal';
import AchievementUnlockedModal from '@/components/AchievementUnlockedModal';
import WeeklyReportModal from '@/components/WeeklyReportModal';
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
    <main
      className={`relative flex flex-col flex-1 pb-32 min-h-0 ${theme.background} ${theme.text}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent}`} />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px]" />
      <Hero3D />

      <div className="relative z-10 flex flex-col flex-1 px-2 py-2 sm:px-6 lg:px-8 h-full">
        <DashboardHeader
          theme={theme}
          momentum={momentum}
          streak={streak}
          setRayXModeFromGesture={setRayXModeFromGesture}
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
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.aside
              className="w-full max-w-2xl overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <ChatInput
                momentum={momentum}
                onClose={() => setIsChatOpen(false)}
                onUpdate={async () => {
                  await reload();
                }}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
      <AchievementsModal isOpen={isAchievementsOpen} onClose={() => setIsAchievementsOpen(false)} />
      <AchievementUnlockedModal achievement={newUnlockedAch} onClose={() => setNewUnlockedAch(null)} />
      <WeeklyReportModal />
    </main>
  );
}