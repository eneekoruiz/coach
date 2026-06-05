'use client';

import React, { useState } from 'react';
import { Settings, Scan, Download, LogOut, Loader2 } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { triggerVibration } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import BottomSheet from '@/components/BottomSheet';

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
  streak: number;
  onOpenRayX: () => void;
  onOpenAchievements: () => void;
}

export default function DashboardHeader({
  theme,
  momentum,
  streak,
  onOpenRayX,
  onOpenAchievements,
}: DashboardHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    triggerVibration('light');
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/user/export', { headers });
      if (!res.ok) {
        throw new Error('Error en el servidor al exportar datos.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `bio-avatar-gdpr-export-${dateStr}.json`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Tus datos han sido exportados de forma segura');
    } catch (err) {
      console.error('[ExportData ERROR]', err);
      toast.error('No se pudieron exportar los datos. Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <header className="relative z-40 flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Left spacing to center the pill */}
        <div className="w-9 h-9" />

        {/* Center: Momentum Pill */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black tracking-wider shadow-sm transition-transform active:scale-95">
          <span className="opacity-80">INERCIA ACTUAL:</span>
          <span>{momentum}%</span>
        </div>

        {/* Right: Settings Icon */}
        <button
          type="button"
          onClick={() => {
            triggerVibration('light');
            setIsSettingsOpen(true);
          }}
          className="p-2 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all border border-slate-200/50 dark:border-slate-800/50 shadow-sm active:scale-95"
          aria-label="Ajustes"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Settings Bottom Sheet (vaul) */}
      <BottomSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Menú de Configuración"
      >
        <div className="flex flex-col gap-4 pb-4">
          {/* Option 1: Rayos X */}
          <button
            type="button"
            onClick={() => {
              triggerVibration('light');
              setIsSettingsOpen(false);
              onOpenRayX();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition-colors text-left border border-slate-100 dark:border-slate-800/60"
          >
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Scan className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Ver Análisis de Rayos X</p>
              <p className="text-[11px] text-slate-500">Visualiza métricas fisiológicas y de salud activas.</p>
            </div>
          </button>

          {/* Option 2: Export Data */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition-colors text-left border border-slate-100 dark:border-slate-800/60 disabled:opacity-60"
          >
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Exportar Datos (GDPR)</p>
              <p className="text-[11px] text-slate-500">Descarga tu historial metabólico completo en JSON.</p>
            </div>
          </button>

          {/* Option 3: Logout */}
          <form action={logout} className="w-full">
            <button
              type="submit"
              onClick={() => triggerVibration('light')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 transition-colors text-left border border-rose-100/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-450"
            >
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Salir</p>
                <p className="text-[11px] text-rose-500/80">Cierra la sesión actual de forma segura.</p>
              </div>
            </button>
          </form>
        </div>
      </BottomSheet>
    </>
  );
}
