export type HabitType = 'positive' | 'negative';

export interface HabitRow {
  id: number;
  name: string;
  type: HabitType;
  tolerance_threshold: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
}

export interface HabitTrackingEntry {
  habit_id: number;
  amount: number;
}

export interface DailyLogRow {
  date: string;
  habit_tracking: HabitTrackingEntry[] | null;
}

export interface SummaryCardSpec {
  label: string;
  value: string;
  detail: string;
}
