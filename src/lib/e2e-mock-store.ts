import type { DietTemplate } from '@/lib/schema';

export type RoutineTemplate = {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  created_at: string;
  time_of_day: string;
  linked_habit_id?: number | null;
  habit_increment_amount?: number | null;
  target_repetitions?: number | null;
  notification_times?: string[] | null;
};

export type RoutineLog = {
  id: string;
  user_id: string;
  template_id: string;
  completed_at: string;
};

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
  return {
    routines: {
      templates: [],
      logs: [],
    },
    nutrition: {
      templates: [],
      calendar: [],
    },
  };
}

export function getE2EMockStore(): MockStore {
  if (!globalThis.__coachMockStore) {
    globalThis.__coachMockStore = createInitialStore();
  }
  return globalThis.__coachMockStore;
}

export function resetE2EMockStore(): void {
  globalThis.__coachMockStore = createInitialStore();
}
