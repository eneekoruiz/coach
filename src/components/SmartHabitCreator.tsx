"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import toast from '@/lib/toast';

export default function SmartHabitCreator({ onCreated }: { onCreated?: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/parse-habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const payload = await res.json();
      if (payload.error) throw new Error(payload.error);
      const parsed = payload.data;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const createRes = await fetch('/api/habits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: parsed.name,
          type: parsed.type,
          target_number: parsed.target_number ?? 1,
          unit: parsed.unit ?? null,
          tolerance: parsed.tolerance ?? 0,
        }),
      });

      const createPayload = await createRes.json();
      if (!createRes.ok || createPayload.error) {
        throw new Error(typeof createPayload.error === 'string' ? createPayload.error : 'Failed to create habit');
      }

      toast.success('Hábito creado ✔️');
      setText('');
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
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

      {/* toasts handled by ToasterClient in root layout */}
    </div>
  );
}
