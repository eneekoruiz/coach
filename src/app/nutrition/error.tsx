'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function NutritionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Nutrition module error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 md:p-12 shadow-sm max-w-lg w-full">
        <div className="w-20 h-20 mx-auto bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
          Uy, algo no ha cargado bien en tu dieta
        </h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Hemos encontrado un problema inesperado al cargar tu información nutricional. No te preocupes, tus datos están a salvo.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full font-semibold transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
