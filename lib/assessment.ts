import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import type { Baseline, MetricComparison, Readings, ReportSnapshot } from '@/types/astra';

export type AssessmentStatus = 'review' | 'within-range' | 'no-baseline' | 'missing';
export type AssessmentSource = 'local' | 'demo';
export type AssessmentOverall = 'review' | 'within-range' | 'insufficient';

export type AssessmentCalculation = {
  observed: string;
  baseline: string;
  difference: string;
  relative: string;
  threshold: string;
  formula: string;
  source: string;
  recordedAt: string;
  baselineSource: string;
  note: string;
};

export type AssessmentFinding = {
  key: keyof Readings;
  label: string;
  unit: string;
  decimals: number;
  observed: number | null;
  observedValue: string;
  observedText: string;
  baseline: number | null;
  baselineValue: string;
  baselineText: string;
  change: number | null;
  percentChange: number | null;
  status: AssessmentStatus;
  statusLabel: string;
  headline: string;
  note: string;
  recordedAtText: string;
  ageText: string;
  stale: boolean;
  staleNote: string | null;
  hasBar: boolean;
  calculation: AssessmentCalculation;
};

export type Assessment = {
  checkInId: string;
  recordedAt: string;
  recordedAtText: string;
  ageText: string;
  stale: boolean;
  source: AssessmentSource;
  sourceText: string;
  synthetic: true;
  findings: AssessmentFinding[];
  counts: { review: number; compared: number; missing: number; noBaseline: number; total: number };
  overallStatus: AssessmentOverall;
  summaryTitle: string;
  summaryBody: string;
  nextSteps: string[];
  emergencyNote: string;
  engineSummary: string;
  baselineSource: string;
  thresholdPercent: number;
};

type MetricSpec = {
  key: keyof Readings;
  comparisonLabel?: string;
  label: string;
  noun: string;
  unit: string;
  decimals: number;
  selfReported?: boolean;
};

export const STALE_AFTER_HOURS = 24;

const METRICS: MetricSpec[] = [
  { key: 'heartRateBpm', comparisonLabel: 'Heart rate', label: 'Heart rate', noun: 'heart rate', unit: 'bpm', decimals: 0 },
  { key: 'systolicMmHg', comparisonLabel: 'Systolic pressure', label: 'Systolic pressure', noun: 'systolic pressure', unit: 'mmHg', decimals: 0 },
  { key: 'diastolicMmHg', comparisonLabel: 'Diastolic pressure', label: 'Diastolic pressure', noun: 'diastolic pressure', unit: 'mmHg', decimals: 0 },
  { key: 'temperatureC', comparisonLabel: 'Body temperature', label: 'Body temperature', noun: 'body temperature', unit: '°C', decimals: 1 },
  { key: 'sleepHours', comparisonLabel: 'Sleep', label: 'Sleep duration', noun: 'sleep duration', unit: 'hours', decimals: 1 },
  { key: 'mood', label: 'Mood', noun: 'mood', unit: 'of 5', decimals: 0, selfReported: true },
  { key: 'stress', label: 'Stress', noun: 'stress', unit: 'of 5', decimals: 0, selfReported: true },
];

const SOURCE_TEXT: Record<AssessmentSource, string> = {
  local: 'Local manual entry · stored on this device',
  demo: 'Fictional crew fixture · session only',
};

const BASELINE_SOURCE = 'Fictional individual baseline · fixture v1 · synthetic.';
const RULE_NOTE = 'The threshold is a demonstration rule, not a clinically validated medical threshold.';
const EMERGENCY_NOTE = 'If you feel very unwell or a symptom worries you, follow your mission\'s approved emergency procedures and contact designated medical support. This assessment does not determine urgency.';

const formatNumber = (value: number | null, decimals: number): string =>
  value === null || !Number.isFinite(value) ? 'Not measured' : value.toFixed(decimals);

const withUnit = (value: number | null, decimals: number, unit: string): string =>
  value === null || !Number.isFinite(value) ? 'Not measured' : `${value.toFixed(decimals)} ${unit}`;

export function formatRecordAge(recordedAtMs: number, now: number): string {
  if (!Number.isFinite(recordedAtMs)) return 'Recorded time unavailable';
  const minutes = Math.max(0, Math.floor((now - recordedAtMs) / 60000));
  if (minutes < 1) return 'Recorded just now';
  if (minutes < 60) return `Recorded ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Recorded ${hours} h ago`;
  return `Recorded ${Math.floor(hours / 24)} days ago`;
}

function buildFinding(
  spec: MetricSpec,
  snapshot: ReportSnapshot,
  comparison: MetricComparison | undefined,
  source: AssessmentSource,
  now: number,
): AssessmentFinding {
  const observed = snapshot.checkIn.readings[spec.key];
  const fallbackBaseline = spec.comparisonLabel ? snapshot.baseline[spec.key as keyof Baseline] : undefined;
  const baseline = spec.selfReported
    ? null
    : comparison?.baseline ?? (Number.isFinite(fallbackBaseline) ? fallbackBaseline as number : null);
  const finiteBaseline = baseline !== null && Number.isFinite(baseline) ? baseline : null;
  const change = comparison?.change ?? null;
  const percentChange = comparison?.percentChange ?? null;
  const recordedAtMs = Date.parse(snapshot.checkIn.recordedAt);
  const recordedAtText = Number.isFinite(recordedAtMs) ? formatTimestamp(snapshot.checkIn.recordedAt) : 'Recorded time unavailable';
  const ageText = formatRecordAge(recordedAtMs, now);
  const stale = Number.isFinite(recordedAtMs) && now - recordedAtMs > STALE_AFTER_HOURS * 3600000;
  const staleNote = stale
    ? 'This reading is from an earlier check-in. It should not be treated as a current measurement.'
    : null;

  let status: AssessmentStatus;
  if (observed === null || !Number.isFinite(observed)) status = 'missing';
  else if (percentChange === null) status = 'no-baseline';
  else if (Math.abs(percentChange) >= DIFFERENCE_THRESHOLD_PERCENT) status = 'review';
  else status = 'within-range';

  const statusLabel = status === 'review'
    ? 'Review suggested'
    : status === 'within-range'
      ? 'Within demo range'
      : status === 'no-baseline'
        ? (spec.selfReported ? 'No baseline comparison' : 'Comparison unavailable')
        : 'Not measured';

  let headline: string;
  if (status === 'missing') {
    headline = spec.selfReported
      ? `${spec.label} was not recorded for this check-in. The prototype has no personal baseline for ${spec.noun}, so no comparison is shown.`
      : `${spec.label} was not recorded for this check-in, so no comparison can be made.`;
  } else if (status === 'no-baseline') {
    headline = spec.selfReported
      ? `${spec.label} is a self-reported entry on a 1–5 scale. The prototype has no personal baseline for ${spec.noun}, so no comparison is shown.`
      : `The prototype could not calculate a percentage difference for ${spec.noun} from the available baseline.`;
  } else if (status === 'within-range') {
    headline = change === 0
      ? `Your recorded ${spec.noun} matches your fictional personal baseline exactly.`
      : "This observation did not exceed the prototype's configured comparison threshold.";
  } else if ((percentChange ?? 0) > 0) {
    headline = `Your recorded ${spec.noun} is higher than your fictional personal baseline.`;
  } else {
    headline = `Your recorded ${spec.noun} is lower than your fictional personal baseline.`;
  }

  const note = status === 'review'
    ? 'This is a comparison finding, not a diagnosis.'
    : status === 'within-range'
      ? 'This does not establish that the reading is normal or safe.'
      : status === 'no-baseline'
        ? (spec.selfReported ? 'Self-reported scales are recorded without a baseline comparison.' : 'No default or substitute baseline is used.')
        : 'A missing observation is not a normal result.';

  const observedText = withUnit(observed, spec.decimals, spec.unit);
  const baselineText = spec.selfReported
    ? 'No baseline'
    : finiteBaseline === null
      ? 'Not available'
      : `${finiteBaseline.toFixed(spec.decimals)} ${spec.unit}`;

  let formula: string;
  if (spec.selfReported) {
    formula = 'No baseline value exists for self-reported entries, so no percentage is calculated.';
  } else if (observed === null || !Number.isFinite(observed)) {
    formula = 'No percentage is calculated without a recorded observation.';
  } else if (finiteBaseline === null) {
    formula = 'No percentage is calculated because the baseline is unavailable.';
  } else if (finiteBaseline === 0) {
    formula = 'No percentage is calculated because division by a zero baseline is undefined.';
  } else if (percentChange === null) {
    formula = 'Percentage difference is unavailable from the stored comparison.';
  } else {
    formula = `(${observed.toFixed(spec.decimals)} − ${finiteBaseline.toFixed(spec.decimals)}) ÷ ${finiteBaseline.toFixed(spec.decimals)} × 100 = ${formatSigned(percentChange, 2)}%`;
  }

  return {
    key: spec.key,
    label: spec.label,
    unit: spec.unit,
    decimals: spec.decimals,
    observed: Number.isFinite(observed) ? observed : null,
    observedValue: spec.selfReported ? formatNumber(observed, 0) : formatNumber(observed, spec.decimals),
    observedText,
    baseline: finiteBaseline,
    baselineValue: spec.selfReported ? 'No baseline' : finiteBaseline === null ? 'Not available' : finiteBaseline.toFixed(spec.decimals),
    baselineText,
    change,
    percentChange,
    status,
    statusLabel,
    headline,
    note,
    recordedAtText,
    ageText,
    stale,
    staleNote,
    hasBar: !spec.selfReported && observed !== null && Number.isFinite(observed) && finiteBaseline !== null,
    calculation: {
      observed: observedText,
      baseline: baselineText,
      difference: change === null || !Number.isFinite(change) ? 'Not calculated' : `${formatSigned(change, spec.decimals)} ${spec.unit}`,
      relative: percentChange === null ? 'Not calculated' : `${formatSigned(percentChange, 2)}%`,
      threshold: `${DIFFERENCE_THRESHOLD_PERCENT}% prototype rule`,
      formula,
      source: `${snapshot.checkIn.id} · ${SOURCE_TEXT[source]}`,
      recordedAt: recordedAtText,
      baselineSource: spec.selfReported ? 'No baseline exists for self-reported entries.' : BASELINE_SOURCE,
      note: RULE_NOTE,
    },
  };
}

export function buildAssessment(
  snapshot: ReportSnapshot,
  { source, now }: { source: AssessmentSource; now: number },
): Assessment {
  const findings = METRICS.map((spec) =>
    buildFinding(spec, snapshot, snapshot.comparisons.find((item) => item.label === spec.comparisonLabel), source, now),
  );
  const counts = {
    review: findings.filter((item) => item.status === 'review').length,
    compared: findings.filter((item) => item.percentChange !== null).length,
    missing: findings.filter((item) => item.status === 'missing').length,
    noBaseline: findings.filter((item) => item.status === 'no-baseline').length,
    total: findings.length,
  };
  const overallStatus: AssessmentOverall = counts.review > 0 ? 'review' : counts.compared > 0 ? 'within-range' : 'insufficient';

  let summaryTitle: string;
  let summaryBody: string;
  if (counts.review > 0) {
    summaryTitle = `${counts.review} observation${counts.review === 1 ? '' : 's'} flagged for review`;
    summaryBody = `These comparisons met the prototype's ${DIFFERENCE_THRESHOLD_PERCENT}% rule against the fictional personal baseline. They are not diagnoses and do not establish a cause or urgency.`;
  } else if (counts.compared > 0) {
    summaryTitle = 'No observations flagged for review';
    summaryBody = `${counts.compared} baseline comparison${counts.compared === 1 ? '' : 's'} stayed inside the prototype's ${DIFFERENCE_THRESHOLD_PERCENT}% rule. This does not establish that the readings are normal or safe.`;
  } else {
    summaryTitle = 'No baseline comparisons available';
    summaryBody = counts.noBaseline > 0 && counts.missing === counts.total - counts.noBaseline
      ? 'This check-in contains only self-reported entries. The prototype compares heart rate, blood pressure, temperature, and sleep with the fictional personal baseline.'
      : 'This check-in has no measured values that can be compared with the fictional personal baseline. Record at least one measurement to enable a comparison.';
  }

  const reviewNames = findings.filter((item) => item.status === 'review').map((item) => item.label.toLowerCase()).join(', ');
  const nextSteps = counts.review > 0
    ? [
        `Review the observation details and measurement context for ${reviewNames}.`,
        'Check whether the value was recorded correctly.',
        'Add any relevant symptoms or activity notes to your next check-in.',
        'Follow applicable mission-approved medical procedures. Consult designated medical support when available and appropriate.',
      ]
    : counts.compared > 0
      ? [
          'Review the observation details and measurement context.',
          'Check whether the values were recorded correctly.',
          'Add any relevant symptoms or activity notes to your next check-in.',
        ]
      : [
          'Record at least one measurement in a future check-in to enable a baseline comparison.',
          'Add any relevant symptoms or activity notes if they apply.',
        ];

  const recordedAtMs = Date.parse(snapshot.checkIn.recordedAt);
  return {
    checkInId: snapshot.checkIn.id,
    recordedAt: snapshot.checkIn.recordedAt,
    recordedAtText: Number.isFinite(recordedAtMs) ? formatTimestamp(snapshot.checkIn.recordedAt) : 'Recorded time unavailable',
    ageText: formatRecordAge(recordedAtMs, now),
    stale: Number.isFinite(recordedAtMs) && now - recordedAtMs > STALE_AFTER_HOURS * 3600000,
    source,
    sourceText: SOURCE_TEXT[source],
    synthetic: true,
    findings,
    counts,
    overallStatus,
    summaryTitle,
    summaryBody,
    nextSteps,
    emergencyNote: EMERGENCY_NOTE,
    engineSummary: snapshot.explanation.possibleInterpretation,
    baselineSource: BASELINE_SOURCE,
    thresholdPercent: DIFFERENCE_THRESHOLD_PERCENT,
  };
}
