import React from 'react';
import CircularProgressRing from './CircularProgressRing';

type MacrosBentoCardProps = {
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  dietTargets: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

export default function MacrosBentoCard({
  total_kcal,
  protein_g,
  carbs_g,
  fats_g,
  dietTargets,
}: MacrosBentoCardProps) {
  return (
    <>
      <div className="flex justify-between items-end mb-4 sm:mb-6 flex-shrink-0">
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-400 font-extrabold mb-0.5 sm:mb-1">Nutrición</p>
          <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tighter leading-none">Macros</h2>
        </div>
        <div className="text-right">
          <p className="text-lg sm:text-2xl font-black text-rose-500 tracking-tighter leading-none">
            {total_kcal}
            <span className="text-[10px] sm:text-sm text-slate-400 font-bold ml-1 uppercase">/ {dietTargets?.kcal ?? 2000} kcal</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 sm:gap-4 mt-auto">
        <CircularProgressRing
          value={total_kcal}
          max={dietTargets?.kcal ?? 2000}
          label="Calorías"
          unit="kcal"
          colorClass="stroke-rose-500"
          icon={<svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>}
        />
        <CircularProgressRing
          value={protein_g}
          max={dietTargets?.protein ?? 150}
          label="Proteína"
          unit="g"
          colorClass="stroke-emerald-500"
          icon={<svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>}
        />
        <CircularProgressRing
          value={carbs_g}
          max={dietTargets?.carbs ?? 200}
          label="Carbos"
          unit="g"
          colorClass="stroke-cyan-500"
          icon={<svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.342 6 9.3 6 10.428v4.293c0 1.128.845 2.086 1.976 2.112 2.654.062 5.394.062 8.048 0 1.131-.026 1.976-1.084 1.976-2.212v-4.293c0-1.128-.845-2.086-1.976-2.112A48.243 48.243 0 0 0 12 8.25Z" /></svg>}
        />
        <CircularProgressRing
          value={fats_g}
          max={dietTargets?.fats ?? 70}
          label="Grasa"
          unit="g"
          colorClass="stroke-amber-500"
          icon={<svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>
    </>
  );
}
