import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Droplets, Hash, Timer } from 'lucide-react';
import type { CreateHabitInput } from '@/hooks/useHabits';
import type { HabitMetricType, HabitType } from '@/types/habits';

interface HabitCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateHabitInput) => Promise<void>;
}

const metricOptions: Array<{
  type: HabitMetricType;
  label: string;
  unit: string;
  step: number;
  target: number;
  icon: React.ElementType;
}> = [
  { type: 'boolean', label: 'Hecho', unit: 'hecho', step: 1, target: 1, icon: Check },
  { type: 'counter', label: 'Contador', unit: 'veces', step: 1, target: 1, icon: Hash },
  { type: 'volume', label: 'Volumen', unit: 'ml', step: 250, target: 2000, icon: Droplets },
  { type: 'duration', label: 'Duración', unit: 'min', step: 15, target: 30, icon: Timer },
];

function getMetricDefaults(metricType: HabitMetricType) {
  return metricOptions.find((option) => option.type === metricType) ?? metricOptions[1];
}

export default function HabitCreateModal({ isOpen, onClose, onCreate }: HabitCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<HabitType>('negative');
  const [metricType, setMetricType] = useState<HabitMetricType>('counter');
  const [targetValue, setTargetValue] = useState(1);
  const [unitLabel, setUnitLabel] = useState('recaídas');
  const [stepValue, setStepValue] = useState(1);
  const [maxValue, setMaxValue] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function applyMetric(nextMetricType: HabitMetricType) {
    const defaults = getMetricDefaults(nextMetricType);
    setMetricType(nextMetricType);
    setTargetValue(type === 'negative' ? 0 : defaults.target);
    setUnitLabel(type === 'negative' ? 'recaídas' : defaults.unit);
    setStepValue(defaults.step);
    setMaxValue(nextMetricType === 'boolean' ? 1 : nextMetricType === 'volume' ? 10000 : '');
  }

  function applyType(nextType: HabitType) {
    setType(nextType);
    if (nextType === 'negative') {
      setMetricType('counter');
      setTargetValue(0);
      setUnitLabel('recaídas');
      setStepValue(1);
      setMaxValue('');
      return;
    }

    const defaults = getMetricDefaults(metricType === 'counter' ? 'boolean' : metricType);
    setMetricType(defaults.type);
    setTargetValue(defaults.target);
    setUnitLabel(defaults.unit);
    setStepValue(defaults.step);
    setMaxValue(defaults.type === 'volume' ? 10000 : defaults.type === 'boolean' ? 1 : '');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;

    setSubmitting(true);
    try {
      await onCreate({
        name: trimmedName,
        type,
        targetValue: type === 'negative' ? 0 : Math.max(1, targetValue),
        metricType,
        unitLabel: unitLabel.trim() || null,
        stepValue: Math.max(0.0001, stepValue),
        tolerance: type === 'negative' ? 0 : 0,
        metricConfig: {
          min: 0,
          max: maxValue === '' ? undefined : Math.max(0, Number(maxValue)),
          precision: Number.isInteger(stepValue) ? 0 : 2,
          presets:
            metricType === 'volume' ? [stepValue, stepValue * 2, stepValue * 4] : [stepValue],
          base_unit: unitLabel.trim() || undefined,
          display_unit: unitLabel.trim() || undefined,
        },
      });
      setName('');
      applyType('negative');
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
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Define qué quieres registrar.
              </p>
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
              <label
                className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                htmlFor="new-habit-name"
              >
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
              <label
                className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                htmlFor="new-habit-type"
              >
                Tipo de hábito
              </label>
              <select
                id="new-habit-type"
                value={type}
                onChange={(event) => applyType(event.target.value as HabitType)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100 cursor-pointer"
              >
                <option value="positive">Positivo (A cumplir)</option>
                <option value="negative">Negativo (A evitar)</option>
              </select>
            </div>

            {type === 'positive' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Métrica
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {metricOptions.map((option) => {
                    const Icon = option.icon;
                    const active = metricType === option.type;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => applyMetric(option.type)}
                        className={`flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black uppercase tracking-wider transition ${
                          active
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Meta
                </span>
                <input
                  type="number"
                  min={type === 'negative' ? 0 : 1}
                  value={targetValue}
                  disabled={type === 'negative'}
                  onChange={(event) => setTargetValue(Number(event.target.value))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-black text-slate-950 outline-none disabled:text-slate-400"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Unidad
                </span>
                <input
                  value={unitLabel}
                  onChange={(event) => setUnitLabel(event.target.value.slice(0, 32))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-black text-slate-950 outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Paso
                </span>
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={stepValue}
                  onChange={(event) => setStepValue(Number(event.target.value))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-black text-slate-950 outline-none"
                />
              </label>
            </div>

            {metricType !== 'boolean' ? (
              <label className="space-y-2">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Límite diario opcional
                </span>
                <input
                  type="number"
                  min={0}
                  value={maxValue}
                  onChange={(event) =>
                    setMaxValue(event.target.value === '' ? '' : Number(event.target.value))
                  }
                  placeholder="Sin límite"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                />
              </label>
            ) : null}

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
