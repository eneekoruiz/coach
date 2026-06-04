import React from 'react';
import NutritionContainer from '@/components/NutritionContainer';

export const metadata = {
  title: 'Nutrición y Dieta - BioAvatar',
  description: 'Planificación de metas de macronutrientes y comparativa real vs planificado.',
};

export default function NutritionPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <NutritionContainer />
    </main>
  );
}
