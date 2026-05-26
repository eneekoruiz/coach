'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { History, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';

import { logout } from '@/app/login/actions';
import { triggerVibration } from '@/lib/haptics';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { supabase } from '@/lib/supabase';
import ChatInput from '@/components/ChatInput';
import { useDashboard } from '@/hooks/useDashboard';
import Link from 'next/link';

type DailyLogRow = {
  health_momentum: number;
  ai_data: unknown;
  date: string;
};

const fallbackLog: DailyLog = {
  comidas: [],
  hidratacion_ml: 0,
  toxinas: [],
  bio_avatar: {
    estado_fisiologico: 'equilibrio estable',
    energia_fisica: 3,
    claridad_mental: 3,
  },
  metricas: {
    variacion_inercia: 0,
    aciertos: [],
    error_clave: 'sin datos todavía',
    accion_manana: 'registra el primer log para activar el seguimiento',
  },
};

function clampMomentum(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getThemeFromMomentum(momentum: number) {
  if (momentum >= 75) {
    return {
      background:
        'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(230,246,244,0.92)_38%,_rgba(202,232,226,0.88)_100%)]',
      accent: 'from-emerald-300/25 via-cyan-200/20 to-transparent',
      glass: 'border-white/70 bg-white/65',
      text: 'text-slate-900',
      subtext: 'text-slate-600',
    };
  }

  if (momentum >= 40) {
    return {
      background:
        'bg-[radial-gradient(circle_at_top,_rgba(246,247,249,0.98),_rgba(224,228,233,0.92)_48%,_rgba(203,208,215,0.9)_100%)]',
      accent: 'from-slate-300/35 via-sky-200/15 to-transparent',
      glass: 'border-white/60 bg-white/55',
      text: 'text-slate-900',
      subtext: 'text-slate-600',
    };
  }

  return {
    background:
      'bg-[radial-gradient(circle_at_top,_rgba(245,246,248,0.98),_rgba(208,214,222,0.95)_45%,_rgba(168,176,188,0.92)_100%)]',
    accent: 'from-slate-400/35 via-slate-500/20 to-transparent',
    glass: 'border-white/55 bg-white/45',
    text: 'text-slate-900',
    subtext: 'text-slate-600',
  };
}

function CircularMomentum({ value }: { value: number }) {
  const normalized = clampMomentum(value);
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" stroke="rgba(148,163,184,0.22)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          stroke="url(#momentum-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <defs>
          <linearGradient id="momentum-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-slate-900">{normalized}</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Momentum</span>
      </div>
    </div>
  );
}

function BioAvatarSilhouette({
  isXRayMode,
  estadoFisiologico,
}: {
  isXRayMode: boolean;
  estadoFisiologico: string;
}) {
  return (
    <motion.div
      animate={{
        opacity: isXRayMode ? 0.18 : 1,
        scale: isXRayMode ? 0.985 : 1,
        filter: isXRayMode
          ? 'grayscale(0.95) contrast(1.35) brightness(0.96)'
          : 'grayscale(0) contrast(1) brightness(1)',
      }}
      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className="relative mx-auto flex aspect-square w-[min(78vw,26rem)] items-center justify-center"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95),_rgba(255,255,255,0.05)_70%,_transparent_100%)] blur-2xl" />
      <div className="absolute inset-8 rounded-full border border-white/60 bg-white/20 shadow-[0_0_120px_rgba(255,255,255,0.28)] backdrop-blur-2xl" />
      <svg
        viewBox="0 0 520 520"
        className="relative z-10 h-full w-full drop-shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
      >
        <defs>
          <linearGradient id="avatar-fill" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="avatar-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>
        <g>
          <path
            d="M174 144c18-42 63-70 116-70 66 0 124 42 142 103 7 25 5 50-4 72 20 16 33 42 33 70 0 50-37 91-86 97-12 47-56 82-108 82s-96-35-108-82c-49-6-86-47-86-97 0-33 17-62 43-78-10-23-12-49-4-74 7-22 22-42 42-55z"
            fill="url(#avatar-fill)"
            stroke="url(#avatar-line)"
            strokeOpacity="0.15"
            strokeWidth="8"
          />
          <path
            d="M184 201c20 12 35 30 44 52 4 9 16 14 26 10 13-5 28-7 45-7s32 2 45 7c10 4 22-1 26-10 9-22 24-40 44-52"
            fill="none"
            stroke="rgba(14,165,233,0.24)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle cx="205" cy="244" r="14" fill="rgba(15,23,42,0.82)" />
          <circle cx="315" cy="244" r="14" fill="rgba(15,23,42,0.82)" />
          <path
            d="M248 284c8 10 26 10 34 0"
            fill="none"
            stroke="rgba(15,23,42,0.75)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M132 164c-24 12-42 31-53 57 24 3 44 9 63 22"
            fill="none"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M388 164c24 12 42 31 53 57-24 3-44 9-63 22"
            fill="none"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M196 342c17 18 41 29 66 29 24 0 48-11 65-29"
            fill="none"
            stroke="rgba(15,23,42,0.5)"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="absolute bottom-8 rounded-full border border-white/60 bg-white/65 px-4 py-2 text-center shadow-lg backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Bio-Avatar</p>
        <p className="text-sm font-medium text-slate-900">{estadoFisiologico}</p>
      </div>
    </motion.div>
  );
}

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function Page() {
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { isLoading, lastLog, momentum, reload } = useDashboard();

  const theme = useMemo(() => getThemeFromMomentum(momentum), [momentum]);
  const displayLog = lastLog ?? fallbackLog;
  const energyLevel = displayLog.bio_avatar.energia_fisica;
  const mentalClarity = displayLog.bio_avatar.claridad_mental;

  const setRayXModeFromGesture = (nextValue: boolean) => setIsXRayMode(nextValue);

  return (
    <main
      className={`relative min-h-dvh overflow-x-hidden overflow-y-auto ${theme.background} ${theme.text}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent}`} />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative z-10 flex min-h-dvh flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header
          className={`rounded-[2rem] border px-4 py-4 shadow-[0_14px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-5 ${theme.glass}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Gemelo Digital Fisiológico
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-3xl">
                Dashboard del Bio-Avatar
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              <div className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-center text-sm text-slate-700 backdrop-blur-xl sm:px-4 sm:text-left">
                Inercia actual: <span className="font-semibold text-slate-900">{momentum}</span>
              </div>
              <Link
                href="/history"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <History className="h-4 w-4" />
                Historia
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </form>
              <button
                type="button"
                onPointerDown={() => {
                  triggerVibration('light');
                  setRayXModeFromGesture(true);
                }}
                onPointerUp={() => setRayXModeFromGesture(false)}
                onPointerCancel={() => setRayXModeFromGesture(false)}
                onMouseDown={() => {
                  triggerVibration('light');
                  setRayXModeFromGesture(true);
                }}
                onMouseUp={() => setRayXModeFromGesture(false)}
                onMouseLeave={() => setRayXModeFromGesture(false)}
                onTouchStart={() => {
                  triggerVibration('light');
                  setRayXModeFromGesture(true);
                }}
                onTouchEnd={() => setRayXModeFromGesture(false)}
                className="rounded-full border border-slate-900/10 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.98]"
              >
                Mantener para Rayos X
              </button>
            </div>
          </div>
        </header>

        <section className="relative mt-4 flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/60 bg-white/20 shadow-[0_18px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
            <motion.div
              className="absolute inset-0"
              animate={{ opacity: isXRayMode ? 1 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.18),_transparent_52%)]" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-200 to-transparent opacity-70" />
            </motion.div>

            <div className="relative z-10 flex w-full flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
              {isLoading ? (
                <div className="flex min-h-[16rem] w-full items-center justify-center rounded-[2rem] border border-dashed border-white/60 bg-white/30 px-4 text-center text-sm text-slate-600 sm:min-h-[20rem]">
                  Cargando el último registro...
                </div>
              ) : null}

              <BioAvatarSilhouette
                isXRayMode={isXRayMode}
                estadoFisiologico={displayLog.bio_avatar.estado_fisiologico}
              />

              <motion.div
                className="mt-6 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                animate={{ opacity: isXRayMode ? 1 : 0.96, y: isXRayMode ? -2 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <CircularMomentum value={momentum} />
                <MetricChip label="Energía física" value={`${energyLevel}/5`} />
                <MetricChip label="Claridad mental" value={`${mentalClarity}/5`} />
                <MetricChip label="Hidratación" value={`${displayLog.hidratacion_ml} ml`} />
              </motion.div>
            </div>

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
                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.05, duration: 0.25 }}
                      className={`rounded-[1.8rem] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${theme.glass}`}
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
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                            Aciertos
                          </p>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {displayLog.metricas.aciertos.length > 0 ? (
                              displayLog.metricas.aciertos.map((item) => (
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
                          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                            Error clave
                          </p>
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
                    </motion.div>

                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.25 }}
                      className={`rounded-[1.8rem] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl ${theme.glass}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                        Lectura estructurada
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        Estado metabólico
                      </h2>

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
                          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                            Toxinas
                          </p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {displayLog.toxinas.length > 0
                              ? displayLog.toxinas.join(', ')
                              : 'Ninguna'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <button
        type="button"
        aria-label="Abrir chat"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)] transition hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M7 8h10M7 12h6m-6 4h4" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M20 12c0 4.418-3.582 8-8 8-1.05 0-2.052-.2-2.97-.564L5 20l1.039-3.03A7.958 7.958 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8Z"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isChatOpen ? (
          <motion.aside
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-none p-0 sm:max-w-2xl sm:p-6"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            <ChatInput
              onUpdate={async () => {
                await loadDashboard();
              }}
            />
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
