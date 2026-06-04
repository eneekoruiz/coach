import React from 'react';

type AvatarWidgetProps = {
  normalizedMomentum: number;
  avatarUrl: string;
  insightText: string;
};

export default function AvatarWidget({ normalizedMomentum, avatarUrl, insightText }: AvatarWidgetProps) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-sky-50 to-transparent pointer-events-none" />
      
      <div className="relative aspect-square w-[140px] sm:w-[180px] lg:w-[220px] overflow-hidden rounded-[2rem] border-[8px] border-white shadow-2xl bg-white mb-4 mt-2 z-10 flex-shrink-0">
        <img
          src={avatarUrl}
          alt="Bio-Avatar"
          className="w-full h-full object-cover transition-all duration-1000"
          loading="eager"
        />
      </div>
      
      <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight z-10 mb-2">
        {normalizedMomentum > 80 ? 'Óptimo' : normalizedMomentum > 30 ? 'Estable' : 'Crítico'}
      </h3>
      
      {/* AI Insight Badge */}
      <div className="mt-auto bg-white rounded-2xl border border-sky-100 p-3 sm:p-4 shadow-sm z-10 text-left w-full overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="bg-sky-100 text-sky-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
            Coach IA
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">
          {insightText}
        </p>
      </div>
    </>
  );
}
