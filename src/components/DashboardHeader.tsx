import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { triggerVibration } from '@/lib/haptics';

interface DashboardTheme {
  background: string;
  accent: string;
  glass: string;
  text: string;
  subtext: string;
}

interface DashboardHeaderProps {
  theme: DashboardTheme;
  momentum: number;
  streak: number;
  onOpenRayX: () => void;
  onOpenAchievements: () => void;
}

export default function DashboardHeader({
  theme,
  momentum,
  streak,
  onOpenRayX,
  onOpenAchievements,
}: DashboardHeaderProps) {
  return (
    <header className="relative z-40 flex items-center justify-between px-4 py-3 bg-white/40 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Left spacing to center the pill */}
      <div className="w-9 h-9" />

      {/* Center: Momentum Pill */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-xs font-black tracking-wider shadow-sm transition-transform active:scale-95">
        <span className="opacity-80">INERCIA ACTUAL:</span>
        <span>{momentum}%</span>
      </div>

      {/* Right: Spacer to center the Momentum Pill */}
      <div className="w-9 h-9" />
    </header>
  );
}
