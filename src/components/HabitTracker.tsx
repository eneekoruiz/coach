"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      setLoading(false);
    }
    load();
  }, []);

  function setValue(habitId: number, v: number) {
    setValues((s) => ({ ...s, [habitId]: v }));
  }

  async function saveHabit(habitId: number) {
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
        alert(`Error al guardar: ${payload?.error || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al guardar hábito');
    } finally {
      setSaving((s) => ({ ...s, [habitId]: false }));
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Cargando hábitos…</div>;

  if (habits.length === 0)
    return <div className="text-sm text-slate-500">No tienes hábitos configurados. Añade algunos desde la configuración.</div>;

  return (
    <div className="space-y-4">
      {habits.map((h) => (
        <div key={h.id} className="p-4 border rounded-lg flex items-center gap-4">
          <div className="flex-1">
            <div className="font-medium">{h.name}</div>
            <div className="text-xs text-slate-500">Tipo: {h.type}</div>
          </div>

          <div className="w-48 flex items-center gap-2">
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
          </div>
        </div>
      ))}
    </div>
  );
}
