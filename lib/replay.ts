import { syntheticBaseline } from '@/fixtures/crew';
import { buildAssessment, type Assessment, type AssessmentSource } from '@/lib/assessment';
import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { symptomSummaryText } from '@/lib/symptoms';
import type { Baseline, CheckIn, Readings, ReportRecord } from '@/types/astra';

export const REPLAY_PLAYBACK_MS = 1800;
export const REPLAY_MAX_GAP_DAYS = 45;

export type ReplayMetricState = 'observed' | 'last-available' | 'missing';

export type ReplayMetric = {
  key: keyof Readings;
  label: string;
  unit: string;
  decimals: number;
  value: number | null;
  valueText: string;
  recordedAt: string | null;
  recordedAtText: string | null;
  state: ReplayMetricState;
  stateLabel: string;
  baseline: number | null;
  baselineText: string | null;
};

export type ReplayDay = {
  dateKey: string;
  dateText: string;
  flightDay: number | null;
  frameIds: string[];
  recordCount: number;
  review: boolean;
  empty: boolean;
};

export type ReplayEventType = 'observation' | 'review' | 'symptom' | 'report' | 'receipt';

export type ReplayEvent = {
  id: string;
  type: ReplayEventType;
  label: string;
  detail: string;
  at: string;
  atText: string;
};

export type ReplayProvenance = {
  source: AssessmentSource;
  synthetic: true;
  syntheticLabel: string;
  sourceText: string;
  baselineSource: string;
};

export type ReplayFrame = {
  id: string;
  index: number;
  checkIn: CheckIn;
  recordedAtText: string;
  recordedAtMs: number | null;
  dateKey: string | null;
  flightDay: number | null;
  isLatest: boolean;
  symptoms: string[];
  activityNote: string;
  observedCount: number;
  eligibleCheckIns: CheckIn[];
  excludedCount: number;
  cutoffNote: string;
  baselineNote: string;
  metrics: ReplayMetric[];
  assessment: Assessment;
  events: ReplayEvent[];
  provenance: ReplayProvenance;
};

export type ReplayStoryStep = {
  id: 'initial' | 'baseline' | 'variation' | 'review' | 'explanation' | 'overview';
  title: string;
  body: string;
  frameId: string | null;
  action: 'select' | 'overview';
};

export type ReplayTimeline = {
  source: AssessmentSource;
  synthetic: true;
  frames: ReplayFrame[];
  days: ReplayDay[];
  total: number;
  firstId: string | null;
  latestId: string | null;
  referenceTime: number;
  sourceNote: string;
  syntheticLabel: string;
  missionDayNote: string;
  gapsOmitted: boolean;
  empty: boolean;
};

type ReplayMetricSpec = {
  key: keyof Readings;
  label: string;
  unit: string;
  decimals: number;
  baselineKey?: keyof Baseline;
};

const METRICS: ReplayMetricSpec[] = [
  { key: 'heartRateBpm', label: 'Heart rate', unit: 'bpm', decimals: 0, baselineKey: 'heartRateBpm' },
  { key: 'systolicMmHg', label: 'Systolic pressure', unit: 'mmHg', decimals: 0, baselineKey: 'systolicMmHg' },
  { key: 'diastolicMmHg', label: 'Diastolic pressure', unit: 'mmHg', decimals: 0, baselineKey: 'diastolicMmHg' },
  { key: 'temperatureC', label: 'Body temperature', unit: '°C', decimals: 1, baselineKey: 'temperatureC' },
  { key: 'sleepHours', label: 'Sleep duration', unit: 'hours', decimals: 1, baselineKey: 'sleepHours' },
  { key: 'mood', label: 'Mood', unit: 'of 5', decimals: 0 },
  { key: 'stress', label: 'Stress', unit: 'of 5', decimals: 0 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

const SOURCE_TEXT: Record<AssessmentSource, string> = {
  local: 'Local manual observations · stored on this device',
  demo: 'Fictional crew fixture · session only',
};

const SOURCE_NOTE: Record<AssessmentSource, string> = {
  local: 'Local manual observations stored on this device. No connected device, wearable import, or live sensor feed is used.',
  demo: 'Fictional mission history — synthetic observations. Session-only fixture; saved device records are unchanged.',
};

const BASELINE_NOTE = 'The fictional personal baseline is applied retrospectively. It was not established on this historical date.';

const copyCheckIn = (checkIn: CheckIn): CheckIn => ({
  ...checkIn,
  readings: { ...checkIn.readings },
  symptoms: [...checkIn.symptoms],
  ...(checkIn.symptomEntries
    ? { symptomEntries: checkIn.symptomEntries.map((entry) => ({ ...entry })) }
    : {}),
});

const finiteOrNull = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) ? value : null;

export function replayDateKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dateKeyToDayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayNumberToKey(dayNumber: number): string {
  const date = new Date(dayNumber * DAY_MS);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function formatReplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function formatReplayDateFromIso(iso: string): string | null {
  const key = replayDateKey(iso);
  return key ? formatReplayDate(key) : null;
}

const recordedAtText = (iso: string): string => Number.isFinite(Date.parse(iso)) ? formatTimestamp(iso) : 'Recorded time unavailable';

export function clampReplayIndex(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, Math.trunc(index)));
}

export function replayStep(index: number, total: number, direction: 'next' | 'previous' | 'first' | 'latest'): number {
  if (total <= 0) return 0;
  if (direction === 'first') return 0;
  if (direction === 'latest') return total - 1;
  return clampReplayIndex(index + (direction === 'next' ? 1 : -1), total);
}

type TimelineInput = {
  checkIns: CheckIn[];
  reports?: ReportRecord[];
  source: AssessmentSource;
  missionDay?: number | null;
};

function buildMetrics(
  frameCheckIn: CheckIn,
  eligible: CheckIn[],
  index: number,
  baseline: Baseline,
): ReplayMetric[] {
  return METRICS.map((spec) => {
    const selected = finiteOrNull(frameCheckIn.readings[spec.key]);
    let value = selected;
    let recordedAt: string | null = selected !== null ? frameCheckIn.recordedAt : null;
    let state: ReplayMetricState = selected !== null ? 'observed' : 'missing';

    if (value === null) {
      for (let earlier = index - 1; earlier >= 0; earlier -= 1) {
        const candidate = finiteOrNull(eligible[earlier]?.readings[spec.key]);
        if (candidate !== null) {
          value = candidate;
          recordedAt = eligible[earlier].recordedAt;
          state = 'last-available';
          break;
        }
      }
    }

    const baselineValue = spec.baselineKey ? finiteOrNull(baseline[spec.baselineKey]) : null;
    const timeText = recordedAt ? recordedAtText(recordedAt) : null;
    const stateLabel = state === 'observed'
      ? 'Recorded in this observation'
      : state === 'last-available'
        ? `Last recorded ${timeText} · not part of this observation`
        : 'Not recorded on or before this cutoff';

    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      decimals: spec.decimals,
      value,
      valueText: value === null ? 'Not recorded' : `${value.toFixed(spec.decimals)} ${spec.unit}`,
      recordedAt,
      recordedAtText: state === 'observed' ? null : timeText,
      state,
      stateLabel,
      baseline: baselineValue,
      baselineText: baselineValue === null ? null : `${baselineValue.toFixed(spec.decimals)} ${spec.unit}`,
    };
  });
}

function buildEvents(
  checkIn: CheckIn,
  assessment: Assessment,
  report: ReportRecord | undefined,
): ReplayEvent[] {
  const events: ReplayEvent[] = [];
  const measured = Object.values(checkIn.readings).filter((value) => value !== null && Number.isFinite(value)).length;
  events.push({
    id: `${checkIn.id}-observation`,
    type: 'observation',
    label: `Observation ${checkIn.id} recorded`,
    detail: measured === 0 ? 'No measurements were recorded in this check-in.' : `${measured} measurement${measured === 1 ? '' : 's'} recorded in this check-in.`,
    at: checkIn.recordedAt,
    atText: recordedAtText(checkIn.recordedAt),
  });

  if (checkIn.symptoms.length > 0 || (checkIn.symptomEntries?.length ?? 0) > 0) {
    events.push({
      id: `${checkIn.id}-symptoms`,
      type: 'symptom',
      label: 'Symptoms reported',
      detail: symptomSummaryText(checkIn),
      at: checkIn.recordedAt,
      atText: recordedAtText(checkIn.recordedAt),
    });
  }

  const reviewFindings = assessment.findings.filter((finding) => finding.status === 'review');
  if (reviewFindings.length > 0) {
    events.push({
      id: `${checkIn.id}-review`,
      type: 'review',
      label: `${reviewFindings.length} prototype review finding${reviewFindings.length === 1 ? '' : 's'}`,
      detail: `${reviewFindings.map((finding) => finding.label).join(', ')} met the ${DIFFERENCE_THRESHOLD_PERCENT}% demonstration rule. This is not a diagnosis and does not establish a cause.`,
      at: checkIn.recordedAt,
      atText: recordedAtText(checkIn.recordedAt),
    });
  }

  if (report) {
    events.push({
      id: `${report.id}-report`,
      type: 'report',
      label: 'Report saved to the offline outbox',
      detail: `Delivery status: ${report.status}. ${report.receipt ? 'A ground receiver receipt is stored for this report.' : 'No ground receiver receipt is stored for this report.'}`,
      at: report.createdAt,
      atText: recordedAtText(report.createdAt),
    });
    if (report.receipt) {
      events.push({
        id: `${report.id}-receipt`,
        type: 'receipt',
        label: 'Ground receiver receipt recorded',
        detail: `Receiver reference ${report.receipt.receiverReference}.`,
        at: report.receipt.receivedAt,
        atText: recordedAtText(report.receipt.receivedAt),
      });
    }
  }

  return events;
}

export function buildDemoStory(timeline: ReplayTimeline): ReplayStoryStep[] {
  const { frames } = timeline;
  if (frames.length === 0) return [];

  const first = frames[0];
  const baselineFrame = frames.find((frame) => frame.assessment.counts.compared > 0) ?? first;
  const variation = frames.reduce((best, frame) => {
    const score = Math.abs(frame.assessment.findings.find((finding) => finding.key === 'heartRateBpm')?.percentChange ?? -1);
    const bestScore = Math.abs(best.assessment.findings.find((finding) => finding.key === 'heartRateBpm')?.percentChange ?? -1);
    return score > bestScore ? frame : best;
  }, first);
  const reviewFrames = frames.filter((frame) => frame.assessment.counts.review > 0);
  const reviewFrame = reviewFrames[0] ?? null;
  const explanationFrame = reviewFrame ?? variation;
  const variedFinding = variation.assessment.findings.find((finding) => finding.key === 'heartRateBpm');

  const steps: ReplayStoryStep[] = [
    {
      id: 'initial',
      title: 'Initial recorded observations',
      body: `The earliest stored observation is ${first.checkIn.id} from ${first.recordedAtText}. It is the first of ${frames.length} recorded observations in this synthetic mission history.`,
      frameId: first.id,
      action: 'select',
    },
    {
      id: 'baseline',
      title: 'Baseline comparison context',
      body: `${baselineFrame.checkIn.id} contains ${baselineFrame.assessment.counts.compared} baseline comparison${baselineFrame.assessment.counts.compared === 1 ? '' : 's'} and ${baselineFrame.assessment.counts.review} prototype review finding${baselineFrame.assessment.counts.review === 1 ? '' : 's'}. The fictional baseline is applied retrospectively.`,
      frameId: baselineFrame.id,
      action: 'select',
    },
    {
      id: 'variation',
      title: 'Recorded values changed',
      body: variedFinding?.percentChange != null
        ? `${variation.checkIn.id} holds the largest recorded heart-rate difference in this fixture: ${formatSigned(variedFinding.percentChange, 2)}% from the fictional baseline. No cause is established by these records.`
        : 'No heart-rate baseline comparison is available in this fixture.',
      frameId: variation.id,
      action: 'select',
    },
  ];

  if (reviewFrame) {
    const labels = reviewFrame.assessment.findings.filter((finding) => finding.status === 'review').map((finding) => finding.label).join(', ');
    steps.push({
      id: 'review',
      title: 'A genuine review finding',
      body: `${reviewFrame.checkIn.id} recorded a prototype review finding for ${labels}. This is the earliest of ${reviewFrames.length} stored observation${reviewFrames.length === 1 ? '' : 's'} with review findings in the fictional fixture.`,
      frameId: reviewFrame.id,
      action: 'select',
    });
  }

  steps.push({
    id: 'explanation',
    title: 'Explain the selected finding',
    body: reviewFrame
      ? `That observation is selected. Expand "Why was this highlighted?" on the highlighted card to see the exact recorded value, fictional baseline, difference, percentage, and demonstration threshold.`
      : 'Select any comparison card and expand "Show the calculation" to see the exact recorded value, fictional baseline, difference, percentage, and demonstration threshold.',
    frameId: explanationFrame.id,
    action: 'select',
  });

  steps.push({
    id: 'overview',
    title: 'Return to the current overview',
    body: 'The replay is read-only. Returning to the overview does not change observations, reports, baselines, or the active crew identity.',
    frameId: null,
    action: 'overview',
  });

  return steps;
}

export function buildReplayTimeline({
  checkIns,
  reports = [],
  source,
  missionDay = null,
}: TimelineInput): ReplayTimeline {
  const ordered = checkIns
    .map((checkIn, index) => ({ checkIn, index }))
    .sort((left, right) => {
      const leftTime = Date.parse(left.checkIn.recordedAt);
      const rightTime = Date.parse(right.checkIn.recordedAt);
      const leftValid = Number.isFinite(leftTime);
      const rightValid = Number.isFinite(rightTime);
      if (leftValid && rightValid && leftTime !== rightTime) return leftTime - rightTime;
      if (leftValid !== rightValid) return leftValid ? -1 : 1;
      return left.index - right.index;
    })
    .map((entry) => copyCheckIn(entry.checkIn));

  const referenceTime = ordered.reduce((latest, checkIn) => {
    const parsed = Date.parse(checkIn.recordedAt);
    return Number.isFinite(parsed) && parsed > latest ? parsed : latest;
  }, 0);
  const latestDateKey = ordered.reduce<string | null>((latest, checkIn) => {
    const key = replayDateKey(checkIn.recordedAt);
    return key && (!latest || key > latest) ? key : latest;
  }, null);
  const latestDayNumber = latestDateKey ? dateKeyToDayNumber(latestDateKey) : null;
  const flightDayFor = (key: string | null): number | null => {
    if (key === null || latestDayNumber === null || missionDay === null) return null;
    return missionDay - (latestDayNumber - dateKeyToDayNumber(key));
  };

  const reportByCheckIn = new Map(reports.map((report) => [report.checkInId, report]));

  const frames: ReplayFrame[] = ordered.map((checkIn, index) => {
    const eligibleCheckIns = ordered.slice(0, index + 1).map(copyCheckIn);
    const assessment = buildAssessment(createReportSnapshot(checkIn), { source, now: referenceTime });
    const dateKey = replayDateKey(checkIn.recordedAt);
    const recordedAtMs = Date.parse(checkIn.recordedAt);
    const excludedCount = ordered.length - index - 1;
    const cutoffNote = excludedCount === 0
      ? `This frame uses all ${index + 1} recorded observation${index === 0 ? '' : 's'} available at this cutoff. No later records exist.`
      : `This frame uses the ${index + 1} observation${index === 0 ? '' : 's'} recorded on or before ${recordedAtText(checkIn.recordedAt)}. ${excludedCount} later observation${excludedCount === 1 ? '' : 's'} excluded.`;

    return {
      id: checkIn.id,
      index,
      checkIn,
      recordedAtText: recordedAtText(checkIn.recordedAt),
      recordedAtMs: Number.isFinite(recordedAtMs) ? recordedAtMs : null,
      dateKey,
      flightDay: flightDayFor(dateKey),
      isLatest: index === ordered.length - 1,
      symptoms: [...checkIn.symptoms],
      activityNote: checkIn.activityNote,
      observedCount: Object.values(checkIn.readings).filter((value) => value !== null && Number.isFinite(value)).length,
      eligibleCheckIns,
      excludedCount,
      cutoffNote,
      baselineNote: BASELINE_NOTE,
      metrics: buildMetrics(checkIn, eligibleCheckIns, index, syntheticBaseline),
      assessment,
      events: buildEvents(checkIn, assessment, reportByCheckIn.get(checkIn.id)),
      provenance: {
        source,
        synthetic: true,
        syntheticLabel: 'Synthetic data',
        sourceText: SOURCE_TEXT[source],
        baselineSource: assessment.baselineSource,
      },
    };
  });

  const dayMap = new Map<string, { frameIds: string[]; review: boolean }>();
  frames.forEach((frame) => {
    if (!frame.dateKey) return;
    const day = dayMap.get(frame.dateKey) ?? { frameIds: [], review: false };
    day.frameIds.push(frame.id);
    day.review = day.review || frame.assessment.counts.review > 0;
    dayMap.set(frame.dateKey, day);
  });

  const observedKeys = [...dayMap.keys()].sort();
  let gapsOmitted = false;
  const days: ReplayDay[] = [];
  if (observedKeys.length > 0) {
    const firstDay = dateKeyToDayNumber(observedKeys[0]);
    const lastDay = dateKeyToDayNumber(observedKeys.at(-1)!);
    const span = lastDay - firstDay;
    const includeGaps = span <= REPLAY_MAX_GAP_DAYS;
    gapsOmitted = !includeGaps;
    const keys = includeGaps
      ? Array.from({ length: span + 1 }, (_, offset) => dayNumberToKey(firstDay + offset))
      : observedKeys;
    keys.forEach((key) => {
      const entry = dayMap.get(key);
      days.push({
        dateKey: key,
        dateText: formatReplayDate(key),
        flightDay: flightDayFor(key),
        frameIds: entry?.frameIds ?? [],
        recordCount: entry?.frameIds.length ?? 0,
        review: entry?.review ?? false,
        empty: !entry,
      });
    });
  }

  return {
    source,
    synthetic: true,
    frames,
    days,
    total: frames.length,
    firstId: frames[0]?.id ?? null,
    latestId: frames.at(-1)?.id ?? null,
    referenceTime,
    sourceNote: SOURCE_NOTE[source],
    syntheticLabel: 'Synthetic data',
    missionDayNote: missionDay === null
      ? 'Flight days are not stored with local observations, so this replay shows recorded dates only.'
      : 'Flight days are derived from the latest fixture observation and the fictional mission day.',
    gapsOmitted,
    empty: frames.length === 0,
  };
}
