import type { Readings } from '@/types/astra';

export const symptomOptions = [
  'Tired',
  'Headache',
  'Muscle soreness',
  'Trouble sleeping',
  'Trouble concentrating',
  'Dizziness',
  'Nausea',
] as const;

export const demoReadings: Readings = {
  heartRateBpm: 92,
  systolicMmHg: 118,
  diastolicMmHg: 76,
  temperatureC: 36.9,
  sleepHours: 6.5,
  mood: 3,
  stress: 3,
};

export const emptyReadings: Readings = {
  heartRateBpm: null,
  systolicMmHg: null,
  diastolicMmHg: null,
  temperatureC: null,
  sleepHours: null,
  mood: null,
  stress: null,
};
