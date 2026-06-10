'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { saveBodyMetric } from '@/app/metrics/actions';
import { type BodyMetric } from '@/lib/schema';
import toast from '@/lib/toast';
import { getNormalizedDate } from '@/lib/date-utils';

const metricOptions = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'arm_left', label: 'Brazo izq.', unit: 'cm' },
  { key: 'arm_right', label: 'Brazo dcho.', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'hip', label: 'Cadera', unit: 'cm' },
  { key: 'thigh', label: 'Muslo', unit: 'cm' },
] as const;

type MetricKey = (typeof metricOptions)[number]['key'];

type StatisticsBodySectionProps = {
  initialMetrics: BodyMetric[];
};

export default function StatisticsBodySection({ initialMetrics }: StatisticsBodySectionProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('waist');
  const [cadence, setCadence] = useState<'weekly' | 'monthly'>('weekly');
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    date: getNormalizedDate(new Date()),
    weight: '',
    chest: '',
    arm_left: '',
    arm_right: '',
    waist: '',
    hip: '',
    thigh: '',
    body_fat_percentage: '',
    muscle_mass: '',
    notes: '',
  });

  const selectedMeta = metricOptions.find((option) => option.key === selectedMetric) ?? metricOptions[0];

  const chartData = useMemo(
    () =>
      metrics
        .filter((metric) => metric[selectedMetric] !== null && metric[selectedMetric] !== undefined)
        .map((metric) => ({
          date: new Date(`${metric.date}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          value: Number(metric[selectedMetric] ?? 0),
        })),
    [metrics, selectedMetric]
  );

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const parseNullableNumber = (value: string) => {
    if (!value.trim()) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const weight = Number(form.weight);
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error('El peso es obligatorio para guardar la medición.');
      return;
    }

    startTransition(async () => {
      const result = await saveBodyMetric({
        date: form.date,
        weight,
        chest: parseNullableNumber(form.chest),
        arm_left: parseNullableNumber(form.arm_left),
        arm_right: parseNullableNumber(form.arm_right),
        waist: parseNullableNumber(form.waist),
        hip: parseNullableNumber(form.hip),
        thigh: parseNullableNumber(form.thigh),
        body_fat_percentage: parseNullableNumber(form.body_fat_percentage),
        muscle_mass: parseNullableNumber(form.muscle_mass),
        notes: form.notes.trim() || null,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo guardar la medición.');
        return;
      }

      setMetrics((current) => {
        const withoutSameDate = current.filter((item) => item.date !== result.data!.date);
        return [...withoutSameDate, result.data!].sort((a, b) => a.date.localeCompare(b.date));
      });
      setForm((current) => ({ ...current, notes: '' }));
      toast.success('Medición corporal guardada.');
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Registro rápido</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Nueva medición</h3>
          </div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCadence('weekly')}
              className={`rounded-full px-3 py-1 text-[11px] font-black ${cadence === 'weekly' ? 'bg-white text-slate-900' : 'text-slate-500'}`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setCadence('monthly')}
              className={`rounded-full px-3 py-1 text-[11px] font-black ${cadence === 'monthly' ? 'bg-white text-slate-900' : 'text-slate-500'}`}
            >
              Mensual
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          Guarda peso y perímetros en el ritmo que mejor te encaje. La gráfica de la derecha se adapta al selector corporal.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['date', 'Fecha'],
            ['weight', 'Peso (kg)'],
            ['chest', 'Pecho (cm)'],
            ['arm_left', 'Brazo izq. (cm)'],
            ['arm_right', 'Brazo dcho. (cm)'],
            ['waist', 'Cintura (cm)'],
            ['hip', 'Cadera (cm)'],
            ['thigh', 'Muslo (cm)'],
            ['body_fat_percentage', 'Grasa %'],
            ['muscle_mass', 'Masa muscular (kg)'],
          ].map(([field, label]) => (
            <label key={field} className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
              <input
                type={field === 'date' ? 'date' : 'number'}
                inputMode={field === 'date' ? undefined : 'decimal'}
                step={field === 'date' ? undefined : '0.1'}
                value={form[field as keyof typeof form]}
                onChange={(event) => handleChange(field as keyof typeof form, event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
              />
            </label>
          ))}
        </div>

        <label className="mt-3 block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
            placeholder="Contexto, retención, ciclo, sensaciones..."
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? 'Guardando...' : 'Guardar medición'}
        </button>
      </form>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Lectura corporal</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">{selectedMeta.label}</h3>
          </div>
          <select
            value={selectedMetric}
            onChange={(event) => setSelectedMetric(event.target.value as MetricKey)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none"
          >
            {metricOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit={selectedMeta.unit} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={3} dot={{ r: 3, fill: '#0f172a' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 text-sm font-semibold text-slate-400">
              Todavía no hay suficientes datos para {selectedMeta.label.toLowerCase()}.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
