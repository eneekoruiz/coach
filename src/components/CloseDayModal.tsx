import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function CloseDayModal({ closeDayFeedback, onClose }: any) {
  if (!closeDayFeedback) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 px-2 py-2 backdrop-blur-md sm:items-center sm:px-4 sm:py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative flex max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[1.5rem] bg-white p-3 shadow-[0_28px_90px_rgba(15,23,42,0.32)] sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-[2rem] sm:p-4"
          initial={{ scale: 0.94, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 14, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <div className="flex items-start justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Cierre del día
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
                Tu Bio-Avatar final
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Cerrar cierre del día"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 overflow-y-auto pr-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-50">
              <div className="relative aspect-square bg-slate-900/5">
                <img
                  src={closeDayFeedback.imageUrl}
                  alt="Bio-Avatar final generado con IA"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-4 py-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">
                    Prompt visual
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/90">
                    {closeDayFeedback.prompt_imagen}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-white p-4">
              <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">
                  Puntuación global
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-5xl font-semibold leading-none">
                    {closeDayFeedback.puntuacion_global}
                  </p>
                  <p className="text-sm text-white/75">/ 100</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Aciertos</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {closeDayFeedback.aciertos.map((item: string) => (
                    <span
                      key={item}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Error clave
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {closeDayFeedback.error_clave}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-700">
                    Acción mañana
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-emerald-950">
                    {closeDayFeedback.accion_manana}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
