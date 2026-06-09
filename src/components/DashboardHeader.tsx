import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';

interface DashboardTheme {
  background: string;
  accent: string;
  glass: string;
  text: string;
  subtext: string;
}

interface DashboardHeaderProps {
  theme: DashboardTheme;
  momentum: number;
  pendingSyncCount: number;
}

export default function DashboardHeader({
  theme,
  momentum,
  pendingSyncCount,
}: DashboardHeaderProps) {
  void theme;

  return (
    <header className="relative z-40 mx-auto flex w-full max-w-4xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Hoy / Ahora</p>
        <p className="mt-0.5 text-sm font-black text-slate-900">Enterprise HUD</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">
          {Math.round(momentum)}%
        </div>
        <div
          className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.12em] ${
            pendingSyncCount > 0
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {pendingSyncCount > 0 ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
          {pendingSyncCount > 0 ? `${pendingSyncCount} pendiente` : 'Sync OK'}
        </div>
      </div>
    </header>
  );
}
