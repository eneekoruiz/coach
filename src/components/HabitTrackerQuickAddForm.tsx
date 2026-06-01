import React, { useState } from 'react';
import type { HabitType } from '@/types/habits';

interface HabitTrackerQuickAddFormProps {
  onCreate: (name: string, type: HabitType) => Promise<void>;
}

export default function HabitTrackerQuickAddForm({ onCreate }: HabitTrackerQuickAddFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('negative');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      await onCreate(trimmedName, type);
      setName('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="new-habit-name">
            Nombre del hábito
          </label>
          <input
            id="new-habit-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Caminar 20 minutos, no fumar, beber agua..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="new-habit-type">
            Tipo de hábito
          </label>
          <select
            id="new-habit-type"
            value={type}
            onChange={(event) => setType(event.target.value === 'positive' ? 'positive' : 'negative')}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
          >
            <option value="negative">A evitar</option>
            <option value="positive">A cumplir</option>
          </select>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Analizando…' : 'Crear hábito'}
          </button>
        </div>
      </div>
    </form>
  );
}
