import type { DietTemplate } from '@/lib/schema';
import type { RoutineLog, RoutineTemplate } from '@/app/routines/actions';

type MockStore = {
  routines: {
    templates: RoutineTemplate[];
    logs: RoutineLog[];
  };
  nutrition: {
    templates: DietTemplate[];
    calendar: Array<{ date: string; template_id: string }>;
  };
};

declare global {
  var __coachMockStore: MockStore | undefined;
}

function createInitialStore(): MockStore {
  const routineTemplateId = 'routine-water-1';
  const nutritionTemplateId = 'diet-template-ai-1';

  return {
    routines: {
      templates: [
        {
          id: routineTemplateId,
          user_id: 'e2e-user',
          title: 'Agua',
          icon: '💧',
          created_at: new Date().toISOString(),
          time_of_day: 'all_day',
          linked_habit_id: 1,
          habit_increment_amount: 1,
          target_repetitions: 5,
          notification_times: ['09:00', '11:45', '14:30', '17:15', '20:00'],
        },
      ],
      logs: [],
    },
    nutrition: {
      templates: [
        {
          id: nutritionTemplateId,
          name: 'Mock Day',
          parent_template_id: null,
          target_kcal: 2100,
          target_protein: 160,
          target_carbs: 210,
          target_fats: 70,
          meals: [
            {
              id: 'meal-breakfast',
              name: 'Desayuno',
              text: 'Tortilla con avena y fruta',
              target_kcal: 550,
              target_protein: 35,
              target_carbs: 60,
              target_fats: 18,
            },
            {
              id: 'meal-lunch',
              name: 'Comida',
              text: 'Pollo con arroz y verduras',
              target_kcal: 780,
              target_protein: 55,
              target_carbs: 85,
              target_fats: 20,
            },
            {
              id: 'meal-dinner',
              name: 'Cena',
              text: 'Salmón con patata asada',
              target_kcal: 770,
              target_protein: 70,
              target_carbs: 65,
              target_fats: 32,
            },
          ],
        },
      ],
      calendar: [],
    },
  };
}

export function getE2EMockStore() {
  if (!globalThis.__coachMockStore) {
    globalThis.__coachMockStore = createInitialStore();
  }

  return globalThis.__coachMockStore;
}
