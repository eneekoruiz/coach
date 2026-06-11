import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, Flag, HeartPulse, Moon, Shield, TriangleAlert } from 'lucide-react';

import BottomSheet from './BottomSheet';
import type { HabitRecoveryCheckIn, HabitRow, RecoveryDifficulty } from '@/types/habits';
import { addHabitMetricValue, getHabitMetric } from '@/lib/habit-metrics';
import {
  buildDailyPledgeText,
  getNextRecoveryMilestone,
  getRecoveryCheckInState,
  getSoberDuration,
} from '@/lib/recovery';
import toast from '@/lib/toast';

type RelapseFactor = 'stress' | 'social' | 'boredom' | 'craving' | 'other';

interface RecoveryHabitCardProps {
  habit: HabitRow;
  value: number;
  checkIn?: HabitRecoveryCheckIn;
  saving: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSaveValue: (
    habitId: number,
    nextValue: number,
    metadata?: { relapseFactor?: RelapseFactor | null }
  ) => Promise<void>;
  onSaveRecoveryCheckIn: (
    habitId: number,
    input:
      | { action: 'pledge'; pledgeText: string }
      | { action: 'skip_pledge' }
      | {
          action: 'review';
          keptPromise: boolean;
          difficulty: RecoveryDifficulty;
          triggerTags?: string[];
          notes?: string;
        }
  ) => Promise<void>;
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-2 py-2 text-center ring-1 ring-slate-200">
      <p className="text-xl font-black tabular-nums text-slate-950">
        {String(value).padStart(2, '0')}
      </p>
      <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function RecoveryHabitCard({
  habit,
  value,
  checkIn,
  saving,
  onValueChange,
  onSaveValue,
  onSaveRecoveryCheckIn,
}: RecoveryHabitCardProps) {
  const metric = getHabitMetric(habit);
  const [nowMs, setNowMs] = React.useState(Date.now());
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isRelapseOpen, setIsRelapseOpen] = React.useState(false);
  const [difficulty, setDifficulty] = React.useState<RecoveryDifficulty>(3);
  const [keptPromise, setKeptPromise] = React.useState(true);
  const [notes, setNotes] = React.useState('');
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const duration = getSoberDuration(habit, nowMs);
  const milestone = getNextRecoveryMilestone(habit, nowMs);
  const state = getRecoveryCheckInState(checkIn);
  const pledgeText = checkIn?.pledge_text || buildDailyPledgeText(habit);

  async function handlePledge() {
    setPending(true);
    try {
      await onSaveRecoveryCheckIn(habit.id, { action: 'pledge', pledgeText });
    } finally {
      setPending(false);
    }
  }

  async function handleSkipPledge() {
    setPending(true);
    try {
      await onSaveRecoveryCheckIn(habit.id, { action: 'skip_pledge' });
    } finally {
      setPending(false);
    }
  }

  async function handleReview() {
    setPending(true);
    try {
      await onSaveRecoveryCheckIn(habit.id, {
        action: 'review',
        keptPromise,
        difficulty,
        notes: notes.trim() || undefined,
      });
      setIsReviewOpen(false);
      if (!keptPromise) {
        setIsRelapseOpen(true);
      }
    } finally {
      setPending(false);
    }
  }

  async function confirmRelapse(factor: RelapseFactor) {
    const nextValue = addHabitMetricValue(habit, value, metric.stepValue);
    setPending(true);
    try {
      onValueChange(habit.id, nextValue);
      await onSaveValue(habit.id, nextValue, { relapseFactor: factor });
      await onSaveRecoveryCheckIn(habit.id, {
        action: 'review',
        keptPromise: false,
        difficulty,
        triggerTags: [factor],
        notes: notes.trim() || undefined,
      });
      setIsRelapseOpen(false);
      toast.warning('Recaída registrada', {
        description: 'El reloj se reajusta, pero el historial sigue ayudando a detectar patrones.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <motion.article
        layout
        className="w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-white"
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              <Shield className="h-3.5 w-3.5 text-cyan-600" />
              Recuperación
            </div>
            <h3 className="mt-2 truncate text-lg font-black tracking-tight text-slate-950">
              {habit.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsRelapseOpen(true)}
            disabled={pending || saving}
            className="inline-flex min-h-[40px] min-w-0 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-[10px] font-black uppercase tracking-wider text-rose-700 transition active:scale-95 disabled:opacity-50 max-[390px]:w-full"
          >
            <TriangleAlert className="h-4 w-4" />
            Necesito registrar
          </button>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <TimeBlock value={duration.days} label="días" />
          <TimeBlock value={duration.hours} label="horas" />
          <TimeBlock value={duration.minutes} label="min" />
          <TimeBlock value={duration.seconds} label="seg" />
        </div>

        <div className="mt-3 rounded-2xl bg-cyan-50 p-3 ring-1 ring-cyan-100">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">
                Próximo hito
              </p>
              <p className="mt-1 truncate text-sm font-black text-slate-950">{milestone.label}</p>
            </div>
            <div className="shrink-0 rounded-xl bg-white px-3 py-1 text-right text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
              {milestone.remainingDays === 0 ? 'Hoy' : `faltan ${milestone.remainingDays}d`}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {state.hasPledged ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{pledgeText}</span>
            </div>
          ) : state.skippedPledge ? (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-800">
              <Flag className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                Promesa omitida hoy. El reloj no se reinicia; la revisión sigue abierta.
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <Flag className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                <p className="text-sm font-bold leading-5 text-slate-700">{pledgeText}</p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <button
                  type="button"
                  onClick={handlePledge}
                  disabled={pending}
                  className="min-h-[44px] rounded-2xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 disabled:opacity-50"
                >
                  Hacer promesa
                </button>
                <button
                  type="button"
                  onClick={handleSkipPledge}
                  disabled={pending}
                  className="min-h-[44px] rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition active:scale-95 disabled:opacity-50"
                >
                  Hoy no
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            disabled={pending}
            className={`inline-flex min-h-[48px] min-w-0 flex-wrap items-center justify-center gap-2 rounded-2xl px-4 text-center text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50 ${
              state.hasReview
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'bg-cyan-600 text-white shadow-sm'
            }`}
          >
            {state.hasReview ? <Check className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {state.hasReview
              ? `Review hecha · dificultad ${state.difficulty ?? '-'}/5`
              : 'Revisión nocturna'}
          </button>
        </div>
      </motion.article>

      <BottomSheet
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Revisión nocturna"
      >
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Promesa de hoy
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{pledgeText}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKeptPromise(true)}
              className={`min-h-[48px] rounded-2xl text-sm font-black transition active:scale-95 ${
                keptPromise
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              La mantuve
            </button>
            <button
              type="button"
              onClick={() => setKeptPromise(false)}
              className={`min-h-[48px] rounded-2xl text-sm font-black transition active:scale-95 ${
                !keptPromise
                  ? 'bg-rose-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              Tuve una recaída
            </button>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Dificultad
            </p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level as RecoveryDifficulty)}
                  className={`h-11 rounded-2xl text-sm font-black transition active:scale-95 ${
                    difficulty === level
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 500))}
            placeholder="Nota opcional"
            className="min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:bg-white"
          />

          <button
            type="button"
            onClick={handleReview}
            disabled={pending}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 disabled:opacity-50"
          >
            <HeartPulse className="h-4 w-4" />
            Guardar revisión
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={isRelapseOpen}
        onClose={() => setIsRelapseOpen(false)}
        title="Registrar con cuidado"
      >
        <div className="space-y-4 pb-6">
          <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
              Sin juicio
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-rose-800">
              Registra qué lo detonó. Esto reajusta el reloj y conserva el patrón para prevenir el
              próximo episodio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['stress', 'Estrés'],
              ['social', 'Social'],
              ['boredom', 'Aburrimiento'],
              ['craving', 'Antojo'],
              ['other', 'Otro'],
            ].map(([factor, label]) => (
              <button
                key={factor}
                type="button"
                onClick={() => confirmRelapse(factor as RelapseFactor)}
                disabled={pending}
                className="min-h-[44px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 className="h-4 w-4" />
            El contador vuelve a empezar desde este registro.
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
