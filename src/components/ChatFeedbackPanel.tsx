import React from 'react';

import { type DailyLog } from '@/lib/schema';

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
  if (!feedback) return null;

  if (feedback.ai_data?.metricas?.error_clave === 'fuera_de_tema') {
    return (
      <div className="rounded-[1.25rem] border border-amber-200/80 bg-amber-50/70 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-lg text-white shadow-sm">
            🐶
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">Coach Bio-Avatar</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-800">
              {feedback.ai_data.metricas.accion_manana}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/80 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Evaluación</p>
          <p className="mt-2 text-sm leading-6 text-slate-800">{evaluationText}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-700">Acción</p>
          <p className="mt-2 text-sm font-medium leading-6 text-emerald-950">
            {feedback.ai_data.metricas.accion_manana}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Bio-Avatar</p>
          <div className="mt-2 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg text-white">
              🐶
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {feedback.ai_data.bio_avatar.estado_fisiologico}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Descripción corta del estado fisiológico del día.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Energía y claridad
          </p>
          <div className="mt-3 grid gap-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Energía</span>
                <span>{feedback.ai_data.bio_avatar.energia_fisica}/5</span>
              </div>
              <div className="mt-2 flex gap-1">
                {renderPips(feedback.ai_data.bio_avatar.energia_fisica)}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Claridad</span>
                <span>{feedback.ai_data.bio_avatar.claridad_mental}/5</span>
              </div>
              <div className="mt-2 flex gap-1">
                {renderPips(feedback.ai_data.bio_avatar.claridad_mental)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Aciertos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {feedback.ai_data.metricas.aciertos.length > 0 ? (
            feedback.ai_data.metricas.aciertos.map((item: string) => (
              <span
                key={item}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">Sin aciertos registrados.</span>
          )}
        </div>
        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Error clave: </span>
          {feedback.ai_data.metricas.error_clave}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Inercia</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{feedback.health_momentum}%</p>
          <p className="mt-1 text-xs text-slate-500">
            Cambio aplicado: {feedback.ai_data.metricas.variacion_inercia >= 0 ? '+' : ''}
            {feedback.ai_data.metricas.variacion_inercia}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Hidratación</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {feedback.ai_data.water_ml ?? feedback.ai_data.hidratacion_ml} ml
          </p>
          <p className="mt-1 text-xs text-slate-500">Dato estructurado desde la IA.</p>
        </div>
      </div>
    </div>
  );
}
