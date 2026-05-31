"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import Sparkline from './Sparkline';

type Habit = {
  id: number;
  name: string;
  type: 'positive' | 'negative';
  tolerance_threshold: number;
};

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [recentLogs, setRecentLogs] = useState<Array<{ date: string; habit_tracking: any[] }>>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setHabits([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase.from('user_habits').select('*').eq('user_id', userId);
      const list = (data as Habit[]) ?? [];
      setHabits(list);
      const initial: Record<number, number> = {};
      for (const h of list) initial[h.id] = 0;
      setValues(initial);

      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(60);
      setRecentLogs((logsData as any[]) ?? []);

      setLoading(false);
    }
    load();
  }, []);

  function setValue(habitId: number, v: number) {
    setValues((s) => ({ ...s, [habitId]: v }));
  }

  async function saveHabit(habitId: number) {
    // optimistic UI: store previous value
    const prev = values[habitId] ?? 0;
    setSaving((s) => ({ ...s, [habitId]: true }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any)?.session?.access_token;

      const res = await fetch('/api/habits/update-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ habit_id: habitId, amount: values[habitId] ?? 0 }),
      });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setValues((s) => ({ ...s, [habitId]: prev }));
          const msg = `Error al guardar: ${payload?.error || res.statusText}`;
          toast.error(msg);
          setStatusMessage(msg);
        } else {
          const msg = 'Guardado';
          toast.success(msg);
          setStatusMessage(msg);
        // update recent logs optimistically
        const today = new Date().toISOString().slice(0, 10);
        setRecentLogs((r) => {
          const copy = [...r];
          const idx = copy.findIndex((x) => x.date === today);
          if (idx >= 0) {
            const entry = copy[idx];
            const tracking = Array.isArray(entry.habit_tracking) ? entry.habit_tracking : [];
            const existing = tracking.find((t) => Number(t.habit_id) === habitId);
            if (existing) existing.amount = values[habitId] ?? 0;
            else tracking.unshift({ habit_id: habitId, amount: values[habitId] ?? 0 });
            copy[idx] = { ...entry, habit_tracking: tracking };
          } else {
            copy.unshift({ date: today, habit_tracking: [{ habit_id: habitId, amount: values[habitId] ?? 0 }] });
          }
          return copy.slice(0, 60);
        });
      }
    } catch (err) {
      console.error(err);
      setValues((s) => ({ ...s, [habitId]: prev }));
      const msg = 'Error de red al guardar hábito';
      toast.error(msg);
      setStatusMessage(msg);
    } finally {
      setSaving((s) => ({ ...s, [habitId]: false }));
    }
  }

  async function createHabitQuick(name: string, type: 'positive' | 'negative') {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = (sessionData as any)?.session?.access_token;
      const res = await fetch('/api/habits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, type }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const msg = `Error creando hábito: ${payload?.error || res.statusText}`;
        toast.error(msg);
        setStatusMessage(msg);
        return;
      }
      const payload = await res.json();
      const newHabit = payload?.data;
      if (newHabit) {
        setHabits((h) => [newHabit, ...h]);
        setValues((s) => ({ ...s, [newHabit.id]: 0 }));
        const msg = 'Hábito creado';
        toast.success(msg);
        setStatusMessage(msg);
      }
    } catch (e) {
      console.error(e);
      const msg = 'Error de red';
      toast.error(msg);
      setStatusMessage(msg);
    }
  }

  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(t);
  }, [statusMessage]);

  if (loading) return <div className="text-sm text-slate-500">Cargando hábitos…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-slate-900">Tracker activo</div>
          <div className="text-xs text-slate-500">Registro rápido y seguimiento diario</div>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
          aria-label="Volver al inicio desde el tracker"
        >
          Volver al inicio
        </Link>
      </div>

      <div>
        <QuickAdd onCreate={createHabitQuick} />
      </div>
        <div className="grid gap-4">
          {habits.map((h) => (
            <motion.div
              key={h.id}
              className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center gap-4 bg-white shadow-sm"
              whileHover={{ translateY: -4 }}
              whileTap={{ scale: 0.995 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              tabIndex={0}
              role="group"
              aria-label={`Hábito ${h.name}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-base truncate">{h.name}</div>
                <div className="text-xs text-slate-500">Tipo: {h.type}</div>
                <RecentMiniList logs={recentLogs} habitId={h.id} />
              </div>

              <div className="flex-shrink-0 w-full sm:w-52 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  aria-label={`Cantidad para ${h.name}`}
                  className="w-20 p-2 border rounded text-right focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
                  value={values[h.id] ?? 0}
                  onChange={(e) => setValue(h.id, Number(e.target.value || 0))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveHabit(h.id);
                  }}
                />
                <button
                  className="px-3 py-2 bg-slate-800 text-white rounded disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                  onClick={() => saveHabit(h.id)}
                  disabled={!!saving[h.id]}
                  aria-label={`Guardar hábito ${h.name}`}
                >
                  {saving[h.id] ? 'Guardando…' : 'Guardar'}
                </button>
                {h.type === 'negative' ? (
                  <button
                    className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300"
                    onClick={() => {
                      setValue(h.id, 0);
                      saveHabit(h.id);
                    }}
                    aria-label={`Marcar cero ${h.name}`}
                  >
                    Marcar 0
                  </button>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
        {/* Toast container is rendered in root layout */}

        {/* Live region for screen readers */}
        <div aria-live="polite" className="sr-only">
          {statusMessage}
        </div>
      </div>
    );
}

function QuickAdd({ onCreate }: { onCreate: (name: string, type: 'positive' | 'negative') => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'positive' | 'negative'>('negative');

  return (
    <div className="p-3 border rounded flex gap-2 items-center">
      <input className="flex-1 p-2 border rounded" placeholder="Nombre del hábito (ej. Fumar)" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="p-2 border rounded" value={type} onChange={(e) => setType(e.target.value as any)}>
        <option value="negative">Negativo</option>
        <option value="positive">Positivo</option>
      </select>
      <button
        className="px-3 py-2 bg-blue-600 text-white rounded"
        onClick={() => {
          if (!name.trim()) return;
          onCreate(name.trim(), type);
          setName('');
        }}
      >
        Añadir
      </button>
    </div>
  );
}

function RecentMiniList({ logs, habitId }: { logs: Array<{ date: string; habit_tracking: any[] }>; habitId: number }) {
  const entries = logs
    .slice(0, 60) // fetch limit earlier was 60, show latest 30
    .map((l) => {
      const t = Array.isArray(l.habit_tracking) ? l.habit_tracking : [];
      const rec = t.find((r) => Number(r.habit_id) === habitId);
      return { date: l.date, amount: rec ? Number(rec.amount || 0) : null };
    })
    .filter((x) => x.amount !== null)
    .slice(0, 30); // keep up to 30 most recent entries

  if (entries.length === 0) return <div className="text-xs text-slate-400 mt-2">Sin registros recientes</div>;

  const numbers = entries.map((e) => Number(e.amount || 0)).reverse();
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="hidden md:block">
        <Sparkline data={numbers} width={120} height={28} />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {entries.map((e) => (
          <div key={e.date} className="text-xs bg-slate-100 px-2 py-1 rounded">
            <div className="font-medium">{e.amount}</div>
            <div className="text-[10px] text-slate-500">{e.date.slice(5)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
