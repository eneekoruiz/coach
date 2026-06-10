import type { HabitMetricConfig, HabitMetricType, HabitRow } from '@/types/habits';

export const HABIT_METRIC_TYPES = ['boolean', 'counter', 'volume', 'duration'] as const;

export type NormalizedHabitMetric = {
  type: HabitMetricType;
  targetValue: number;
  unitLabel: string;
  stepValue: number;
  minValue: number;
  maxValue: number | null;
  precision: number;
  presets: number[];
  isBoolean: boolean;
};

const DEFAULT_PRESETS: Record<HabitMetricType, number[]> = {
  boolean: [1],
  counter: [1, 5],
  volume: [250, 500, 1000],
  duration: [5, 15, 30],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHabitMetricType(value: unknown): value is HabitMetricType {
  return HABIT_METRIC_TYPES.includes(value as HabitMetricType);
}

export function inferHabitMetricType(
  habit: Pick<HabitRow, 'name' | 'type' | 'unit' | 'target_value'>
): HabitMetricType {
  const unit = (habit.unit ?? '').toLowerCase();
  const name = habit.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (habit.type === 'negative') return 'counter';
  if (
    /(agua|hidratacion|hidratación)/.test(name) ||
    ['ml', 'l', 'litro', 'litros', 'vaso', 'vasos'].includes(unit)
  ) {
    return 'volume';
  }
  if (['min', 'mins', 'minutos', 'hora', 'horas', 'h'].includes(unit)) return 'duration';
  if ((habit.target_value ?? 1) <= 1 && unit.length === 0) return 'boolean';
  return 'counter';
}

function coerceConfig(config: HabitRow['metric_config']): HabitMetricConfig {
  if (!isRecord(config)) return {};

  return {
    min: typeof config.min === 'number' ? config.min : undefined,
    max: typeof config.max === 'number' ? config.max : undefined,
    precision: typeof config.precision === 'number' ? config.precision : undefined,
    presets: Array.isArray(config.presets)
      ? config.presets
          .map(Number)
          .filter((value) => Number.isFinite(value) && value > 0)
          .slice(0, 6)
      : undefined,
    base_unit: typeof config.base_unit === 'string' ? config.base_unit : undefined,
    display_unit: typeof config.display_unit === 'string' ? config.display_unit : undefined,
  };
}

function defaultUnitLabel(type: HabitMetricType, habitType: HabitRow['type']) {
  if (type === 'boolean') return habitType === 'negative' ? 'evento' : 'hecho';
  if (type === 'volume') return 'ml';
  if (type === 'duration') return 'min';
  return habitType === 'negative' ? 'recaídas' : 'veces';
}

function defaultStepValue(type: HabitMetricType, unitLabel: string) {
  if (type === 'boolean') return 1;
  if (type === 'volume') return unitLabel.toLowerCase() === 'l' ? 0.25 : 250;
  if (type === 'duration') return 15;
  return 1;
}

function defaultMaxValue(type: HabitMetricType, unitLabel: string, habit: HabitRow) {
  const name = habit.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (type === 'boolean') return 1;
  if (type === 'volume' && (name.includes('agua') || name.includes('hidratacion'))) {
    return unitLabel.toLowerCase() === 'l' ? 10 : 10000;
  }
  if (type === 'duration') return 1440;
  return null;
}

function decimalPlaces(value: number) {
  if (!Number.isFinite(value)) return 0;
  const [, fraction = ''] = String(value).split('.');
  return Math.min(4, fraction.length);
}

export function getHabitMetric(habit: HabitRow): NormalizedHabitMetric {
  const type = isHabitMetricType(habit.metric_type)
    ? habit.metric_type
    : inferHabitMetricType(habit);
  const config = coerceConfig(habit.metric_config);
  const unitLabel = (
    habit.unit_label ??
    config.display_unit ??
    habit.unit ??
    defaultUnitLabel(type, habit.type)
  ).trim();
  const rawStep = Number(habit.step_value ?? defaultStepValue(type, unitLabel));
  const stepValue =
    Number.isFinite(rawStep) && rawStep > 0 ? rawStep : defaultStepValue(type, unitLabel);
  const rawTarget = Number(
    habit.target_value ?? habit.tolerance_threshold ?? (type === 'boolean' ? 1 : stepValue)
  );
  const targetValue = Math.max(0, Number.isFinite(rawTarget) ? rawTarget : 1);
  const minValue = Math.max(0, Number.isFinite(config.min ?? 0) ? Number(config.min ?? 0) : 0);
  const maxValue = Number.isFinite(config.max ?? NaN)
    ? Math.max(minValue, Number(config.max))
    : defaultMaxValue(type, unitLabel, habit);
  const precision = Math.max(
    0,
    Math.min(4, Math.floor(config.precision ?? decimalPlaces(stepValue)))
  );
  const presets = (config.presets?.length ? config.presets : DEFAULT_PRESETS[type]).map((preset) =>
    roundHabitMetricValue(preset, precision)
  );

  return {
    type,
    targetValue,
    unitLabel,
    stepValue: roundHabitMetricValue(stepValue, precision),
    minValue,
    maxValue,
    precision,
    presets,
    isBoolean: type === 'boolean',
  };
}

export function roundHabitMetricValue(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function clampHabitMetricValue(habit: HabitRow, value: number) {
  const metric = getHabitMetric(habit);
  const numeric = Number.isFinite(value) ? value : 0;
  const upperBounded = metric.maxValue === null ? numeric : Math.min(metric.maxValue, numeric);
  return roundHabitMetricValue(Math.max(metric.minValue, upperBounded), metric.precision);
}

export function addHabitMetricValue(habit: HabitRow, currentValue: number, delta: number) {
  return clampHabitMetricValue(habit, currentValue + delta);
}

export function toggleHabitMetricValue(habit: HabitRow, currentValue: number) {
  const metric = getHabitMetric(habit);
  return currentValue >= metric.targetValue
    ? 0
    : clampHabitMetricValue(habit, metric.targetValue || 1);
}

export function formatHabitMetricValue(
  habit: HabitRow,
  value: number,
  options?: { compact?: boolean }
) {
  const metric = getHabitMetric(habit);
  const rounded = roundHabitMetricValue(value, metric.precision);
  const formatted = new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: metric.precision,
    minimumFractionDigits: metric.precision > 0 && !options?.compact ? metric.precision : 0,
  }).format(rounded);

  if (metric.type === 'boolean') return rounded > 0 ? 'Hecho' : 'Pendiente';
  return `${formatted} ${metric.unitLabel}`.trim();
}

export function getHabitMetricProgress(habit: HabitRow, value: number) {
  const metric = getHabitMetric(habit);
  if (habit.type === 'negative') {
    const graceLimit = Math.max(0, habit.tolerance_threshold ?? 0);
    if (graceLimit <= 0) return value <= 0 ? 100 : 0;
    return Math.max(0, Math.min(100, 100 - (value / Math.max(graceLimit, 1)) * 100));
  }

  if (metric.targetValue <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (value / metric.targetValue) * 100));
}

export function buildDefaultMetricConfig(
  metricType: HabitMetricType,
  unitLabel: string,
  stepValue: number
): HabitMetricConfig {
  return {
    min: 0,
    max: metricType === 'boolean' ? 1 : undefined,
    precision: decimalPlaces(stepValue),
    presets: DEFAULT_PRESETS[metricType],
    base_unit: unitLabel,
    display_unit: unitLabel,
  };
}
