'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type DayEntry = { date: string; status: 'perfect' | 'yellow' | 'broken' | 'missed' };

export default function HabitCalendar({
  habitName,
  entries,
}: {
  habitName?: string;
  entries: DayEntry[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const days = useMemo(() => {
    const map = new Map(entries.map((e) => [e.date, e]));
    const res: DayEntry[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      const localIso = `${year}-${month}-${dayVal}`;
      res.push(map.get(localIso) ?? { date: localIso, status: 'missed' });
    }
    return res;
  }, [entries]);

  if (!mounted) {
    return (
      <div className="w-full max-w-3xl animate-pulse">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-6 w-64 bg-slate-200 rounded" />
          <div className="h-5 w-40 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="aspect-square w-full rounded-sm bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Evoluciona Conmigo — Rachas Resilientes</h3>
        <div className="text-sm text-slate-500 font-medium">Hábito: {habitName ?? 'Selecciona uno'}</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const bg =
            day.status === 'perfect'
              ? 'bg-emerald-500'
              : day.status === 'yellow'
              ? 'bg-amber-400'
              : day.status === 'broken'
              ? 'bg-rose-500'
              : 'bg-slate-200';

          const dayNumber = day.date.split('-')[2];

          return (
            <motion.div
              key={day.date}
              className={`aspect-square w-full rounded-sm ${bg} flex items-center justify-center text-xs font-bold text-white shadow-xs`}
              whileHover={{ scale: 1.06 }}
              title={`${day.date} — ${day.status}`}
            >
              <span className="select-none">{parseInt(dayNumber, 10)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
