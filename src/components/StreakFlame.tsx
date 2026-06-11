'use client';

import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import StreakCalendarModal from './StreakCalendarModal';

interface StreakFlameProps {
  streak: number;
  weeklyTarget?: number;
}

export default function StreakFlame({ streak, weeklyTarget = 7 }: StreakFlameProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Color logic
  let flameColor = 'text-slate-300';
  let flameEffect = '';
  
  if (streak >= 10) {
    flameColor = 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]';
    flameEffect = 'animate-bounce';
  } else if (streak >= 4) {
    flameColor = 'text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    flameEffect = 'animate-pulse';
  } else if (streak >= 1) {
    flameColor = 'text-orange-400';
  }

  // Calculate percentage of progress towards weekly target (max 100%)
  const progressPercent = Math.min(100, (streak / weeklyTarget) * 100);

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsModalOpen(true);
        }}
        className="flex items-center gap-3 bg-white/40 p-2 px-3 rounded-2xl border border-white/50 backdrop-blur-md shadow-sm select-none hover:bg-white/60 transition-all cursor-pointer transform hover:scale-[1.03] active:scale-[0.98]"
      >
        <div className="relative flex items-center justify-center">
          {/* SVG Circular Progress Bar */}
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-slate-100"
              fill="transparent"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-cyan-500 transition-all duration-500"
              strokeDasharray={100}
              strokeDashoffset={100 - progressPercent}
              fill="transparent"
            />
          </svg>
          {/* Icon in Center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Flame className={`w-5 h-5 ${flameColor} ${flameEffect}`} fill="currentColor" />
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-700 leading-none">
            {streak} {streak === 1 ? 'Día' : 'Días'}
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            {progressPercent === 100 ? '¡Meta Lograda!' : `${streak}/${weeklyTarget} semana`}
          </span>
        </div>
      </div>

      <StreakCalendarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        streak={streak}
      />
    </>
  );
}
