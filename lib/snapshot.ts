import { compareToBaseline } from '@/lib/comparison';
import { buildExplanation } from '@/lib/explanation';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import type { CheckIn, ReportSnapshot } from '@/types/astra';

export function createReportSnapshot(checkIn: CheckIn): ReportSnapshot {
  const comparisons = compareToBaseline(checkIn.readings, syntheticBaseline);
  return {
    crew: crewProfile,
    baseline: syntheticBaseline,
    checkIn: {
      ...checkIn,
      readings: { ...checkIn.readings },
      symptoms: [...checkIn.symptoms],
    },
    comparisons,
    explanation: buildExplanation(comparisons),
  };
}
