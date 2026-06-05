'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';
import { type DailyLog } from '@/lib/schema';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface HistoryDetailModalProps {
  log: HistoryLog;
  onClose: () => void;
}

const Sparkles = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" {...props}>
    <path d="M12 2l1.5 4L18 8l-4.5 2L12 14l-1.5-4L6 8l4.5-2L12 2z" />
  </svg>
);

export default function HistoryDetailModal({ log, onClose }: HistoryDetailModalProps) {
  const summary = log.ai_data?.metricas ?? null;
  const [imgSrc, setImgSrc] = React.useState(log.avatar_image_url || '');

  React.useEffect(() => {
    if (log.avatar_image_url) setImgSrc(log.avatar_image_url);
  }, [log.avatar_image_url]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[3rem] border border-t border-slate-200 dark:border-slate-800 shadow-2xl z-10 overflow-y-auto max-h-[90dvh]"
        >
          {/* Top Pull Bar */}
          <div className="sticky top-0 pt-3 pb-0 flex justify-center z-10 bg-white dark:bg-slate-900 rounded-t-[3rem]">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="px-6 pt-4 pb-10 space-y-5">
            {/* Avatar */}
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
              </div>
            </div>

            {/* Detail sections */}
            {summary ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/80 bg-white dark:bg-slate-800 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Acción de mañana</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-200">{summary.accion_manana}</p>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white dark:bg-slate-800 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Aciertos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summary.aciertos.length > 0 ? (
                      summary.aciertos.map((item: string) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">Sin aciertos registrados.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white dark:bg-slate-800 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Error clave</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-200">{summary.error_clave}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                El resumen estructurado de este día no pudo validarse, pero la imagen histórica sigue disponible.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
