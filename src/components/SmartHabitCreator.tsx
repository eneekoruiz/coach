"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useSmartHabitCreator } from '@/hooks/useSmartHabitCreator';

export default function SmartHabitCreator({ onCreated }: { onCreated?: () => void }) {
  const { text, setText, loading, createSmartHabit } = useSmartHabitCreator(onCreated);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void createSmartHabit();
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="sr-only">¿Qué quieres cambiar?</label>
        <motion.textarea
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          placeholder="¿Qué quieres cambiar en tu vida hoy? (Ej: Leer 10 páginas, no comer azúcar...)"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg leading-6 placeholder:text-slate-400"
          rows={3}
          whileFocus={{ scale: 1.01 }}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
          >
            {loading ? 'Creando...' : 'Crear hábito inteligente'}
          </button>
          <div className="text-sm text-slate-500">Cero formularios. Nosotros interpretamos tu intención.</div>
        </div>
      </form>

      {loading && (
        <div className="mt-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg bg-white/60 p-4 shadow-md"
          >
            Analizando tu intención…
          </motion.div>
        </div>
      )}
    </div>
  );
}
