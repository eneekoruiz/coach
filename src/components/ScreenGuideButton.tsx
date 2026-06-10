'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';

import BottomSheet from '@/components/BottomSheet';

type ScreenGuideButtonProps = {
  title: string;
  description: string;
  goal: string;
  bullets?: string[];
  compact?: boolean;
};

export default function ScreenGuideButton({
  title,
  description,
  goal,
  bullets = [],
  compact = false,
}: ScreenGuideButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-50 active:scale-95 ${
          compact ? 'h-10 w-10' : 'px-3'
        }`}
        title={`Ayuda sobre ${title}`}
        aria-label={`Ayuda sobre ${title}`}
      >
        <Info className="h-4 w-4" />
      </button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Qué estás viendo</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{description}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Para qué sirve</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{goal}</p>
          </div>

          {bullets.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cómo aprovecharlo</p>
              <div className="mt-3 space-y-2">
                {bullets.map((bullet) => (
                  <p key={bullet} className="text-sm font-semibold leading-6 text-slate-600">
                    {bullet}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
