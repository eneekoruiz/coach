'use client';

import React from 'react';
import { motion } from 'framer-motion';

type CircularProgressRingProps = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string; // e.g. "stroke-emerald-500"
  gradientId?: string; // optional gradient reference
  label: string;
  unit?: string;
  icon?: React.ReactNode;
};

export default function CircularProgressRing({
  value,
  max,
  size = 90,
  strokeWidth = 10,
  colorClass = 'stroke-slate-200',
  gradientId,
  label,
  unit = '',
  icon,
}: CircularProgressRingProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percentage = Math.min(1.5, Math.max(0, value / safeMax)); // Allow progress rings to overshoot slightly if user exceeds goal

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate dash offset representing progress (clamped to 100% physically so the ring doesn't overlap weirdly)
  const visiblePercent = Math.min(1.0, percentage);
  const strokeDashoffset = circumference - visiblePercent * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none group">
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Progress Circle */}
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={gradientId ? `url(#${gradientId})` : undefined}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            className={gradientId ? undefined : colorClass}
            style={{ strokeDasharray: circumference }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {icon && <div className="mb-0.5 text-slate-500">{icon}</div>}
          <span className="text-sm font-bold text-slate-800 leading-none">
            {Math.round(value)}
            <span className="text-[9px] font-normal text-slate-500 ml-0.5">{unit}</span>
          </span>
          <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-0.5 font-semibold">
            {Math.round(percentage * 100)}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">
        {label}
      </span>
    </div>
  );
}
