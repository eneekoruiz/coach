import { parseLocalDate, getNormalizedDate } from '@/lib/date-utils';

export interface StreakLogEntry {
  date: string;
  health_momentum: number;
}

/**
 * Calculates the consecutive days streak where health_momentum is strictly > 80.
 * A streak starts from today or yesterday, and traverses backwards.
 * If there is a day with momentum <= 80 or a calendar day gap greater than 1, the streak is broken.
 */
export function calculatePerfectDayStreak(logs: StreakLogEntry[]): number {
  if (!logs || logs.length === 0) return 0;

  // Sort logs by date descending
  const sorted = [...logs]
    .filter((log) => log && typeof log.date === 'string')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) return 0;

  // Determine today and yesterday's normalized local strings
  const todayStr = getNormalizedDate(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getNormalizedDate(yesterday);

  // The streak must be active, meaning the most recent log date must be either today or yesterday.
  const mostRecentDate = sorted[0].date;
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    const log = sorted[i];

    // If there is a gap of more than 1 calendar day between two logged entries, the streak is broken.
    if (i > 0) {
      const prevLogDate = parseLocalDate(sorted[i - 1].date);
      const currentLogDate = parseLocalDate(log.date);
      const diffTime = Math.abs(prevLogDate.getTime() - currentLogDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        break;
      }
    }

    // Check perfect day criteria: health_momentum > 80
    if (log.health_momentum > 80) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
