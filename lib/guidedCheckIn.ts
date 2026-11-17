import type { NumericKey, NumericTexts } from '@/lib/checkInForm';
import { parseNumericReadings, type DraftErrors } from '@/lib/validation';

export type MoodChoiceId = 'great' | 'good' | 'okay' | 'not-great' | 'very-low' | 'prefer-describe';

export type MoodChoice = {
  id: MoodChoiceId;
  label: string;
  description: string;
  /** Explicit mapping onto the existing 1–5 mood scale. */
  value: number | null;
};

export const moodChoices: readonly MoodChoice[] = [
  { id: 'great', label: 'Great', description: 'Feeling well today', value: 5 },
  { id: 'good', label: 'Good', description: 'Mostly well', value: 4 },
  { id: 'okay', label: 'Okay', description: 'Neutral or average', value: 3 },
  { id: 'not-great', label: 'Not great', description: 'Below your usual', value: 2 },
  { id: 'very-low', label: 'Very low', description: 'Feeling quite low', value: 1 },
  { id: 'prefer-describe', label: 'Prefer to describe', description: 'Mood recorded as not measured; add context in the activity note', value: null },
];

export const moodValueFor = (id: MoodChoiceId | null): number | null =>
  moodChoices.find((choice) => choice.id === id)?.value ?? null;

export const moodChoiceForValue = (value: number | null): MoodChoiceId | null =>
  moodChoices.find((choice) => choice.value === value && choice.value !== null)?.id ?? null;

export const stressAnchors = ['Calm', 'Low', 'Moderate', 'High', 'Very high'] as const;

export const guidedStepOrder = ['wellbeing', 'sleep', 'vitals', 'symptoms', 'review'] as const;
export type GuidedStepId = (typeof guidedStepOrder)[number];

export const guidedStepMeta: Record<GuidedStepId, { title: string; progressLabel: string }> = {
  wellbeing: { title: 'How are you feeling?', progressLabel: 'Mood & stress' },
  sleep: { title: 'How did you sleep?', progressLabel: 'Sleep' },
  vitals: { title: 'Health measurements', progressLabel: 'Measurements' },
  symptoms: { title: 'Symptoms & activity', progressLabel: 'Symptoms' },
  review: { title: 'Review & save', progressLabel: 'Review' },
};

export const stepNumericFields: Partial<Record<GuidedStepId, readonly NumericKey[]>> = {
  sleep: ['sleepHours'],
  vitals: ['heartRateBpm', 'systolicMmHg', 'diastolicMmHg', 'temperatureC'],
};

const SLEEP_STEP_HOURS = 0.5;

/** Increment/decrement keeps a blank field blank on decrement; increment starts at one 30-minute step. */
export function adjustSleepHours(text: string, direction: 1 | -1): string {
  const trimmed = text.trim();
  const parsed = trimmed === '' ? null : Number(trimmed);
  if (direction < 0 && (parsed === null || !Number.isFinite(parsed))) return text;
  const base = parsed === null || !Number.isFinite(parsed) ? 0 : parsed;
  const next = Math.min(24, Math.max(0, Math.round((base + direction * SLEEP_STEP_HOURS) * 10) / 10));
  return String(next);
}

/** Reuses the save-time numeric validation, limited to the fields shown on one step. */
export function numericErrorsForStep(step: GuidedStepId, texts: NumericTexts): DraftErrors {
  const fields = stepNumericFields[step];
  if (!fields) return {};
  const { errors } = parseNumericReadings(texts);
  return fields.reduce<DraftErrors>((subset, field) => {
    if (errors[field]) subset[field] = errors[field];
    return subset;
  }, {});
}
