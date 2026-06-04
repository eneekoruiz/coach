import React from 'react';

import { type DailyLog } from '@/lib/schema';
import DiagnosisModal from '@/components/DiagnosisModal';

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: DailyLog;
};

function renderPips(level: number) {
  const icons = [1, 2, 3, 4, 5];
  return icons.map((slot) => (
    <span
      key={slot}
      className={`inline-block h-2.5 w-2.5 rounded-[3px] ${slot <= level ? 'bg-emerald-400' : 'bg-slate-300'}`}
    />
  ));
}

export default function ChatFeedbackPanel({
  feedback,
  evaluationText,
}: {
  feedback: ChatFeedback;
  evaluationText: string | null;
}) {
  const [showMetrics, setShowMetrics] = React.useState(false);

  if (!feedback) return null;

  const isOffTopic = feedback.ai_data?.metricas?.error_clave === 'fuera_de_tema';
  const isGreeting = feedback.ai_data?.metricas?.error_clave === 'saludo';
  const messageText = feedback.ai_data?.metricas?.accion_manana || 'Mensaje del Coach no disponible.';

  if (isOffTopic) {
    return (
      <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/70 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-lg text-white shadow-sm">
            🐶
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">Coach Bio-Avatar</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-800">
              {messageText}
            </p>
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
