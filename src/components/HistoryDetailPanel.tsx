'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { formatSpanishDate, formatShortHeader } from '@/lib/date-utils';
import { type DailyLog } from '@/lib/schema';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface HistoryDetailPanelProps {
  log: HistoryLog;
  onBack: () => void;
}

export default function HistoryDetailPanel({ log, onBack }: HistoryDetailPanelProps) {
  const summary = log.ai_data?.metricas ?? null;
  const [imgSrc, setImgSrc] = React.useState(log.avatar_image_url || '');

  React.useEffect(() => {
    if (log.avatar_image_url) setImgSrc(log.avatar_image_url);
  }, [log.avatar_image_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full bg-white/70 dark:bg-black/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-[0_22px_70px_rgba(15,23,42,0.08)]"
    >
      {/* Back Button & Date Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-6 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 py-2.5 px-4 rounded-full transition active:scale-95 shadow-sm self-start min-h-[44px] min-w-[120px] justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="text-right sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-extrabold">Historial Diario</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            {formatSpanishDate(log.date)}
          </h2>
        </div>
      </div>

      {/* Main Grid: Left side (Avatar & Momentum) | Right side (AI Insights & Structured Metrics) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Avatar Graphic Frame */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-white/5 relative aspect-square shadow-inner">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={`Bio-Avatar del ${formatSpanishDate(log.date)}`}
                className="h-full w-full object-cover"
                onError={() => setImgSrc('/default-avatar.png')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(226,232,240,0.92))] dark:bg-slate-950">
                <Sparkles className="h-12 w-12 text-slate-400 animate-pulse" />
              </div>
            )}

            {/* Float badges */}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <div className="rounded-full border border-white/60 bg-white/85 dark:bg-black/80 px-3 py-1.5 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest shadow-sm backdrop-blur-md">
                {formatShortHeader(log.date)}
              </div>
              <div className="rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 px-3 py-1.5 text-xs font-black shadow-lg">
                {log.health_momentum}% Inercia
              </div>
            </div>
          </div>

          {/* Quick stats panel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Agua</span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                {log.ai_data?.water_ml ?? log.ai_data?.hidratacion_ml ?? 0} <span className="text-xs text-slate-400 font-bold">ml</span>
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Calorías</span>
              <span className="text-xl font-black text-slate-800 dark:text-white">
                {log.ai_data?.total_kcal ?? 0} <span className="text-xs text-slate-400 font-bold">kcal</span>
              </span>
            </div>
          </div>
        </div>

        {/* Structured Data Columns */}
        <div className="lg:col-span-7 flex flex-col gap-4 justify-between">
          {summary ? (
            <div className="space-y-4">
              {/* Resumen / Acción de mañana */}
              <div className="bg-white/80 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex-shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Acción de Mañana</span>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {summary.accion_manana || 'No se registraron recomendaciones específicas.'}
                  </p>
                </div>
              </div>

              {/* Aciertos */}
              <div className="bg-white/80 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block mb-2">Aciertos Clave</span>
                  <div className="flex flex-wrap gap-2">
                    {summary.aciertos && summary.aciertos.length > 0 ? (
                      summary.aciertos.map((acierto: string) => (
                        <span
                          key={acierto}
                          className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm"
                        >
                          {acierto}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Ninguno registrado.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Error clave */}
              <div className="bg-white/80 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Foco de Atención / Error Clave</span>
                  <p className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {summary.error_clave || 'Ninguno detectado.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center flex-1">
              <Sparkles className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-500">
                Detalles analíticos no disponibles para este registro, pero el gemelo digital e historial base están listos.
              </p>
            </div>
          )}

          {/* Footer insight */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-white/5 dark:to-white/10 p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            ℹ️ Los datos de inercia y análisis estructurados se calculan automáticamente basándose en los registros de nutrición, hidratación y hábitos de cada jornada.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
