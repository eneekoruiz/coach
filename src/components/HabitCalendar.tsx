import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

type DayEntry = { date: string; status: 'perfect' | 'yellow' | 'broken' | 'missed' };

export default function HabitCalendar({
  habitName,
  entries,
}: {
  habitName?: string;
  entries: DayEntry[];
}) {
  const days = useMemo(() => {
    // ensure 30 entries; if less, pad with missed
    const map = new Map(entries.map((e) => [e.date, e]));
    const res: DayEntry[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      res.push(map.get(iso) ?? { date: iso, status: 'missed' });
    }
    return res;
  }, [entries]);

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Evoluciona Conmigo — Rachas Resilientes</h3>
        <div className="text-sm text-slate-500">Hábito: {habitName ?? 'Selecciona uno'}</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const bg =
            day.status === 'perfect'
              ? 'bg-green-500'
              : day.status === 'yellow'
              ? 'bg-yellow-400'
              : day.status === 'broken'
              ? 'bg-red-500'
              : 'bg-gray-300';

          return (
            <motion.div
              key={day.date}
              className={`aspect-square w-full rounded-sm ${bg} flex items-center justify-center text-xs text-white`}
              whileHover={{ scale: 1.06 }}
              title={`${day.date} — ${day.status}`}
            >
              <span className="select-none">{new Date(day.date).getDate()}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
