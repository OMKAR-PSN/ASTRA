import type { Baseline, CheckIn, MetricComparison, Readings } from '@/types/astra';

type ComparedField = {
  key: keyof Baseline;
  label: string;
  unit: string;
  decimals: number;
};

export const comparedFields: ComparedField[] = [
  { key: 'heartRateBpm', label: 'Heart rate', unit: 'bpm', decimals: 0 },
  { key: 'systolicMmHg', label: 'Systolic pressure', unit: 'mmHg', decimals: 0 },
  { key: 'diastolicMmHg', label: 'Diastolic pressure', unit: 'mmHg', decimals: 0 },
  { key: 'temperatureC', label: 'Body temperature', unit: '°C', decimals: 1 },
  { key: 'sleepHours', label: 'Sleep', unit: 'hours', decimals: 1 },
];

export const DIFFERENCE_THRESHOLD_PERCENT = 10;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function compareToBaseline(readings: Readings, baseline: Baseline): MetricComparison[] {
  return comparedFields.map(({ key, label, unit, decimals }) => {
    const current = readings[key];
    const base = baseline[key];
    if (current === null) {
      return { key, label, unit, decimals, current: null, baseline: base, change: null, percentChange: null };
    }
    const change = roundTo(current - base, 2);
    const percentChange = roundTo(((current - base) / base) * 100, 2);
    return { key, label, unit, decimals, current, baseline: base, change, percentChange };
  });
}

export function formatSigned(value: number, decimals = 0): string {
  const rounded = roundTo(value, decimals);
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(decimals)}`;
}

export function trendFor(checkIns: CheckIn[], field: keyof Readings): (number | null)[] {
  return checkIns.map((checkIn) => checkIn.readings[field]);
}
