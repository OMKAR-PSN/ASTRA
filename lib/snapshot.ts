import { compareToBaseline } from '@/lib/comparison';
import { sanitizeAdaptiveResponses } from '@/lib/adaptiveQuestions';
import { buildExplanation } from '@/lib/explanation';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import type { CheckIn, ReportSnapshot } from '@/types/astra';

export function createReportSnapshot(checkIn: CheckIn): ReportSnapshot {
  const comparisons = compareToBaseline(checkIn.readings, syntheticBaseline);
  const adaptiveResponses = sanitizeAdaptiveResponses(checkIn.adaptiveResponses ?? []);
  return {
    crew: crewProfile,
    baseline: syntheticBaseline,
    checkIn: {
      ...checkIn,
      readings: { ...checkIn.readings },
      symptoms: [...checkIn.symptoms],
      ...(checkIn.symptomEntries
        ? { symptomEntries: checkIn.symptomEntries.map((entry) => ({ ...entry })) }
        : {}),
      ...(adaptiveResponses.length > 0
        ? {
            adaptiveResponses: adaptiveResponses.map((response) => ({
              ...response,
              answer: { optionIds: [...response.answer.optionIds], text: response.answer.text },
            })),
          }
        : {}),
    },
    comparisons,
    explanation: buildExplanation(comparisons),
  };
}
