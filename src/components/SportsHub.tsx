'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Bike, Dumbbell, Footprints, Loader2, Orbit, Timer } from 'lucide-react';

import { saveWorkout } from '@/app/sports/actions';
import { getNormalizedDate } from '@/lib/date-utils';
import toast from '@/lib/toast';

const SPORTS = [
  { label: 'Pesas', icon: Dumbbell },
  { label: 'Correr', icon: Activity },
  { label: 'Padel', icon: Orbit },
  { label: 'Caminar', icon: Footprints },
  { label: 'Bici', icon: Bike },
] as const;

const INTENSITIES = [
  { value: 'low', label: 'Suave' },
  { value: 'moderate', label: 'Media' },
  { value: 'high', label: 'Alta' },
] as const;

export default function SportsHub() {
  const today = useMemo(() => getNormalizedDate(new Date()), []);
  const [sport, setSport] = useState<(typeof SPORTS)[number]['label']>('Pesas');
  const [duration, setDuration] = useState('45');
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]['value']>('moderate');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const SelectedIcon = SPORTS.find((item) => item.label === sport)?.icon ?? Activity;

  const handleSave = async () => {
    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      toast.error('La duración debe ser mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveWorkout({
        date: today,
        sport_type: sport,
        duration_minutes: durationMinutes,
        intensity,
        kcal_burned: 0,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'No se pudo guardar el entrenamiento.');
      }

      setSavedCount((current) => current + 1);
      toast.success('Entrenamiento guardado.', {
        description: `${sport} · ${durationMinutes} min`,
      });
      setNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el entrenamiento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:px-4 md:pb-4">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Sports Hub</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">¿Qué has hecho hoy?</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Regístralo en segundos para que Nutrición entienda tu gasto real y el sistema tenga contexto físico.
          </p>
        </section>

        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Deporte</p>
            <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SPORTS.map((item) => {
                const Icon = item.icon;
                const isActive = sport === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSport(item.label)}
                    aria-pressed={isActive}
                    className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-3xl border px-4 py-4 transition-all duration-200 ease-in-out active:scale-95 ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-black">{item.label}</span>
                  </button>
                );
              })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Duración</span>
                <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <Timer className="h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="ml-3 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  />
                  <span className="text-xs font-black text-slate-400">min</span>
                </div>
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Intensidad</span>
                <div className="grid grid-cols-3 gap-2">
                  {INTENSITIES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setIntensity(item.value)}
                      className={`min-h-[48px] rounded-2xl border px-3 text-xs font-black transition-all duration-200 ease-in-out ${
                        intensity === item.value
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-in-out focus:border-slate-300"
                placeholder="Series, sensaciones, pista, compañero..."
              />
            </label>
          </div>

          <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Resumen rápido</p>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-900 ring-1 ring-slate-200">
                <SelectedIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{sport}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Flujo mínimo: deporte, duración, intensidad y guardar. El resto queda como contexto opcional.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition-all duration-200 ease-in-out hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              <span>{saving ? 'Guardando entrenamiento' : 'Guardar entrenamiento'}</span>
            </button>
            {savedCount > 0 && (
              <p className="mt-3 text-xs font-semibold text-slate-500">
                {savedCount} entrenamiento{savedCount === 1 ? '' : 's'} guardado{savedCount === 1 ? '' : 's'} en `workouts`.
              </p>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
