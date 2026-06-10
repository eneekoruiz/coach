export type HabitType = 'positive' | 'negative';
export type HabitMetricType = 'boolean' | 'counter' | 'volume' | 'duration';

export interface HabitMetricConfig {
  min?: number;
  max?: number;
  precision?: number;
  presets?: number[];
  base_unit?: string;
  display_unit?: string;
}

export interface HabitRow {
  id: number;
  user_id?: string;
  name: string;
  type: HabitType;
  is_custom?: boolean;
  tolerance_threshold: number;
  target_value?: number;
  unit?: string | null;
  metric_type?: HabitMetricType | null;
  unit_label?: string | null;
  step_value?: number | null;
  metric_config?: HabitMetricConfig | Record<string, unknown> | null;
  relapse_unit_cost?: number;
  relapse_unit_minutes?: number;
  sobriety_started_at?: string | null;
  last_relapse_at?: string | null;
  slip_allowance?: number;
  slip_window_days?: number;
  slip_penalty_hours?: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
}

export interface HabitTrackingEntry {
  habit_id: number;
  amount: number;
  metric_type?: HabitMetricType | null;
  unit_label?: string | null;
  relapse_factor?: 'stress' | 'social' | 'boredom' | 'craving' | 'other' | null;
}

export type RecoveryDifficulty = 1 | 2 | 3 | 4 | 5;

export interface HabitRecoveryCheckIn {
  id?: string;
  user_id?: string;
  habit_id: number;
  checkin_date: string;
  pledged_at?: string | null;
  pledge_text?: string | null;
  pledge_status?: 'pledged' | 'skipped' | null;
  reviewed_at?: string | null;
  kept_promise?: boolean | null;
  difficulty?: RecoveryDifficulty | null;
  trigger_tags?: string[] | null;
  notes?: string | null;
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
