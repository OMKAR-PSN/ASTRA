export type Readings = {
  heartRateBpm: number | null;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  temperatureC: number | null;
  sleepHours: number | null;
  mood: number | null;
  stress: number | null;
};

export type CheckIn = {
  id: string;
  recordedAt: string;
  readings: Readings;
  symptoms: string[];
  activityNote: string;
};

export type Baseline = {
  heartRateBpm: number;
  systolicMmHg: number;
  diastolicMmHg: number;
  temperatureC: number;
  sleepHours: number;
};

export type CrewProfile = {
  name: string;
  role: string;
  missionName: string;
  missionDay: number;
};

export type MetricComparison = {
  key: keyof Baseline;
  label: string;
  unit: string;
  decimals: number;
  current: number | null;
  baseline: number;
  change: number | null;
  percentChange: number | null;
};

export type ExplanationSections = {
  observed: string[];
  calculated: string[];
  possibleInterpretation: string;
  suggestedNextStep: string;
};

export type ReportSnapshot = {
  crew: CrewProfile;
  baseline: Baseline;
  checkIn: CheckIn;
  comparisons: MetricComparison[];
  explanation: ExplanationSections;
};

export type DeliveryStatus = 'queued' | 'sending' | 'failed' | 'acknowledged';

export type ReceiverReceipt = {
  receivedAt: string;
  receiverReference: string;
};

export type ReportRecord = {
  id: string;
  checkInId: string;
  createdAt: string;
  status: DeliveryStatus;
  snapshot: ReportSnapshot;
  receipt: ReceiverReceipt | null;
  retryNote: string | null;
};

export type CheckInDraft = {
  readings: Readings;
  symptoms: string[];
  activityNote: string;
};
