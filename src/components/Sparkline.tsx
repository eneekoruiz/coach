"use client";
import React from 'react';

export default function Sparkline({ data, width = 80, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const len = data.length;
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(1, len - 1)) * width;
      const y = height - ((v - min) / Math.max(1, max - min)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block">
      <polyline fill="none" stroke="#0f172a" strokeWidth={1.5} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
