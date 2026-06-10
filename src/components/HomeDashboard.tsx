'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardMain from '@/components/DashboardMain';
import FloatingChatButton from '@/components/FloatingChatButton';
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
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const {
    isLoading,
    lastLog,
    momentum,
    insightText,
    reload,
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    updateWaterSettings,
    addWaterIntake,
    hasLoggedToday,
    pendingSyncCount,
    smartTrigger,
  } = useDashboard();

  const theme = useMemo(() => ({
    background: 'bg-slate-50',
    accent: 'from-white via-sky-50/40 to-emerald-50/40',
    glass: 'border-slate-200 bg-white',
    text: 'text-slate-900',
    subtext: 'text-slate-500',
  }), []);

  const displayLog = lastLog ?? fallbackLog;
  const energyLevel = displayLog.bio_avatar.energia_fisica;
  const mentalClarity = displayLog.bio_avatar.claridad_mental;

  useEffect(() => {
    router.prefetch('/nutrition');
    router.prefetch('/habits');
    router.prefetch('/statistics');
  }, [router]);

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${theme.background} ${theme.text}`}>
      <div className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br ${theme.accent} px-2 py-2 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:px-4 md:pb-4`}>
        <DashboardMain
          isLoading={isLoading}
          theme={theme}
          displayLog={displayLog}
          momentum={momentum}
          energyLevel={energyLevel}
          mentalClarity={mentalClarity}
          insightText={insightText}
          dailyWaterTarget={dailyWaterTarget}
          defaultGlassSize={defaultGlassSize}
          dietTargets={dietTargets}
          updateWaterSettings={updateWaterSettings}
          addWaterIntake={addWaterIntake}
          pendingSyncCount={pendingSyncCount}
          smartTrigger={smartTrigger}
          onChatOpen={() => setIsChatOpen(true)}
        />
      </div>

      <FloatingChatButton onClick={() => setIsChatOpen(true)} isOpen={isChatOpen} hasLoggedToday={hasLoggedToday} />

      <AnimatePresence>
        {isChatOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 z-[140] bg-slate-900/10 backdrop-blur-xs md:hidden"
            />

            <motion.aside
              className="hidden md:flex fixed top-0 right-0 bottom-0 z-[150] w-[480px] max-w-[90vw] flex-col bg-white/95 backdrop-blur-2xl border-l border-slate-200/60 shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex-1 p-4 overflow-hidden">
                <ChatInput
                  momentum={momentum}
                  onClose={() => setIsChatOpen(false)}
                  onUpdate={async () => {
                    await reload();
                  }}
                />
              </div>
            </motion.aside>

            <motion.aside
              className="flex md:hidden fixed bottom-0 left-0 right-0 z-[150] max-h-[78dvh] flex-col bg-white/95 backdrop-blur-2xl border-t border-slate-200/60 rounded-t-[2rem] shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mx-auto my-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 px-4 pb-4 overflow-hidden">
                <ChatInput
                  momentum={momentum}
                  onClose={() => setIsChatOpen(false)}
                  onUpdate={async () => {
                    await reload();
                  }}
                />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
