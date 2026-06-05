import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Achievement {
  id: string;
  title: string;
  description: string;
  badge_icon: string;
  xp_reward: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function loadAchievements() {
      try {
        setLoading(true);
        const [achRes, userAchRes] = await Promise.all([
          supabase.from('achievements').select('*'),
          supabase.from('user_achievements').select('achievement_id, unlocked_at'),
        ]);

        if (achRes.data) {
          setAchievements(achRes.data as Achievement[]);
        }

        if (userAchRes.data) {
          const ids = new Set((userAchRes.data as UserAchievement[]).map(ua => ua.achievement_id));
          setUnlockedIds(ids);
        }
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setLoading(false);
      }
    }

    void loadAchievements();
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-2xl sm:p-8"
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Radial shine background */}
            <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-300 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Vitrina de Logros
                </h2>
                <p className="text-xs text-slate-400">
                  Desbloquea insignias cumpliendo objetivos y mejora la salud de tu mascota digital
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((ach) => {
                  const isUnlocked = unlockedIds.has(ach.id);
                  return (
                    <motion.div
                      key={ach.id}
                      whileHover={{ scale: 1.03, rotateY: 5, rotateX: 5 }}
                      style={{ transformStyle: 'preserve-3d' }}
                      className={`relative flex flex-col items-center justify-between rounded-3xl border p-5 text-center transition-all ${
                        isUnlocked
                          ? 'border-white/30 bg-gradient-to-br from-white/15 to-white/5 shadow-xl shadow-indigo-500/5'
                          : 'border-white/5 bg-white/5 opacity-55'
                      }`}
                    >
                      {/* Radial glow effect for unlocked */}
                      {isUnlocked && (
                        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.25)_0%,transparent_60%)] pointer-events-none" />
                      )}

                      <div className="flex flex-col items-center">
                        <div
                          className={`relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-inner ${
                            isUnlocked
                              ? 'bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 ring-1 ring-white/30'
                              : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {isUnlocked ? ach.badge_icon : '🔒'}
                        </div>
                        <h3 className="font-bold text-sm text-white">{ach.title}</h3>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-3">{ach.description}</p>
                      </div>

                      <div className="mt-4 w-full">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold tracking-wider ${
                            isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                          }`}
                        >
                          {isUnlocked ? `+${ach.xp_reward} XP` : `${ach.xp_reward} XP`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
