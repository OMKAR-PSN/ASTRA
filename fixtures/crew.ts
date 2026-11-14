import type { Baseline, CrewProfile } from '@/types/astra';

export const crewProfile: CrewProfile = {
  name: 'Avery Rao',
  role: 'Crew member, systems team',
  missionName: 'Meridian Transit (simulated)',
  missionDay: 183,
};

export const syntheticBaseline: Baseline = {
  heartRateBpm: 72,
  systolicMmHg: 116,
  diastolicMmHg: 74,
  temperatureC: 36.7,
  sleepHours: 7.5,
};
