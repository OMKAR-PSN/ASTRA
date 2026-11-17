export type Readings = {
  heartRateBpm: number | null;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  temperatureC: number | null;
  sleepHours: number | null;
  mood: number | null;
  stress: number | null;
};

export type SymptomBodyView = 'front' | 'back';
export type SymptomBodySide = 'left' | 'right' | 'center' | 'not_applicable';
export type SymptomStatus = 'none' | 'reported' | 'not-answered';
export type SymptomRegionId =
  | 'head'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'upper-back'
  | 'lower-back'
  | 'shoulder'
  | 'upper-arm'
  | 'forearm'
  | 'hand'
  | 'hip'
  | 'thigh'
  | 'knee'
  | 'lower-leg'
  | 'foot';
export type SymptomTypeId = 'pain' | 'pressure' | 'tingling' | 'numbness' | 'stiffness' | 'swelling' | 'other';

export type SymptomEntry = {
  symptomEntryId: string;
  bodyRegion: SymptomRegionId | null;
  bodySide: SymptomBodySide;
  bodyView: SymptomBodyView | null;
  symptomType: SymptomTypeId;
  discomfortIntensity: number | null;
  symptomNote: string;
  recordedAtUTC: string;
};

export type AdaptiveRuleId = 'fatigue' | 'head' | 'sleep' | 'dizziness' | 'body' | 'measurement';
export type AdaptiveAnswerSource = 'guided' | 'detailed';

export type AdaptiveAnswer = {
  /** Stable option IDs from the question catalog. Empty for a text-only answer. */
  optionIds: string[];
  /** Bounded free-text note. Null when the question has no text part. */
  text: string | null;
};

/** Optional, self-reported follow-up answer. Absent on records saved before adaptive questions existed. */
export type AdaptiveResponse = {
  questionId: string;
  ruleId: AdaptiveRuleId;
  answer: AdaptiveAnswer;
  source: AdaptiveAnswerSource;
  answeredAtUTC: string;
  /** Resolved body-map location used in the stored question wording. Null for non-body questions. */
  contextLabel: string | null;
};

export type CheckIn = {
  id: string;
  recordedAt: string;
  readings: Readings;
  symptoms: string[];
  activityNote: string;
  /** Structured self-reported entries. Absent on records saved before the body map existed. */
  symptomEntries?: SymptomEntry[];
  /** Present only on records saved with the body-map-aware forms. */
  symptomStatus?: SymptomStatus;
  /** Optional follow-up answers. Absent on records saved before adaptive questions existed. */
  adaptiveResponses?: AdaptiveResponse[];
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
  symptomEntries?: SymptomEntry[];
  symptomStatus?: SymptomStatus;
  adaptiveResponses?: AdaptiveResponse[];
};
