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

// Map typical stroke classes to start/end hex colors for dynamic gradients
const colorToGradient: Record<string, { start: string, end: string, shadow: string }> = {
  'stroke-rose-500': { start: '#f43f5e', end: '#fb7185', shadow: 'rgba(244,63,94,0.4)' },
  'stroke-emerald-500': { start: '#10b981', end: '#34d399', shadow: 'rgba(16,185,129,0.4)' },
  'stroke-cyan-500': { start: '#06b6d4', end: '#22d3ee', shadow: 'rgba(6,182,212,0.4)' },
  'stroke-amber-500': { start: '#f59e0b', end: '#fbbf24', shadow: 'rgba(245,158,11,0.4)' },
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
  const percentage = Math.min(1.5, Math.max(0, value / safeMax));

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  const visiblePercent = Math.min(1.0, percentage);
  const strokeDashoffset = circumference - visiblePercent * circumference;

  const gradientData = colorToGradient[colorClass] || { start: '#cbd5e1', end: '#94a3b8', shadow: 'rgba(0,0,0,0.1)' };
  const uid = gradientId || `grad-${label.toLowerCase()}`;

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none group">
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG Progress Circle */}
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientData.start} />
              <stop offset="100%" stopColor={gradientData.end} />
            </linearGradient>
            <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={gradientData.shadow} />
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(148,163,184,0.15)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${uid})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            filter={`url(#glow-${uid})`}
            style={{ strokeDasharray: circumference }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', stiffness: 50, damping: 15 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {icon && <div className="mb-0.5 opacity-80">{icon}</div>}
          <span className="text-sm sm:text-base font-black text-slate-800 leading-none tracking-tighter">
            {Math.round(value)}
            <span className="text-[9px] font-bold text-slate-400 ml-0.5">{unit}</span>
          </span>
          <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-0.5 font-extrabold">
            {Math.round(percentage * 100)}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center">
        {label}
      </span>
    </div>
  );
}
