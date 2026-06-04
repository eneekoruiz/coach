/**
 * Calculates the Exponential Moving Average (EMA) for global momentum.
 * Formula: Math.round((previousGlobal * 0.85) + (currentDailyScore * 0.15))
 * Clamped between 0 and 100.
 */
export function calculateGlobalMomentum(previousGlobal: number, currentDailyScore: number): number {
  const previous = typeof previousGlobal === 'number' ? previousGlobal : 100;
  const current = typeof currentDailyScore === 'number' ? currentDailyScore : 100;
  const score = (previous * 0.85) + (current * 0.15);
  return Math.min(100, Math.max(0, Math.round(score)));
}
