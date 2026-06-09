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
    <div className="mx-auto flex-1 w-full max-w-7xl overflow-y-auto bg-slate-50 px-4 py-6 pb-24 md:px-6 md:pb-8 custom-scrollbar">
      <GlobalErrorBoundary>
        <NutritionPageContent />
      </GlobalErrorBoundary>
    </div>
  );
}
