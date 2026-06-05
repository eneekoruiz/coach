import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface AchievementUnlockedModalProps {
  achievement: {
    id: string;
    title: string;
    description: string;
    badge_icon: string;
    xp_reward: number;
  } | null;
  onClose: () => void;
}

export default function AchievementUnlockedModal({ achievement, onClose }: AchievementUnlockedModalProps) {
  useEffect(() => {
    if (achievement) {
      // Fire confetti celebration!
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [achievement]);

  return (
    <AnimatePresence>
      {achievement && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-amber-300/30 bg-gradient-to-b from-indigo-950/95 via-slate-900/98 to-black/95 p-8 text-center text-white shadow-[0_0_50px_rgba(251,191,36,0.15)] backdrop-blur-xl"
            initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Ambient golden aura */}
            <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full bg-amber-500/20 blur-[60px] pointer-events-none" />

            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1.1, rotate: 10 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 15 }}
                className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-600 text-5xl shadow-[0_10px_30px_rgba(245,158,11,0.3)] ring-4 ring-amber-300/50"
              >
                {achievement.badge_icon}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                  ¡LOGRO DESBLOQUEADO!
                </span>
                <h3 className="mt-2 text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-100 bg-clip-text text-transparent">
                  {achievement.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300 px-2">
                  {achievement.description}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"
              >
                <span>🚀</span>
                <span>+{achievement.xp_reward} XP de Experiencia</span>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400"
              >
                ¡Impresionante, sigamos!
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
