import React from 'react';
import NutritionContainer from '@/components/NutritionContainer';

export const metadata = {
  title: 'Nutrición y Dieta - BioAvatar',
  description: 'Planificación de metas de macronutrientes y comparativa real vs planificado.',
};

export default function NutritionPage() {
  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 flex-1 overflow-y-auto pb-24 md:pb-8 custom-scrollbar">
      <NutritionContainer />
    </div>
  );
}
