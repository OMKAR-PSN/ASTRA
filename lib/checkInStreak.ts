import type { CheckIn } from '@/types/astra';

const DAY_MS = 86_400_000;

export function checkInStreak(checkIns: CheckIn[], now = Date.now()): number {
  const days = new Set(checkIns.map(({ recordedAt }) => Math.floor(Date.parse(recordedAt) / DAY_MS)));
  const today = Math.floor(now / DAY_MS);
  let day = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
}
