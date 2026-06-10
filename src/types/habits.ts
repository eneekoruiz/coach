export type HabitType = 'positive' | 'negative';

export interface HabitRow {
  id: number;
  user_id?: string;
  name: string;
  type: HabitType;
  is_custom?: boolean;
  tolerance_threshold: number;
  target_value?: number;
  unit?: string | null;
  relapse_unit_cost?: number;
  relapse_unit_minutes?: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
}

export interface HabitTrackingEntry {
  habit_id: number;
  amount: number;
  relapse_factor?: 'stress' | 'social' | 'boredom' | 'craving' | 'other' | null;
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
