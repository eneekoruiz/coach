'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [imgSrc, setImgSrc] = useState(log.avatar_image_url || '');
  const [mounted, setMounted] = useState(false);
  const [snapIndex, setSnapIndex] = useState(0); // 0 = 60%, 1 = 95%

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (log.avatar_image_url) setImgSrc(log.avatar_image_url);
  }, [log.avatar_image_url]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-end justify-center pointer-events-none">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Snap Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ 
            y: 0,
            height: snapIndex === 0 ? '60dvh' : '95dvh'
          }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={(e: any, info: any) => {
            // Dragged down
            if (info.offset.y > 100) {
              if (snapIndex === 1) {
                setSnapIndex(0); // Snap down to 60%
              } else {
                onClose(); // Close
              }
            }
            // Dragged up
            else if (info.offset.y < -100) {
              if (snapIndex === 0) {
                setSnapIndex(1); // Snap up to 95%
              }
            }
          }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-10 flex flex-col pointer-events-auto select-none overflow-hidden"
        >
          {/* Top Pull Bar & Drag Handle */}
          <div 
            onClick={() => setSnapIndex(prev => prev === 0 ? 1 : 0)}
            className="w-full pt-4 pb-2 flex justify-center cursor-row-resize shrink-0"
          >
            <div className="w-12 h-1.5 bg-slate-250 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-450 font-bold mb-0.5">Historial Diario</p>
              <h3 className="text-xl font-black text-slate-950 dark:text-white tracking-tight">{formatSpanishDate(log.date)}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
            {/* Avatar Image Card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
              <div className="relative">
                <div className="aspect-[16/10] w-full bg-gradient-to-b from-slate-100 to-slate-200">
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
                  <div className="rounded-full border border-white/60 bg-white/85 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md">
                    {formatShortHeader(log.date)}
                  </div>
                  <div className="rounded-full bg-slate-950 dark:bg-white dark:text-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                    {log.health_momentum}% Inercia
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-white dark:bg-slate-905 border-t border-slate-100 dark:border-slate-800">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Inercia Fisiológica</p>
                    <p className="mt-1 text-sm font-semibold text-slate-850 dark:text-slate-250">{log.health_momentum}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Recomendación</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-350 line-clamp-2">{summary?.accion_manana ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail sections */}
            {summary ? (
              <div className="space-y-3 pb-8">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-405 font-bold">Acción de mañana</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-750 dark:text-slate-200">{summary.accion_manana}</p>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-455 font-bold">Aciertos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summary.aciertos.length > 0 ? (
                      summary.aciertos.map((item: string) => (
                        <span
                          key={item}
                          className="rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-305"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">Sin aciertos registrados.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-455 font-bold">Error clave</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-750 dark:text-slate-200">{summary.error_clave}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-450 pb-8">
                El resumen estructurado de este día no pudo validarse, pero la imagen histórica sigue disponible.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
