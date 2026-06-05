'use client';

import React from 'react';
const Sparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-slate-400" aria-hidden="true" {...props}>
    <path d="M12 2l1.5 4L18 8l-4.5 2L12 14l-1.5-4L6 8l4.5-2L12 2z" />
  </svg>
);
import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';
import { type DailyLog } from '@/lib/schema';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

export default function HistoryCard({ log, onOpen }: { log: HistoryLog; onOpen: () => void }) {
  const summary = log.ai_data?.metricas ?? null;
  const [imgSrc, setImgSrc] = React.useState(log.avatar_image_url || '');

  React.useEffect(() => {
    if (log.avatar_image_url) setImgSrc(log.avatar_image_url);
  }, [log.avatar_image_url]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/80 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-900/20"
    >
      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
        <div className="relative">
          <div className="aspect-[4/5] w-full bg-gradient-to-b from-slate-100 to-slate-200">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`Bio-Avatar del ${formatSpanishDate(log.date)}`}
                className="h-full w-full object-cover"
                onError={() => setImgSrc('/default-avatar.png')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(226,232,240,0.92))]">
                <Sparkles className="h-10 w-10 text-slate-400" />
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md">
              {formatShortHeader(log.date)}
            </div>
            <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              {log.health_momentum}%
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Día</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{formatSpanishDate(log.date)}</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Inercia</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{log.health_momentum}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Resumen</p>
              <p className="mt-1 text-sm text-slate-700 line-clamp-2">{summary?.accion_manana ?? '—'}</p>
            </div>
          </div>

          {/* Tap hint */}
          <div className="pt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400 font-semibold">
            <span>Ver detalles</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
      </div>
    </button>
  );
}
