'use client';

import { useEffect, useMemo, useState } from 'react';

export type DayBlock = 'morning' | 'afternoon' | 'night';

function resolveDayBlock(date: Date): DayBlock {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 20) return 'afternoon';
  return 'night';
}

export function useTimeContext() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return useMemo(() => {
    const block = resolveDayBlock(now);

    if (block === 'morning') {
      return {
        block,
        label: 'Mañana',
        greeting: 'Buenos días',
        priority: 'Tarea matutina prioritaria',
        mealFocus: 'Desayuno',
        coachPrompt: 'Planifica el arranque del día con el Coach.',
      };
    }

    if (block === 'afternoon') {
      return {
        block,
        label: 'Tarde',
        greeting: 'Buenas tardes',
        priority: 'Hidratación y continuidad',
        mealFocus: 'Comida / Merienda',
        coachPrompt: 'Ajusta el ritmo de la tarde con el Coach.',
      };
    }

    return {
      block,
      label: 'Noche',
      greeting: 'Buenas noches',
      priority: 'Cierre fisiológico del día',
      mealFocus: 'Cena',
      coachPrompt: 'Registra sueño y ánimo final.',
    };
  }, [now]);
}
