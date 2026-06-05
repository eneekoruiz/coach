'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';

export default function ExportDataButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
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
      
      // Filename fallback, though the server content-disposition header handles it
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `bio-avatar-gdpr-export-${dateStr}.json`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Tus datos han sido exportados de forma segura');
    } catch (err) {
      console.error('[ExportDataButton ERROR]', err);
      toast.error('No se pudieron exportar los datos. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <span>Recopilando datos...</span>
        </>
      ) : (
        <>
          <span>📥 Exportar Datos (GDPR)</span>
        </>
      )}
    </button>
  );
}
