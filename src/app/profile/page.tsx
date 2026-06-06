'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, LogOut, User, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { triggerVibration } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setIsLoadingUser(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || 'Usuario');
        }
      } catch (err) {
        console.error('Error fetching user email:', err);
      } finally {
        setIsLoadingUser(false);
      }
    }
    loadUser();
  }, []);

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
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(243,247,250,0.95)_38%,_rgba(225,232,240,0.96)_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        
        {/* Header bar */}
        <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => triggerVibration('light')}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Volver al inicio"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.38em] text-slate-500">
                Ajustes de Cuenta
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Perfil de Usuario
              </h1>
            </div>
          </div>
        </header>

        {/* User Card */}
        <section className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {isLoadingUser ? 'Cargando...' : userEmail}
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Usuario de Bio-Avatar
            </p>
          </div>
        </section>

        {/* Settings options */}
        <section className="flex flex-col gap-4">
          
          {/* Option: Export GDPR Data */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white hover:bg-slate-50 transition-colors text-left border border-slate-200 shadow-sm disabled:opacity-60"
          >
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
              {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900 text-sm">Exportar Historial (GDPR)</p>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">Descarga todo tu historial fisiológico y metabólico en JSON.</p>
            </div>
          </button>

          {/* Option: Sign Out */}
          <form action={logout} className="w-full">
            <button
              type="submit"
              onClick={() => triggerVibration('light')}
              className="w-full flex items-center gap-4 p-5 rounded-3xl bg-rose-50/20 hover:bg-rose-50/50 transition-colors text-left border border-rose-100 text-rose-600 shadow-sm"
            >
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm text-rose-700">Cerrar Sesión</p>
                <p className="text-xs text-rose-500/80 mt-0.5 font-semibold">Salir de tu cuenta de forma segura en este dispositivo.</p>
              </div>
            </button>
          </form>

        </section>
        
      </div>
    </div>
  );
}
