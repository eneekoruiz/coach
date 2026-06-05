'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { type DailyLog } from '@/lib/schema';

type HistoryLog = {
  date: string;
  health_momentum: number;
  avatar_image_url: string | null;
  ai_data: DailyLog | null;
};

interface HistoryClientContainerProps {
  logs: HistoryLog[];
}

const TrendChart = dynamic(() => import('@/components/TrendChart'), {
  ssr: false,
});

export default function HistoryClientContainer({ logs }: HistoryClientContainerProps) {
  return (
    <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-2xl h-64 w-full" />}>
      <TrendChart logs={logs} />
    </Suspense>
  );
}
