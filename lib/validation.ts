import type { CheckInDraft, Readings } from '@/types/astra';

type NumericField = Exclude<keyof Readings, 'mood' | 'stress'>;

export const readingLimits: Record<NumericField, { min: number; max: number }> = {
  heartRateBpm: { min: 20, max: 250 },
  systolicMmHg: { min: 60, max: 250 },
  diastolicMmHg: { min: 30, max: 150 },
  temperatureC: { min: 30, max: 43 },
  sleepHours: { min: 0, max: 24 },
};

export type DraftErrors = Partial<Record<keyof Readings, string>>;

export type ValidationResult =
  | { ok: true; readings: Readings }
  | { ok: false; errors: DraftErrors };

const parseNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
};

/** Parses and range-checks the five numeric readings without applying the at-least-one-reading rule. */
export function parseNumericReadings(texts: Record<string, string>): {
  readings: Pick<Readings, NumericField>;
  errors: DraftErrors;
} {
  const errors: DraftErrors = {};
  const readings = {} as Pick<Readings, NumericField>;

  (Object.keys(readingLimits) as NumericField[]).forEach((field) => {
    const parsed = parseNumber(texts[field] ?? '');
    const { min, max } = readingLimits[field];
    if (parsed === null) {
      readings[field] = null;
    } else if (Number.isNaN(parsed)) {
      errors[field] = 'Enter a number.';
    } else if (parsed < min || parsed > max) {
      errors[field] = `Enter a value from ${min} to ${max}.`;
    } else {
      readings[field] = parsed;
    }
  });

  return { readings, errors };
}

export function validateDraft(draft: CheckInDraft, texts: Record<string, string>): ValidationResult {
  const { readings: parsedReadings, errors } = parseNumericReadings(texts);
  const readings: Readings = { ...draft.readings };
  (Object.keys(parsedReadings) as NumericField[]).forEach((field) => {
    readings[field] = parsedReadings[field];
  });

  (['mood', 'stress'] as const).forEach((field) => {
    const value = draft.readings[field];
    if (value !== null && (value < 1 || value > 5)) {
      errors[field] = 'Choose a value from 1 to 5.';
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const hasAnyReading = Object.values(readings).some((value) => value !== null);
  if (!hasAnyReading) {
    return { ok: false, errors: { heartRateBpm: 'Enter at least one reading or load the demo readings.' } };
  }

  return { ok: true, readings };
}
