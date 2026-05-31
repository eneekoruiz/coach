import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { type DailyLog } from '@/lib/schema';

interface DashboardTheme {
  background: string;
  accent: string;
  glass: string;
  text: string;
  subtext: string;
}

export default function XRayOverlay({
  isXRayMode,
  theme,
  displayLog,
  momentum,
}: {
  isXRayMode: boolean;
  theme: DashboardTheme;
  displayLog: DailyLog;
  momentum: number;
}) {
  return (
    <AnimatePresence>
      {isXRayMode ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              className={`rounded-[1.8rem] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${theme?.glass ?? ''}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    Biometría del día
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
                    Métricas activas
                  </h2>
                </div>
                <div className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                  X-Ray Mode
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Aciertos</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {displayLog.metricas.aciertos.length > 0 ? (
                      displayLog.metricas.aciertos.map((item: string) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500">Sin aciertos registrados aún.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Error clave</p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {displayLog.metricas.error_clave}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">
                    Acción mañana
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {displayLog.metricas.accion_manana}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-[1.8rem] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${theme?.glass ?? ''}`}
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Lectura estructurada
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Estado metabólico</h2>

              <div className="mt-4 rounded-3xl border border-white/70 bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  Estado fisiológico
                </p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {displayLog.bio_avatar.estado_fisiologico}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${momentum}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Inercia fisiológica</span>
                  <span>{momentum}%</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    Hidratación
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {displayLog.hidratacion_ml} ml
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Toxinas</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {displayLog.toxinas.length > 0 ? displayLog.toxinas.join(', ') : 'Ninguna'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
