"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from './Toast';

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
  const [toast, setToast] = useState<string | null>(null);

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
        setToast(`Error al guardar: ${payload?.error || res.statusText}`);
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast('Guardado');
        setTimeout(() => setToast(null), 2000);
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
      setToast('Error de red al guardar hábito');
      setTimeout(() => setToast(null), 4000);
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
        setToast(`Error creando hábito: ${payload?.error || res.statusText}`);
        setTimeout(() => setToast(null), 4000);
        return;
      }
      const payload = await res.json();
      const newHabit = payload?.data;
      if (newHabit) {
        setHabits((h) => [newHabit, ...h]);
        setValues((s) => ({ ...s, [newHabit.id]: 0 }));
        setToast('Hábito creado');
        setTimeout(() => setToast(null), 2000);
      }
    } catch (e) {
      console.error(e);
      setToast('Error de red');
      setTimeout(() => setToast(null), 4000);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Cargando hábitos…</div>;

  if (habits.length === 0)
    return (
      <div className="text-sm text-slate-500">
        No tienes hábitos configurados.
        <div className="mt-3">
          <QuickAdd onCreate={createHabitQuick} />
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <QuickAdd onCreate={createHabitQuick} />
      </div>
      {habits.map((h) => (
        <div key={h.id} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="font-medium">{h.name}</div>
            <div className="text-xs text-slate-500">Tipo: {h.type}</div>
            <RecentMiniList logs={recentLogs} habitId={h.id} />
          </div>

          <div className="w-full md:w-48 flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="w-24 p-2 border rounded"
              value={values[h.id] ?? 0}
              onChange={(e) => setValue(h.id, Number(e.target.value || 0))}
            />
            <button
              className="px-3 py-2 bg-slate-800 text-white rounded disabled:opacity-50"
              onClick={() => saveHabit(h.id)}
              disabled={!!saving[h.id]}
            >
              {saving[h.id] ? 'Guardando…' : 'Guardar'}
            </button>
            {h.type === 'negative' ? (
              <button
                className="px-2 py-1 border rounded text-sm"
                onClick={() => {
                  setValue(h.id, 0);
                  saveHabit(h.id);
                }}
              >
                Marcar 0
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {toast ? <Toast message={toast} /> : null}
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
    .slice(0, 30)
    .map((l) => {
      const t = Array.isArray(l.habit_tracking) ? l.habit_tracking : [];
      const rec = t.find((r) => Number(r.habit_id) === habitId);
      return { date: l.date, amount: rec ? Number(rec.amount || 0) : null };
    })
    .filter((x) => x.amount !== null)
    .slice(0, 10);

  if (entries.length === 0) return <div className="text-xs text-slate-400 mt-2">Sin registros recientes</div>;

  return (
    <div className="flex gap-2 mt-2 overflow-x-auto">
      {entries.map((e) => (
        <div key={e.date} className="text-xs bg-slate-100 px-2 py-1 rounded">
          <div className="font-medium">{e.amount}</div>
          <div className="text-[10px] text-slate-500">{e.date.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}
