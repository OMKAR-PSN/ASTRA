import type { CheckIn, Readings } from '../types/astra';
import { encodeCrewQrPayload } from '../lib/crewIdentity';
import { readingLimits } from '../lib/validation';
import { symptomOptions } from './checkInOptions';
import { crewProfile, syntheticBaseline } from './crew';

export const DEMO_CREW_ID = 'AVERY-001';
export const DEMO_FIXTURE_VERSION = 'demo-crew-fixture-v1';
export const DEMO_MISSION_NAME = crewProfile.missionName.replace(' (simulated)', '');

export const demoCrewIdentity = {
  crewId: DEMO_CREW_ID,
  name: crewProfile.name,
  role: crewProfile.role,
  missionName: DEMO_MISSION_NAME,
  missionDay: crewProfile.missionDay,
  baseline: syntheticBaseline,
  fixtureVersion: DEMO_FIXTURE_VERSION,
} as const;

export const demoCrewIds: readonly string[] = [DEMO_CREW_ID];
export const demoCrewQrPayload = encodeCrewQrPayload(DEMO_CREW_ID);

type DemoRow = {
  readings: Readings;
  symptoms: string[];
  activityNote: string;
};

const FIXTURE_NOTE = 'Fictional crew fixture v1. Manual observation only; no sensor source.';

const rows: DemoRow[] = [
  { readings: { heartRateBpm: 71, systolicMmHg: 115, diastolicMmHg: 73, temperatureC: 36.6, sleepHours: 7.8, mood: 4, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 73, systolicMmHg: 117, diastolicMmHg: 75, temperatureC: 36.7, sleepHours: 7.4, mood: 4, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 72, systolicMmHg: 116, diastolicMmHg: 74, temperatureC: 36.7, sleepHours: 7.6, mood: 4, stress: 1 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 76, systolicMmHg: 118, diastolicMmHg: 76, temperatureC: 36.8, sleepHours: 6.9, mood: 3, stress: 2 }, symptoms: ['Tired'], activityNote: FIXTURE_NOTE },
  {
    readings: { heartRateBpm: 92, systolicMmHg: 124, diastolicMmHg: 80, temperatureC: 37.0, sleepHours: 5.2, mood: 2, stress: 4 },
    symptoms: ['Tired', 'Trouble concentrating'],
    activityNote: 'Fictional crew fixture v1. Manual observation after an extended simulation shift; no sensor source.',
  },
  { readings: { heartRateBpm: 78, systolicMmHg: 119, diastolicMmHg: 76, temperatureC: 36.8, sleepHours: 6.8, mood: 3, stress: 3 }, symptoms: ['Tired'], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 74, systolicMmHg: 117, diastolicMmHg: 75, temperatureC: 36.7, sleepHours: 7.2, mood: 4, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 72, systolicMmHg: 116, diastolicMmHg: 74, temperatureC: 36.6, sleepHours: 7.5, mood: 4, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 71, systolicMmHg: 115, diastolicMmHg: 74, temperatureC: 36.7, sleepHours: 7.9, mood: 4, stress: 1 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 75, systolicMmHg: 117, diastolicMmHg: 75, temperatureC: 36.8, sleepHours: 7.0, mood: 3, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  { readings: { heartRateBpm: 73, systolicMmHg: 116, diastolicMmHg: 74, temperatureC: 36.7, sleepHours: 7.6, mood: 4, stress: 2 }, symptoms: [], activityNote: FIXTURE_NOTE },
  {
    readings: { heartRateBpm: 84, systolicMmHg: 121, diastolicMmHg: 78, temperatureC: 36.9, sleepHours: 6.1, mood: 3, stress: 3 },
    symptoms: ['Tired'],
    activityNote: 'Fictional crew fixture v1. Manual observation after a short sleep period; no sensor source.',
  },
];

export const demoCrewRecordCount = rows.length;

/** Deterministic, deep-cloned fixture. Repeated calls never accumulate or mutate records. */
export function buildDemoCheckIns(): CheckIn[] {
  return rows.map((row, index) => ({
    id: `CHK-${String(index + 1).padStart(3, '0')}`,
    recordedAt: `2026-11-${String(4 + index).padStart(2, '0')}T07:40:00.000Z`,
    readings: { ...row.readings },
    symptoms: [...row.symptoms],
    activityNote: row.activityNote,
  }));
}

export type DemoValidation = { ok: boolean; issues: string[] };

/** Validates the fixture against the same reading limits used by manual check-in. */
export function validateDemoCheckIns(checkIns: CheckIn[] = buildDemoCheckIns()): DemoValidation {
  const issues: string[] = [];
  const ids = new Set<string>();

  checkIns.forEach((checkIn) => {
    if (ids.has(checkIn.id)) issues.push(`Duplicate record id ${checkIn.id}.`);
    ids.add(checkIn.id);

    if (Number.isNaN(Date.parse(checkIn.recordedAt))) {
      issues.push(`Record ${checkIn.id} has an unreadable timestamp.`);
    }

    (Object.keys(readingLimits) as (keyof typeof readingLimits)[]).forEach((field) => {
      const value = checkIn.readings[field];
      const { min, max } = readingLimits[field];
      if (value === null) {
        issues.push(`Record ${checkIn.id} is missing ${field}.`);
      } else if (value < min || value > max) {
        issues.push(`Record ${checkIn.id} has ${field} outside ${min}–${max}.`);
      }
    });

    (['mood', 'stress'] as const).forEach((field) => {
      const value = checkIn.readings[field];
      if (value === null || value < 1 || value > 5) {
        issues.push(`Record ${checkIn.id} has ${field} outside 1–5.`);
      }
    });

    checkIn.symptoms.forEach((symptom) => {
      if (!symptomOptions.includes(symptom as (typeof symptomOptions)[number])) {
        issues.push(`Record ${checkIn.id} uses an unknown symptom “${symptom}”.`);
      }
    });

    if (!checkIn.activityNote.includes('Fictional')) {
      issues.push(`Record ${checkIn.id} is not labelled as fictional.`);
    }
  });

  if (checkIns.length === 0) issues.push('The demo fixture contains no records.');

  return { ok: issues.length === 0, issues };
}
