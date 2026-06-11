'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, LogOut, User, Loader2, ArrowLeft, Shield, Mail, Fingerprint, Activity, FileText } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { triggerVibration } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { FEATURE_FLAGS } from '@/lib/config/features';
import StatisticsBodySection from '@/components/StatisticsBodySection';
import BottomSheet from '@/components/BottomSheet';
import { type BodyMetric } from '@/lib/schema';

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isBodySheetOpen, setIsBodySheetOpen] = useState(false);

  useEffect(() => {
    async function loadUserDataAndMetrics() {
      setIsLoadingUser(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || '');
          
          // Load Body Metrics for current user
          const { data: metricsData, error: metricsError } = await supabase
            .from('body_metrics')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });
          
          if (!metricsError && metricsData) {
            setBodyMetrics(metricsData.map((metric: any) => ({
              ...metric,
              weight: Number(metric.weight),
              chest: metric.chest === null || metric.chest === undefined ? null : Number(metric.chest),
              arm_left: metric.arm_left === null || metric.arm_left === undefined ? null : Number(metric.arm_left),
              arm_right: metric.arm_right === null || metric.arm_right === undefined ? null : Number(metric.arm_right),
              waist: metric.waist === null || metric.waist === undefined ? null : Number(metric.waist),
              hip: metric.hip === null || metric.hip === undefined ? null : Number(metric.hip),
              thigh: metric.thigh === null || metric.thigh === undefined ? null : Number(metric.thigh),
              body_fat_percentage: metric.body_fat_percentage === null || metric.body_fat_percentage === undefined ? null : Number(metric.body_fat_percentage),
              muscle_mass: metric.muscle_mass === null || metric.muscle_mass === undefined ? null : Number(metric.muscle_mass),
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching user email/metrics:', err);
      } finally {
        setIsLoadingUser(false);
        setIsLoadingMetrics(false);
      }
    }
    loadUserDataAndMetrics();
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === userEmail) {
      toast.error('Introduce una dirección de correo válida y distinta a la actual.');
      return;
    }
    setIsUpdatingEmail(true);
    triggerVibration('light');
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Se ha enviado un email de confirmación a tu nueva dirección.');
        setNewEmail('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el correo electrónico');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleToggleBiometrics = () => {
    triggerVibration('medium');
    const nextState = !biometricsEnabled;
    setBiometricsEnabled(nextState);
    toast.success(nextState ? 'Seguridad Biométrica activada (Stub)' : 'Seguridad Biométrica desactivada');
  };

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
    <div className="flex-1 overflow-y-auto pb-4 md:pb-8 bg-gray-50/100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 custom-scrollbar">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        
        {/* Header bar */}
        <header className="rounded-2xl border border-slate-200/50 bg-white px-5 py-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => triggerVibration('light')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="Volver al inicio"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-bold">
                Ajustes de Cuenta
              </p>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Perfil de Usuario
              </h1>
            </div>
          </div>
        </header>

        {/* User Card */}
        <section className="bg-white border border-slate-200/50 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-md font-bold text-slate-900 truncate">
              {isLoadingUser ? 'Cargando...' : userEmail}
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Usuario de Bio-Avatar
            </p>
          </div>
        </section>

        {/* --- SECTION 1: CUENTA Y SEGURIDAD --- */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">
            Cuenta y Seguridad
          </p>
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Display/Change Email Row */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-950">Email Asociado</p>
                  <p className="text-xs text-slate-500 truncate">{isLoadingUser ? '...' : userEmail}</p>
                </div>
              </div>
              <form onSubmit={handleUpdateEmail} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Nuevo correo electrónico"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center"
                >
                  {isUpdatingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cambiar'}
                </button>
              </form>
            </div>

            {/* Biometrics Switch Toggle Row */}
            {FEATURE_FLAGS.enableBiometrics && (
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-950">Seguridad Biométrica (FaceID/TouchID)</p>
                    <p className="text-[10px] text-slate-400 font-semibold">Stub de autenticación nativa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBiometrics}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${biometricsEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${biometricsEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- SECTION 2: MI CUERPO (EVOLUCIÓN) --- */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">
            Mi Cuerpo (Evolución)
          </p>
          <button
            type="button"
            onClick={() => setIsBodySheetOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/50 shadow-sm hover:bg-slate-50 transition text-left animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-950">Evolución Corporal</p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  {isLoadingMetrics ? 'Cargando mediciones...' : `${bodyMetrics.length} mediciones registradas`}
                </p>
              </div>
            </div>
            <div className="text-slate-400 text-sm">➔</div>
          </button>
        </div>

        {/* --- SECTION 3: DATOS Y PRIVACIDAD --- */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">
            Datos y Privacidad
          </p>
          <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Option: Export GDPR Data */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-950">Exportar Historial (GDPR)</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Descarga todo tu historial fisiológico y metabólico en JSON.</p>
                </div>
              </div>
            </button>

            {/* Option: Sign Out */}
            <form action={logout} className="w-full">
              <button
                type="submit"
                onClick={() => triggerVibration('light')}
                className="w-full flex items-center justify-between p-4 hover:bg-rose-50/20 transition-colors text-left text-rose-600"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-700">Cerrar Sesión</p>
                    <p className="text-[10px] text-rose-500/80 font-semibold">Salir de tu cuenta de forma segura en este dispositivo.</p>
                  </div>
                </div>
              </button>
            </form>
          </div>
        </div>

      </div>

      {isBodySheetOpen && (
        <BottomSheet isOpen={isBodySheetOpen} onClose={() => setIsBodySheetOpen(false)} title="Evolución Corporal">
          <div className="text-slate-950 p-1">
            <StatisticsBodySection initialMetrics={bodyMetrics} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
