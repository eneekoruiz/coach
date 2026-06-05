'use client';

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { type DailyLog } from '@/lib/schema';
import HistoryCard from '@/components/HistoryCard';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface HistoryClientContainerProps {
  logs: HistoryLog[];
}

const TrendChart = dynamic(() => import('@/components/TrendChart'), { ssr: false });
const HistoryDetailModal = dynamic(() => import('@/components/HistoryDetailModal'), { ssr: false });

export default function HistoryClientContainer({ logs }: HistoryClientContainerProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'daily'>('stats');
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);

  return (
    <div className="space-y-6">
      {/* Apple style Segmented Control */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              activeTab === 'stats' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              activeTab === 'daily' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registro Diario
          </button>
        </div>
      </div>

      <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-2xl h-64 w-full" />}>
        {activeTab === 'stats' ? (
          <TrendChart logs={logs} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {logs.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
                <p>Aún no hay datos históricos suficientes.</p>
              </div>
            ) : (
              [...logs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((log, index) => (
                  <HistoryCard
                    key={`${log.date}-${index}`}
                    log={log}
                    onOpen={() => setSelectedLog(log)}
                  />
                ))
            )}
          </div>
        )}
      </Suspense>

      {/* History Detail Modal — rendered outside the grid */}
      {selectedLog && (
        <HistoryDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
