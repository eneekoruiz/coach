'use client';

import React from 'react';

import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';
import { type DailyLog } from '@/lib/schema';

const Sparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-slate-400" aria-hidden="true" {...props}>
    <path d="M12 2l1.5 4L18 8l-4.5 2L12 14l-1.5-4L6 8l4.5-2L12 2z" />
  </svg>
);

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

type MoodSnapshot = {
  mood_score: number | null;
  valence_score: number | null;
};

function getMoodBadge(moodEntry?: MoodSnapshot) {
  const score = Number(moodEntry?.valence_score ?? moodEntry?.mood_score ?? 3);
  if (score <= 2) {
    return { label: 'Desagradable', className: 'border-rose-200 bg-rose-50 text-rose-700' };
  }
  if (score < 3.5) {
    return { label: 'Neutral', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }
  return { label: 'Positivo', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
}

export default function HistoryCard({
  log,
  moodEntry,
  onOpen,
}: {
  log: HistoryLog;
  moodEntry?: MoodSnapshot;
  onOpen: () => void;
}) {
  const summary = log.ai_data?.metricas ?? null;
  const [imgSrc, setImgSrc] = React.useState(log.avatar_image_url || '');
  const moodBadge = getMoodBadge(moodEntry);

  React.useEffect(() => {
    if (log.avatar_image_url) setImgSrc(log.avatar_image_url);
  }, [log.avatar_image_url]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-900/20"
    >
      <div className="absolute bottom-0 left-6 top-0 w-px bg-slate-200" aria-hidden="true" />
      <div className="grid gap-4 p-5 sm:grid-cols-[84px_minmax(0,1fr)]">
        <div className="relative z-10 flex items-start justify-center sm:justify-start">
          <div className="h-[92px] w-[84px] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-100 shadow-sm">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`Bio-Avatar del ${formatSpanishDate(log.date)}`}
                className="h-full w-full object-cover"
                onError={() => setImgSrc('/default-avatar.png')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(226,232,240,0.92))]">
                <Sparkles className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                {formatShortHeader(log.date)}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{formatSpanishDate(log.date)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${moodBadge.className}`}>
                {moodBadge.label}
              </span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                {log.health_momentum}% inercia
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Nutrición</p>
              <p className="mt-1 text-sm font-black text-slate-900">{log.ai_data?.total_kcal ?? 0} kcal</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Agua</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {log.ai_data?.water_ml ?? log.ai_data?.hidratacion_ml ?? 0} ml
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Foco</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-600">
                {summary?.accion_manana ?? 'Sin resumen todavía'}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 text-sm font-semibold leading-6 text-slate-600">
            {summary?.error_clave ? (
              <p>
                Punto sensible: <span className="font-black text-slate-900">{summary.error_clave}</span>
              </p>
            ) : (
              <p>Toque limpio del día con lectura rápida de energía, comida y continuidad.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-400">
            <span>Ver detalles</span>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
      </div>
    </button>
  );
}
