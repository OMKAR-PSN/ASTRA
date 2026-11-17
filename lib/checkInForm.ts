import { emptyReadings } from '@/fixtures/checkInOptions';
import { activeAdaptiveQuestionIds, buildAdaptiveContext, sanitizeAdaptiveResponses } from '@/lib/adaptiveQuestions';
import { normalizeSymptomStatus, sanitizeSymptomEntries } from '@/lib/symptoms';
import type { AdaptiveResponse, CheckInDraft, Readings, SymptomEntry, SymptomStatus } from '@/types/astra';

export type NumericKey = 'heartRateBpm' | 'systolicMmHg' | 'diastolicMmHg' | 'temperatureC' | 'sleepHours';
export type NumericTexts = Record<NumericKey, string>;
export type SubjectiveReadings = Pick<Readings, 'mood' | 'stress'>;

export type CheckInFormValues = {
  texts: NumericTexts;
  subjective: SubjectiveReadings;
  symptoms: string[];
  symptomEntries: SymptomEntry[];
  symptomStatus: SymptomStatus;
  activityNote: string;
  adaptiveResponses: AdaptiveResponse[];
  /** Session-only UI state. Skipped questions are never saved as answers. */
  adaptiveSkipped: string[];
};

export const emptyNumericTexts: NumericTexts = {
  heartRateBpm: '',
  systolicMmHg: '',
  diastolicMmHg: '',
  temperatureC: '',
  sleepHours: '',
};

export const emptySubjective: SubjectiveReadings = { mood: null, stress: null };

export const textsFrom = (readings: Readings): NumericTexts => ({
  heartRateBpm: readings.heartRateBpm?.toString() ?? '',
  systolicMmHg: readings.systolicMmHg?.toString() ?? '',
  diastolicMmHg: readings.diastolicMmHg?.toString() ?? '',
  temperatureC: readings.temperatureC?.toString() ?? '',
  sleepHours: readings.sleepHours?.toString() ?? '',
});

export const emptyFormValues = (): CheckInFormValues => ({
  texts: { ...emptyNumericTexts },
  subjective: { ...emptySubjective },
  symptoms: [],
  symptomEntries: [],
  symptomStatus: 'not-answered',
  activityNote: '',
  adaptiveResponses: [],
  adaptiveSkipped: [],
});

export const copyFormValues = (values: CheckInFormValues): CheckInFormValues => ({
  texts: { ...values.texts },
  subjective: { ...values.subjective },
  symptoms: [...values.symptoms],
  symptomEntries: values.symptomEntries.map((entry) => ({ ...entry })),
  symptomStatus: values.symptomStatus,
  activityNote: values.activityNote,
  adaptiveResponses: (values.adaptiveResponses ?? []).map((response) => ({
    ...response,
    answer: { optionIds: [...response.answer.optionIds], text: response.answer.text },
  })),
  adaptiveSkipped: [...(values.adaptiveSkipped ?? [])],
});

/** Builds the draft both check-in flows hand to the existing validation and save pipeline. */
export const draftFromForm = (values: CheckInFormValues): CheckInDraft => {
  const symptomEntries = sanitizeSymptomEntries(values.symptomEntries);
  const activeQuestions = activeAdaptiveQuestionIds(buildAdaptiveContext(values));
  const adaptiveResponses = sanitizeAdaptiveResponses(values.adaptiveResponses ?? [])
    .filter((response) => activeQuestions.has(response.questionId));
  return {
    readings: { ...emptyReadings, ...values.subjective },
    symptoms: [...values.symptoms],
    symptomEntries,
    symptomStatus: normalizeSymptomStatus(values.symptomStatus, values.symptoms, symptomEntries),
    activityNote: values.activityNote.trim(),
    ...(adaptiveResponses.length > 0 ? { adaptiveResponses } : {}),
  };
};

export const formHasInput = (values: CheckInFormValues): boolean =>
  Object.values(values.texts).some((text) => text.trim() !== '')
  || values.subjective.mood !== null
  || values.subjective.stress !== null
  || values.symptoms.length > 0
  || values.symptomEntries.length > 0
  || values.symptomStatus === 'none'
  || values.activityNote.trim() !== ''
  || (values.adaptiveResponses?.length ?? 0) > 0;
