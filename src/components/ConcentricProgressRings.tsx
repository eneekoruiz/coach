'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, Droplet } from 'lucide-react';

interface ConcentricProgressRingsProps {
  realKcal: number;
  targetKcal: number;
  realProtein: number;
  targetProtein: number;
  realWater: number;
  targetWater: number;
  size?: number;
}

export default function ConcentricProgressRings({
  realKcal,
  targetKcal,
  realProtein,
  targetProtein,
  realWater,
  targetWater,
  size = 200,
}: ConcentricProgressRingsProps) {
  const safeTargetKcal = targetKcal <= 0 ? 1 : targetKcal;
  const safeTargetProtein = targetProtein <= 0 ? 1 : targetProtein;
  const safeTargetWater = targetWater <= 0 ? 1 : targetWater;

  const pctKcal = Math.min(1.5, realKcal / safeTargetKcal);
  const pctProtein = Math.min(1.5, realProtein / safeTargetProtein);
  const pctWater = Math.min(1.5, realWater / safeTargetWater);

  const center = size / 2;
  const strokeWidth = 12;

  // Radii for concentric rings: Outer, Middle, Inner
  const rKcal = (size / 2) - strokeWidth;             // e.g. 88 if size=200
  const rProtein = rKcal - strokeWidth - 6;           // e.g. 70
  const rWater = rProtein - strokeWidth - 6;          // e.g. 52

  const cKcal = 2 * Math.PI * rKcal;
  const cProtein = 2 * Math.PI * rProtein;
  const cWater = 2 * Math.PI * rWater;

  const offsetKcal = cKcal - Math.min(1.0, pctKcal) * cKcal;
  const offsetProtein = cProtein - Math.min(1.0, pctProtein) * cProtein;
  const offsetWater = cWater - Math.min(1.0, pctWater) * cWater;

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-3xl bg-slate-50/50 backdrop-blur-md shadow-sm sm:flex-row sm:gap-8 select-none">
      {/* SVG Container */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Gradients */}
          <defs>
            <linearGradient id="gradKcal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" /> {/* Rose 500 */}
              <stop offset="100%" stopColor="#fda4af" /> {/* Rose 300 */}
            </linearGradient>
            <linearGradient id="gradProtein" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" /> {/* Emerald 500 */}
              <stop offset="100%" stopColor="#6ee7b7" /> {/* Emerald 300 */}
            </linearGradient>
            <linearGradient id="gradWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
              <stop offset="100%" stopColor="#67e8f9" /> {/* Cyan 300 */}
            </linearGradient>
          </defs>

          {/* BACKGROUND CIRCLES */}
          <circle cx={center} cy={center} r={rKcal} stroke="rgba(244,63,94,0.08)" strokeWidth={strokeWidth} fill="none" />
          <circle cx={center} cy={center} r={rProtein} stroke="rgba(16,185,129,0.08)" strokeWidth={strokeWidth} fill="none" />
          <circle cx={center} cy={center} r={rWater} stroke="rgba(6,182,212,0.08)" strokeWidth={strokeWidth} fill="none" />

          {/* ANIMATED PROGRESS CIRCLES */}
          {/* Calories (Outer) */}
          <motion.circle
            cx={center}
            cy={center}
            r={rKcal}
            stroke="url(#gradKcal)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            style={{ strokeDasharray: cKcal }}
            initial={{ strokeDashoffset: cKcal }}
            animate={{ strokeDashoffset: offsetKcal }}
            transition={{ type: 'spring', stiffness: 40, damping: 15 }}
          />

          {/* Protein (Middle) */}
          <motion.circle
            cx={center}
            cy={center}
            r={rProtein}
            stroke="url(#gradProtein)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            style={{ strokeDasharray: cProtein }}
            initial={{ strokeDashoffset: cProtein }}
            animate={{ strokeDashoffset: offsetProtein }}
            transition={{ type: 'spring', stiffness: 40, damping: 15, delay: 0.15 }}
          />

          {/* Water (Inner) */}
          <motion.circle
            cx={center}
            cy={center}
            r={rWater}
            stroke="url(#gradWater)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            style={{ strokeDasharray: cWater }}
            initial={{ strokeDashoffset: cWater }}
            animate={{ strokeDashoffset: offsetWater }}
            transition={{ type: 'spring', stiffness: 40, damping: 15, delay: 0.3 }}
          />
        </svg>

        {/* Center overlay percentages */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-800 tracking-tighter">
            {Math.round(pctKcal * 100)}%
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">
            Meta del Día
          </span>
        </div>
      </div>

      {/* Side Legend */}
      <div className="mt-4 flex flex-col gap-3.5 sm:mt-0">
        {/* Calories Legend */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Calorías</div>
            <div className="text-sm font-bold text-slate-800">
              {Math.round(realKcal)} <span className="text-xs text-slate-400 font-medium">/ {targetKcal} kcal</span>
            </div>
          </div>
        </div>

        {/* Protein Legend */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
            <Dumbbell className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Proteína</div>
            <div className="text-sm font-bold text-slate-800">
              {Math.round(realProtein)}g <span className="text-xs text-slate-400 font-medium">/ {targetProtein}g</span>
            </div>
          </div>
        </div>

        {/* Water Legend */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-500">
            <Droplet className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Agua</div>
            <div className="text-sm font-bold text-slate-800">
              {Math.round(realWater)}ml <span className="text-xs text-slate-400 font-medium">/ {targetWater}ml</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
