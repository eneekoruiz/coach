import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

type DayEntry = { date: string; status: 'perfect' | 'yellow' | 'broken' | 'missed' };

export default function HabitCalendar({
  habitName,
  entries,
  onCreateHabit,
}: {
  habitName?: string;
  entries: DayEntry[];
  onCreateHabit?: (payload: { name: string; type: 'positive' | 'negative'; tolerance: number }) => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'positive' | 'negative'>('negative');
  const [tolerance, setTolerance] = useState(1);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!onCreateHabit) return;
    setCreating(true);
    try {
      await onCreateHabit({ name, type, tolerance });
      setName('');
    } finally {
      setCreating(false);
    }
  }

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

      <div className="mt-6 rounded-lg border bg-white p-4 shadow-sm">
        <h4 className="mb-2 text-sm font-medium">Añadir hábito</h4>
        <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Nombre del hábito (Ej. Fumar)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="negative">Negativo</option>
            <option value="positive">Positivo</option>
          </select>
          <input
            type="number"
            className="w-20 rounded-md border px-3 py-2 text-sm"
            min={0}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
          <button
            type="submit"
            disabled={creating}
            className="ml-auto rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          >
            {creating ? 'Creando...' : 'Crear hábito'}
          </button>
        </form>
        <div className="mt-3 text-xs text-slate-500">Añade hábitos predeterminados: Fumar, Azúcar, Leer.</div>
      </div>
    </div>
  );
}
