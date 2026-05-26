import React from 'react';
import Link from 'next/link';
const History = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M21 6v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
    <path d="M7 10h10" />
  </svg>
);

const LogOut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
import { logout } from '@/app/login/actions';
import { triggerVibration } from '@/lib/haptics';

export default function DashboardHeader({ theme, momentum, setRayXModeFromGesture }: any) {
  return (
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
  );
}
