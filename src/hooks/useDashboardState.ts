'use client';

import { useState, useMemo, useEffect } from 'react';
import { type DailyLog } from '@/lib/schema';

export type AvatarState = 'happy' | 'thirsty' | 'tired' | 'critical' | 'neutral';

export const AVATAR_CONFIG: Record<
  AvatarState,
  {
    url: string;
    label: string;
    subLabel: string;
    aura: string;
    statusColor: string;
  }
> = {
  happy: {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=lion&backgroundColor=b6e3f4',
    label: 'León Radiante (Óptimo)',
    subLabel: '¡Tu Bio-Avatar está en su mejor momento! 🦁🌟',
    aura: 'shadow-[0_0_80px_rgba(16,185,129,0.35)]',
    statusColor: 'bg-emerald-500',
  },
  thirsty: {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=camel&backgroundColor=dbeafe',
    label: 'Camello Sediento',
    subLabel: '¡Necesito hidratación urgente! 🐫💧',
    aura: 'shadow-[0_0_80px_rgba(59,130,246,0.4)]',
    statusColor: 'bg-blue-500',
  },
  tired: {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=koala&backgroundColor=fef9c3',
    label: 'Koala Fatigado',
    subLabel: 'Desbalance o toxinas hoy. A descansar 🐨😴',
    aura: 'shadow-[0_0_80px_rgba(234,179,8,0.35)]',
    statusColor: 'bg-amber-500',
  },
  critical: {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=panda&backgroundColor=fee2e2',
    label: 'Panda en Crisis',
    subLabel: '¡SOS! Inercia baja, necesito hábitos 🐼🆘',
    aura: 'shadow-[0_0_80px_rgba(239,68,68,0.4)]',
    statusColor: 'bg-rose-500',
  },
  neutral: {
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=wolf&backgroundColor=f1f5f9',
    label: 'Lobo Estable',
    subLabel: 'Vas por buen camino, mantente firme 🐺💪',
    aura: 'shadow-[0_0_60px_rgba(148,163,184,0.3)]',
    statusColor: 'bg-slate-400',
  },
};

function clampMomentum(value: number) {
  return Math.min(100, Math.max(0, value));
}

interface UseDashboardStateProps {
  momentum: number;
  displayLog: DailyLog;
  dietTargets: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  streak: number;
  dailyWaterTarget: number;
}

export function useDashboardState({
  momentum,
  displayLog,
  dietTargets,
  streak,
  dailyWaterTarget,
}: UseDashboardStateProps) {
  const normalizedMomentum = clampMomentum(momentum);
  const [expandedCard, setExpandedCard] = useState<'avatar' | 'nutrition' | 'water' | 'habits' | null>(null);

  const waterMl = displayLog.water_ml ?? displayLog.hidratacion_ml ?? 0;

  const completedHabitsCount = useMemo(() => {
    return Object.values(displayLog.habits_count || {}).reduce(
      (acc, val) => acc + (Number(val) > 0 ? 1 : 0),
      0
    );
  }, [displayLog.habits_count]);

  const [avatarState, setAvatarState] = useState<AvatarState>('neutral');

  useEffect(() => {
    const inertia = normalizedMomentum;
    const targetKcal = dietTargets?.kcal ?? 2000;
    const realKcal = displayLog.total_kcal ?? 0;
    const nutritionDelta = Math.abs(realKcal - targetKcal);
    const currentStreak = streak;
    const waterPct = dailyWaterTarget > 0 ? waterMl / dailyWaterTarget : 0;

    let nextState: AvatarState = 'neutral';

    if (inertia < 35) {
      nextState = 'critical';
    } else if (waterPct < 0.35) {
      nextState = 'thirsty';
    } else if (nutritionDelta > 800 || (displayLog.toxinas && displayLog.toxinas.length > 0)) {
      nextState = 'tired';
    } else if (currentStreak >= 3 && nutritionDelta <= 300 && inertia >= 70) {
      nextState = 'happy';
    } else {
      nextState = 'neutral';
    }

    setAvatarState(nextState);
  }, [
    normalizedMomentum,
    displayLog.total_kcal,
    displayLog.toxinas,
    dietTargets?.kcal,
    streak,
    waterMl,
    dailyWaterTarget,
  ]);

  const avatar = AVATAR_CONFIG[avatarState];

  return {
    normalizedMomentum,
    expandedCard,
    setExpandedCard,
    waterMl,
    completedHabitsCount,
    avatarState,
    avatar,
  };
}
