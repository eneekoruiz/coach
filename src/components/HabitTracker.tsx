"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import Sparkline from './Sparkline';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { isMissingHabitTableError } from '@/lib/habits';

type HabitType = 'positive' | 'negative';

interface HabitRow {
  id: number;
  name: string;
  type: HabitType;
  tolerance_threshold: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
}

interface HabitTrackingEntry {
  habit_id: number;
  amount: number;
}

interface DailyLogRow {
  date: string;
  habit_tracking: HabitTrackingEntry[] | null;
}

interface SummaryCardSpec {
  label: string;
  value: string;
  detail: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHabitType(value: unknown): value is HabitType {
  return value === 'positive' || value === 'negative';
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function isHabitRow(value: unknown): value is HabitRow {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isHabitType(value.type) &&
    typeof value.tolerance_threshold === 'number' &&
    typeof value.current_streak === 'number' &&
    typeof value.longest_streak === 'number' &&
    typeof value.shields === 'number'
  );
}

function isHabitTrackingEntry(value: unknown): value is HabitTrackingEntry {
  if (!isObject(value)) return false;

  return typeof value.habit_id === 'number' && typeof value.amount === 'number';
}

function isDailyLogRow(value: unknown): value is DailyLogRow {
  if (!isObject(value)) return false;

  const tracking = value.habit_tracking;
  return (
    typeof value.date === 'string' &&
    (tracking === null || Array.isArray(tracking)) &&
    (tracking === null || tracking.every(isHabitTrackingEntry))
  );
}

function isUnauthorizedError(errorMessage: string) {
  const lower = errorMessage.toLowerCase();
  return lower.includes('session') || lower.includes('unauthorized') || lower.includes('not authenticated');
}

function buildSummaryCards(habits: HabitRow[], logs: DailyLogRow[]): SummaryCardSpec[] {
  const activeHabits = habits.length;
  const activeStreaks = habits.filter((habit) => habit.current_streak > 0).length;
  const maxCurrentStreak = habits.reduce((max, habit) => Math.max(max, habit.current_streak), 0);
  const maxLongstreak = habits.reduce((max, habit) => Math.max(max, habit.longest_streak), 0);
  const recentDays = Math.min(7, logs.length);
  const trackedDays = recentDays === 0 ? 0 : logs.slice(0, recentDays).filter((log) => {
    const entries = log.habit_tracking ?? [];
    return entries.some((entry) => entry.amount > 0);
  }).length;
  const recentConsistency = recentDays === 0 ? 0 : Math.round((trackedDays / recentDays) * 100);

  return [
    {
      label: 'Hábitos activos',
      value: String(activeHabits),
      detail: activeHabits === 1 ? '1 hábito monitorizado' : `${activeHabits} hábitos monitorizados`,
    },
    {
      label: 'Rachas vivas',
      value: String(activeStreaks),
      detail: activeStreaks === 0 ? 'Ninguna racha activa' : 'Hay momentum visible',
    },
    {
      label: 'Mejor racha',
      value: String(maxLongstreak),
      detail: maxCurrentStreak > 0 ? `Actual: ${maxCurrentStreak}` : 'Sin rachas actuales',
    },
    {
      label: 'Consistencia 7 días',
      value: `${recentConsistency}%`,
      detail: recentDays > 0 ? `${trackedDays}/${recentDays} días con registro` : 'Aún sin histórico reciente',
    },
  ];
}

function getAccessToken(sessionData: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']) {
  return sessionData.session?.access_token ?? null;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSafeMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function HabitTrackerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="mt-2 h-3 w-48 rounded-full bg-slate-100" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className="mt-3 h-8 w-16 rounded-2xl bg-slate-100" />
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="mt-3 h-10 w-full rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

function StatusBanner({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <div
      className={`rounded-[1.25rem] border px-4 py-3 text-sm shadow-sm ${
        tone === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {message}
    </div>
  );
}

function SummaryCards({ cards }: { cards: SummaryCardSpec[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{card.value}</div>
          <div className="mt-2 text-sm text-slate-500">{card.detail}</div>
        </motion.div>
      ))}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full bg-slate-950"
      />
    </div>
  );
}

function HabitCard({
  habit,
  value,
  saving,
  onValueChange,
  onSave,
  onZero,
  recentLogs,
}: {
  habit: HabitRow;
  value: number;
  saving: boolean;
  onValueChange: (nextValue: number) => void;
  onSave: () => void;
  onZero: () => void;
  recentLogs: DailyLogRow[];
}) {
  const streakProgress = habit.longest_streak > 0 ? (habit.current_streak / habit.longest_streak) * 100 : habit.current_streak > 0 ? 100 : 0;
  const trendLabel = habit.type === 'negative' ? 'evitar' : 'cumplir';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-slate-950">{habit.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
            {habit.type === 'negative' ? 'Hábito a evitar' : 'Hábito positivo'}
          </div>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
          {habit.current_streak} en curso
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MetricPill label="Actual" value={habit.current_streak} />
        <MetricPill label="Récord" value={habit.longest_streak} />
        <MetricPill label="Escudos" value={habit.shields} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progreso de racha</span>
          <span>{Math.round(streakProgress)}%</span>
        </div>
        <ProgressBar value={streakProgress} />
        <p className="text-xs text-slate-500">
          {habit.current_streak > 0
            ? `Vas bien: el patrón actual ya tiene ${habit.current_streak} día(s) para ${trendLabel}.`
            : `Sin racha activa todavía. Registra hoy para empezar a ${trendLabel}.`}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="sr-only" htmlFor={`habit-${habit.id}`}>{`Cantidad para ${habit.name}`}</label>
        <input
          id={`habit-${habit.id}`}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(event) => onValueChange(toNumber(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSave();
          }}
          className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium text-slate-950 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {habit.type === 'negative' ? (
          <button
            type="button"
            onClick={onZero}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marcar 0
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Histórico reciente</div>
          <RecentMiniList logs={recentLogs} habitId={habit.id} />
        </div>
        <div className="hidden sm:block">
          <Sparkline data={buildMiniSeries(recentLogs, habit.id)} width={120} height={28} />
        </div>
      </div>
    </motion.div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function buildMiniSeries(logs: DailyLogRow[], habitId: number) {
  return logs
    .slice(0, 30)
    .map((log) => {
      const entries = log.habit_tracking ?? [];
      const entry = entries.find((currentEntry) => currentEntry.habit_id === habitId);
      return Number(entry?.amount ?? 0);
    })
    .reverse();
}

function RecentMiniList({ logs, habitId }: { logs: DailyLogRow[]; habitId: number }) {
  const entries = logs
    .slice(0, 6)
    .map((log) => {
      const tracking = log.habit_tracking ?? [];
      const record = tracking.find((entry) => entry.habit_id === habitId);
      return { date: log.date, amount: record ? record.amount : null };
    })
    .filter((entry): entry is { date: string; amount: number } => entry.amount !== null);

  if (entries.length === 0) {
    return <div className="mt-2 text-xs text-slate-400">Sin registros recientes.</div>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <div key={`${habitId}-${entry.date}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
          <span className="font-semibold text-slate-950">{entry.amount}</span>
          <span className="ml-2 text-slate-400">{entry.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function QuickAddForm({ onCreate }: { onCreate: (name: string, type: HabitType) => Promise<void> }) {
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

export default function HabitTracker() {
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [recentLogs, setRecentLogs] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      setAuthRequired(false);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = userData.user;

        if (userError || !user) {
          if (!cancelled) {
            setAuthRequired(true);
            setHabits([]);
            setRecentLogs([]);
            setValues({});
          }
          return;
        }

        const [habitsResult, logsResult] = await Promise.all([
          supabase.from('user_habits').select('*').eq('user_id', user.id),
          supabase
            .from('daily_logs')
            .select('date, habit_tracking')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(60),
        ]);

        if (habitsResult.error) {
          const message = getSafeMessage(habitsResult.error);
          if (isMissingHabitTableError(habitsResult.error)) {
            throw new Error('La tabla public.user_habits no está aplicada. Ejecuta la migración de hábitos antes de usar este panel.');
          }
          throw new Error(message);
        }

        if (logsResult.error) {
          throw new Error(getSafeMessage(logsResult.error));
        }

        const nextHabits = Array.isArray(habitsResult.data)
          ? habitsResult.data.filter(isHabitRow)
          : [];
        const nextLogs = Array.isArray(logsResult.data)
          ? logsResult.data.filter(isDailyLogRow)
          : [];

        if (!cancelled) {
          setHabits(nextHabits);
          setRecentLogs(nextLogs);
          setValues(
            nextHabits.reduce<Record<number, number>>((accumulator, habit) => {
              accumulator[habit.id] = 0;
              return accumulator;
            }, {})
          );
        }
      } catch (error) {
        if (!cancelled) {
          const message = getSafeMessage(error);
          setErrorMessage(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = window.setTimeout(() => setStatusMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const summaryCards = useMemo(() => buildSummaryCards(habits, recentLogs), [habits, recentLogs]);

  async function refreshCurrentUserData() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const [habitsResult, logsResult] = await Promise.all([
      supabase.from('user_habits').select('*').eq('user_id', user.id),
      supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60),
    ]);

    const nextHabits = Array.isArray(habitsResult.data) ? habitsResult.data.filter(isHabitRow) : [];
    const nextLogs = Array.isArray(logsResult.data) ? logsResult.data.filter(isDailyLogRow) : [];

    setHabits(nextHabits);
    setRecentLogs(nextLogs);
  }

  async function getTokenOrThrow() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = getAccessToken(sessionData);
    if (!token) {
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    return token;
  }

  async function saveHabit(habitId: number) {
    const previousValue = values[habitId] ?? 0;
    setSavingMap((current) => ({ ...current, [habitId]: true }));

    try {
      const token = await getTokenOrThrow();
      const response = await fetch('/api/habits/update-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ habit_id: habitId, amount: previousValue }),
      });

      const payload = await parseJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        setValues((current) => ({ ...current, [habitId]: previousValue }));
        const message = payload?.error ? `Error al guardar: ${payload.error}` : 'Error al guardar el hábito.';
        setStatusMessage(message);
        toast.error(message);
        return;
      }

      const today = getTodayIsoDate();
      setRecentLogs((currentLogs) => {
        const nextLogs = [...currentLogs];
        const index = nextLogs.findIndex((log) => log.date === today);
        const trackingEntry: HabitTrackingEntry = { habit_id: habitId, amount: previousValue };

        if (index >= 0) {
          const existingTracking = nextLogs[index].habit_tracking ?? [];
          const nextTracking = [...existingTracking];
          const trackingIndex = nextTracking.findIndex((entry) => entry.habit_id === habitId);

          if (trackingIndex >= 0) {
            nextTracking[trackingIndex] = trackingEntry;
          } else {
            nextTracking.unshift(trackingEntry);
          }

          nextLogs[index] = { ...nextLogs[index], habit_tracking: nextTracking };
        } else {
          nextLogs.unshift({ date: today, habit_tracking: [trackingEntry] });
        }

        return nextLogs.slice(0, 60);
      });

      const message = 'Guardado';
      setStatusMessage(message);
      toast.success(message);
    } catch (error) {
      const message = getSafeMessage(error);
      if (isUnauthorizedError(message)) {
        window.location.href = '/login';
        return;
      }

      setValues((current) => ({ ...current, [habitId]: previousValue }));
      setStatusMessage(message);
      toast.error(message);
    } finally {
      setSavingMap((current) => ({ ...current, [habitId]: false }));
    }
  }

  async function createHabitQuick(name: string, type: HabitType) {
    try {
      const token = await getTokenOrThrow();
      const response = await fetch('/api/habits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, type }),
      });

      const payload = await parseJsonResponse<{ data?: unknown; error?: string }>(response);
      if (!response.ok) {
        const message = payload?.error ? `Error creando hábito: ${payload.error}` : 'Error creando hábito.';
        setStatusMessage(message);
        toast.error(message);
        return;
      }

      if (isHabitRow(payload?.data)) {
        setHabits((current) => [payload.data, ...current]);
        setValues((current) => ({ ...current, [payload.data.id]: 0 }));
        const message = 'Hábito creado';
        setStatusMessage(message);
        toast.success(message);
        await refreshCurrentUserData();
      }
    } catch (error) {
      const message = getSafeMessage(error);
      if (isUnauthorizedError(message)) {
        window.location.href = '/login';
        return;
      }

      setStatusMessage(message);
      toast.error(message);
    }
  }

  if (loading) {
    return <HabitTrackerSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Tracker activo</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Hábitos y rachas en un solo vistazo</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Registra cada hábito, revisa el patrón reciente y detecta en segundos qué está subiendo, qué está cayendo y dónde conviene intervenir.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            aria-label="Volver al inicio desde el tracker"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      {authRequired ? (
        <StatusBanner tone="info" message="Inicia sesión para ver y registrar tus hábitos." />
      ) : null}

      {errorMessage ? <StatusBanner tone="error" message={errorMessage} /> : null}
      {statusMessage && !errorMessage ? <StatusBanner tone="info" message={statusMessage} /> : null}

      <SummaryCards cards={summaryCards} />

      <QuickAddForm onCreate={createHabitQuick} />

      {habits.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No hay hábitos creados todavía. Usa el bloque superior para añadir el primero.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              value={values[habit.id] ?? 0}
              saving={Boolean(savingMap[habit.id])}
              onValueChange={(nextValue) => setValues((current) => ({ ...current, [habit.id]: nextValue }))}
              onSave={() => void saveHabit(habit.id)}
              onZero={() => {
                setValues((current) => ({ ...current, [habit.id]: 0 }));
                void saveHabit(habit.id);
              }}
              recentLogs={recentLogs}
            />
          ))}
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
    </div>
  );
}