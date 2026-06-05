'use client';

import React from 'react';
import { motion } from 'framer-motion';

type DietEmptyStateProps = {
  onManualCreate: () => void;
  onAiGenerate: () => void;
  isLoadingAi?: boolean;
};

export default function DietEmptyState({ onManualCreate, onAiGenerate, isLoadingAi }: DietEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[2rem] border border-white/60 bg-white/50 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]"
    >
      <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-3">
        Sin Plan Nutricional
      </h3>
      <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto mb-8 font-medium">
        Tu Bio-Avatar necesita saber qué gasolina le vas a poner. Establece tus calorías, macros y comidas de la semana para que podamos analizar tus progresos diarios.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button
          onClick={onAiGenerate}
          disabled={isLoadingAi}
          className="relative inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden"
        >
          {isLoadingAi ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="text-lg">✨</span>
          )}
          <span className="z-10">{isLoadingAi ? 'Generando en 2º plano...' : 'Generar plan con IA'}</span>
          {!isLoadingAi && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />}
        </button>

        <button
          onClick={onManualCreate}
          disabled={isLoadingAi}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:opacity-50"
        >
          Crear manualmente
        </button>
      </div>
    </motion.div>
  );
}
