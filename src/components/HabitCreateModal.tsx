import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitType } from '@/types/habits';

interface HabitCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: HabitType) => Promise<void>;
}

export default function HabitCreateModal({ isOpen, onClose, onCreate }: HabitCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('negative');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      await onCreate(trimmedName, type);
      setName('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-800">Nuevo Hábito</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Define qué quieres registrar.</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" htmlFor="new-habit-name">
                Nombre del hábito
              </label>
              <input
                id="new-habit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Caminar 20 min, beber agua..."
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" htmlFor="new-habit-type">
                Tipo de hábito
              </label>
              <select
                id="new-habit-type"
                value={type}
                onChange={(event) => setType(event.target.value as HabitType)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100 cursor-pointer"
              >
                <option value="positive">Positivo (A cumplir)</option>
                <option value="negative">Negativo (A evitar)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="mt-2 w-full inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Crear hábito'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
