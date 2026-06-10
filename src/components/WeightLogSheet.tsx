'use client';

import React, { useMemo, useState } from 'react';

import BottomSheet from '@/components/BottomSheet';
import { saveBodyMetric } from '@/app/metrics/actions';
import toast from '@/lib/toast';
import { getNormalizedDate } from '@/lib/date-utils';

type WeightLogSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function WeightLogSheet({ isOpen, onClose }: WeightLogSheetProps) {
  const today = useMemo(() => getNormalizedDate(new Date()), []);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const numericWeight = Number(weight);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      toast.error('Introduce un peso válido.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveBodyMetric({
        date: today,
        weight: numericWeight,
        body_fat_percentage: bodyFat ? Number(bodyFat) : null,
        muscle_mass: muscleMass ? Number(muscleMass) : null,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'No se pudo guardar el peso.');
      }

      toast.success('Peso guardado.', {
        description: `${numericWeight} kg registrados para hoy.`,
      });
      setWeight('');
      setBodyFat('');
      setMuscleMass('');
      setNotes('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el peso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Registrar peso de hoy">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Peso (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-in-out focus:border-slate-300"
              placeholder="72.4"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Grasa (%)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={bodyFat}
              onChange={(event) => setBodyFat(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-in-out focus:border-slate-300"
              placeholder="18.2"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Masa muscular (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={muscleMass}
            onChange={(event) => setMuscleMass(event.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-in-out focus:border-slate-300"
            placeholder="31.5"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-in-out focus:border-slate-300"
            placeholder="Sensaciones, retención, contexto..."
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition-all duration-200 ease-in-out hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar métrica corporal'}
        </button>
      </div>
    </BottomSheet>
  );
}
