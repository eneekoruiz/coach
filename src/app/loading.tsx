'use client';

import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-6 md:px-8 space-y-6 animate-pulse" aria-hidden="true">
      {/* Header Skeleton */}
      <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
        {/* Bento Card 1: Avatar Skeleton */}
        <div className="col-span-full lg:col-span-2 min-h-[160px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-around gap-6 shadow-sm">
          <div className="w-[110px] h-[110px] rounded-[1.8rem] bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-7 w-40 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded-full" />
          </div>
        </div>

        {/* Bento Card 2: Nutrition Skeleton */}
        <div className="col-span-full md:col-span-1 min-h-[160px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>

        {/* Bento Card 3: Water Skeleton */}
        <div className="col-span-full md:col-span-1 min-h-[160px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>

        {/* Bento Card 4: Habits Skeleton */}
        <div className="col-span-full min-h-[120px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-3.5 w-56 bg-slate-100 dark:bg-slate-850 rounded-full" />
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Bento Card 5: Grid of Stats */}
        <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center gap-2 min-h-[90px] shadow-sm">
              <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
