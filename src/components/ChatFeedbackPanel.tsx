'use client';

import React from 'react';
import { type DailyLog } from '@/lib/schema';
import DiagnosisModal from '@/components/DiagnosisModal';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: DailyLog;
};

export default function ChatFeedbackPanel({
  feedback,
  evaluationText,
  onUpdate,
}: {
  feedback: ChatFeedback;
  evaluationText: string | null;
  onUpdate?: () => void | Promise<void>;
}) {
  const [showMetrics, setShowMetrics] = React.useState(false);
  const [hiddenProposals, setHiddenProposals] = React.useState<string[]>([]);

  if (!feedback) return null;

  const isOffTopic = feedback.ai_data?.metricas?.error_clave === 'fuera_de_tema';
  const isGreeting = feedback.ai_data?.metricas?.error_clave === 'saludo';
  const messageText = feedback.ai_data?.metricas?.accion_manana || 'Mensaje del Coach no disponible.';

  // Filter out proposals that have already been created/clicked locally
  const proposals = (feedback.ai_data?.propuestas_habitos || []).filter(
    (p) => !hiddenProposals.includes(p.nombre.toLowerCase())
  );

  const handleCreateSuggestedHabit = async (nombre: string, tipo: 'positive' | 'negative') => {
    toast.success(`Creando el hábito "${nombre}"...`);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No se encontró sesión de usuario activa.');

      // 1) Create habit via API
      const createRes = await fetch('/api/habits/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: nombre,
          type: tipo,
          target_number: 1,
          tolerance: 0,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => null);
        throw new Error(errData?.error || 'Error al crear hábito.');
      }

      const createdData = await createRes.json();
      const createdHabit = createdData?.data;
      if (!createdHabit?.id) throw new Error('Hábito creado sin ID.');

      // 2) Track occurrence for today (1)
      const updateRes = await fetch('/api/habits/update-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habit_id: createdHabit.id,
          amount: 1,
        }),
      });

      if (!updateRes.ok) {
        console.warn('Hábito creado, pero falló el registro inicial del día.');
      }

      // Hide proposal locally
      setHiddenProposals((prev) => [...prev, nombre.toLowerCase()]);
      toast.success(`¡Hábito "${nombre}" creado e inicializado para hoy! ➕`);

      // Refresh parent dashboard
      if (onUpdate) await onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el hábito.');
    }
  };

  if (isOffTopic) {
    return (
      <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/70 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-lg text-white shadow-sm">
            🐶
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">Coach Bio-Avatar</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-800 whitespace-pre-line">
              {messageText}
            </p>

            {/* Proposed habits creation inside OffTopic too */}
            {proposals.length > 0 && (
              <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 text-xs space-y-2">
                <span className="font-semibold text-violet-800 block">
                  💡 Hábito no registrado: ¿Quieres añadirlo a tu tracker?
                </span>
                <div className="flex flex-wrap gap-2">
                  {proposals.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCreateSuggestedHabit(p.nombre, p.tipo)}
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-600 hover:bg-violet-700 px-3 py-1.5 font-bold text-white shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Añadir {p.nombre} ({p.tipo === 'positive' ? 'Positivo' : 'Negativo'}) ➕
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Conversational Bubble (Default View) */}
      <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg text-white shadow-sm">
            🐶
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">Coach Bio-Avatar</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-800 whitespace-pre-line">
              {messageText}
            </p>

            {/* Proposed habits creation UI */}
            {proposals.length > 0 && (
              <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 text-xs space-y-2">
                <span className="font-semibold text-violet-800 block">
                  💡 Hábito no registrado: ¿Quieres añadirlo a tu tracker?
                </span>
                <div className="flex flex-wrap gap-2">
                  {proposals.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCreateSuggestedHabit(p.nombre, p.tipo)}
                      className="inline-flex items-center gap-1 rounded-xl bg-violet-600 hover:bg-violet-700 px-3 py-1.5 font-bold text-white shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Añadir {p.nombre} ({p.tipo === 'positive' ? 'Positivo' : 'Negativo'}) ➕
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expander Button - only show if there is useful metric data (not a plain greeting) */}
            {!isGreeting && (
              <div className="mt-3 border-t border-slate-100 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMetrics((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 active:scale-95"
                >
                  {showMetrics ? '🙈 Ocultar Diagnóstico' : '📊 Ver Diagnóstico Técnico'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Technical Metrics Grid (Responsive Diagnosis Modal) */}
      <DiagnosisModal
        isOpen={showMetrics}
        onClose={() => setShowMetrics(false)}
        feedback={feedback}
        evaluationText={evaluationText}
      />
    </div>
  );
}
