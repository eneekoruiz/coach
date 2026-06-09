'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardHeader from '@/components/DashboardHeader';
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
    addWaterIntake,
    hasLoggedToday,
    pendingSyncCount,
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

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${theme.background} ${theme.text}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.accent}`} />

      <div className="relative z-10 flex h-full flex-1 flex-col px-3 py-3 sm:px-6 lg:px-8">
        <DashboardHeader
          theme={theme}
          momentum={momentum}
          pendingSyncCount={pendingSyncCount}
        />

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
          addWaterIntake={addWaterIntake}
          pendingSyncCount={pendingSyncCount}
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
              className="flex md:hidden fixed bottom-0 left-0 right-0 z-[150] flex-col bg-white/95 backdrop-blur-2xl border-t border-slate-200/60 rounded-t-[2rem] shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mx-auto my-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
              <div className="flex-1 px-4 pb-4 overflow-hidden" style={{ height: '70vh' }}>
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
