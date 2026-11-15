import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import type { MetricComparison, Readings } from '@/types/astra';

export type ReadingStatus = 'baseline' | 'difference' | 'recorded' | 'missing';

export type ReadingTile = {
  label: string;
  value: string;
  unit: string;
};

const formatValue = (value: number | null, decimals: number): string =>
  value === null ? 'Not recorded' : value.toFixed(decimals);

export function buildReadingTiles(readings: Readings, comparisons: MetricComparison[] = []) {
  const tiles: ReadingTile[] = [
    { label: 'Heart rate', value: formatValue(readings.heartRateBpm, 0), unit: 'bpm' },
    { label: 'Systolic pressure', value: formatValue(readings.systolicMmHg, 0), unit: 'mmHg' },
    { label: 'Diastolic pressure', value: formatValue(readings.diastolicMmHg, 0), unit: 'mmHg' },
    { label: 'Body temperature', value: formatValue(readings.temperatureC, 1), unit: '°C' },
    { label: 'Sleep', value: formatValue(readings.sleepHours, 1), unit: 'hours' },
    { label: 'Mood', value: formatValue(readings.mood, 0), unit: 'of 5' },
    { label: 'Stress', value: formatValue(readings.stress, 0), unit: 'of 5' },
  ];
  return tiles.map((tile) => {
    const comparison = comparisons.find((item) => item.label === tile.label);
    const percent = comparison?.percentChange;
    const status: ReadingStatus = tile.value === 'Not recorded' ? 'missing'
      : percent == null ? 'recorded'
      : Math.abs(percent) >= DIFFERENCE_THRESHOLD_PERCENT ? 'difference' : 'baseline';
    return { ...tile, status };
  });
}
