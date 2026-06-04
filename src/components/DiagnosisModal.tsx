import React, { useRef, useEffect } from 'react';

type ChatFeedback = {
  previous_health_momentum: number;
  health_momentum: number;
  ai_data: any;
};

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: ChatFeedback;
  evaluationText: string | null;
}

function renderPips(level: number) {
  const icons = [1, 2, 3, 4, 5];
  return icons.map((slot) => (
    <span
      key={slot}
      className={`inline-block h-2.5 w-2.5 rounded-[3px] ${slot <= level ? 'bg-emerald-400' : 'bg-slate-300'}`}
    />
  ));
}

export default function DiagnosisModal({
  isOpen,
  onClose,
  feedback,
  evaluationText,
}: DiagnosisModalProps) {
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variacionInercia = feedback.ai_data?.metricas?.variacion_inercia ?? 0;
  const inerciaColor = variacionInercia >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalContentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-scale-up"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Diagnóstico Metabólico Completo
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Auditoría estructurada por el Coach Bio-Avatar</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Cerrar modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll interno */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          
          {/* Ficha Resumen de Inercia */}
          <div className={`p-4 rounded-2xl flex items-center justify-between ${inerciaColor}`}>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Estado de Inercia</span>
              <p className="text-xl font-black mt-0.5">
                {variacionInercia >= 0 ? '+' : ''}{variacionInercia} pts
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Inercia Global</span>
              <p className="text-xl font-black mt-0.5">{feedback.health_momentum}%</p>
            </div>
          </div>

          {/* Cuadrícula de Métricas Fisiológicas */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Fisiología</span>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {feedback.ai_data?.bio_avatar?.estado_fisiologico || 'Estable'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Hidratación</span>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {feedback.ai_data?.water_ml ?? feedback.ai_data?.hidratacion_ml ?? 0} ml
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Energía Física</span>
              <div className="flex gap-1">
                {renderPips(feedback.ai_data?.bio_avatar?.energia_fisica ?? 3)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Claridad Mental</span>
              <div className="flex gap-1">
                {renderPips(feedback.ai_data?.bio_avatar?.claridad_mental ?? 3)}
              </div>
            </div>
          </div>

          {/* Sección de Aciertos */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-4">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Hitos y Aciertos</span>
            {feedback.ai_data?.metricas?.aciertos && feedback.ai_data.metricas.aciertos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {feedback.ai_data.metricas.aciertos.map((acierto: string) => (
                  <span
                    key={acierto}
                    className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-1 text-xs font-bold text-emerald-800"
                  >
                    {acierto}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No se han registrado hitos metabólicos positivos en este log.</p>
            )}
          </div>

          {/* Acción Recomendada */}
          {feedback.ai_data?.metricas?.accion_manana && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block mb-1">Acción Recomendada</span>
              <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                {feedback.ai_data.metricas.accion_manana}
              </p>
            </div>
          )}

          {/* Resumen / Evaluación */}
          {evaluationText && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-[11px] text-slate-500 italic leading-relaxed">
              {evaluationText}
            </div>
          )}
        </div>

        {/* Pie de página con botón de salida */}
        <div className="border-t border-slate-100 pt-3 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition active:scale-95 shadow-sm"
          >
            Cerrar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
