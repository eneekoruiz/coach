'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import NutritionContainer from '@/components/NutritionContainer';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { type NutritionTab } from '@/hooks/useNutritionPlan';

function NutritionPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Map URL tab param to NutritionContainer tab
  const initialTab = React.useMemo(() => {
    const tabMap: Record<string, NutritionTab> = {
      recipes: 'recipes',
      days: 'days',
      programs: 'programs',
      calendar: 'calendar',
    };
    return tabParam && tabMap[tabParam] ? tabMap[tabParam] : undefined;
  }, [tabParam]);

  return <NutritionContainer initialTab={initialTab} />;
}

export default function NutritionPage() {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-1 overflow-hidden bg-slate-50 px-2 py-2 pb-2 md:px-4 md:pb-4">
      <GlobalErrorBoundary>
        <NutritionPageContent />
      </GlobalErrorBoundary>
    </div>
  );
}
