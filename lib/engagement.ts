import type { CheckIn } from '@/types/astra';

export type EngagementEventKind = 'replay-explored' | 'calculation-opened' | 'report-explained';

export type EngagementEvent = {
  kind: EngagementEventKind;
  recordedAt: string;
};

export type EngagementState = {
  journeyVisible: boolean;
  events: EngagementEvent[];
};

export type MilestoneId =
  | 'first-log'
  | 'routine-builder'
  | 'consistent-explorer'
  | 'record-explorer'
  | 'data-explorer'
  | 'report-explorer';

export type MilestoneDefinition = {
  id: MilestoneId;
  title: string;
  description: string;
  category: 'participation' | 'learning';
  eventKind: EngagementEventKind | null;
  target: number | null;
};

export type EngagementMilestone = MilestoneDefinition & {
  unlocked: boolean;
  current: number | null;
  progressText: string;
  unlockedAt: string | null;
};

export type CheckInDay = {
  key: string;
  count: number;
};

export type RoutineStep = {
  key: 'start' | 'record' | 'review' | 'save';
  label: string;
  complete: boolean;
};

export type RoutineProgress = {
  dayKey: string;
  complete: boolean;
  completedSteps: number;
  totalSteps: number;
  recordsToday: number;
  steps: RoutineStep[];
};

export type RecentParticipation = {
  id: string;
  recordedAt: string;
  dayKey: string;
};

export type JourneyAction = {
  key: 'check-in' | 'assessment' | 'replay' | 'delivery';
  label: string;
  description: string;
  href: '/check-in' | '/guided-check-in' | '/assessment' | '/replay' | '/delivery';
};

export type JourneySummary = {
  days: CheckInDay[];
  distinctDays: number;
  routine: RoutineProgress;
  milestones: EngagementMilestone[];
  unlockedCount: number;
  recent: RecentParticipation[];
  encouragement: string;
  nextAction: JourneyAction;
};

export const DEFAULT_ENGAGEMENT: EngagementState = {
  journeyVisible: true,
  events: [],
};

const EVENT_KINDS: EngagementEventKind[] = ['replay-explored', 'calculation-opened', 'report-explained'];

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'first-log',
    title: 'First Log',
    description: 'Your first health check-in is recorded.',
    category: 'participation',
    eventKind: null,
    target: 1,
  },
  {
    id: 'routine-builder',
    title: 'Routine Builder',
    description: "You've recorded check-ins across three different days.",
    category: 'participation',
    eventKind: null,
    target: 3,
  },
  {
    id: 'consistent-explorer',
    title: 'Consistent Explorer',
    description: "You've built a record across seven different days.",
    category: 'participation',
    eventKind: null,
    target: 7,
  },
  {
    id: 'record-explorer',
    title: 'Record Explorer',
    description: 'You explored your recorded health history.',
    category: 'learning',
    eventKind: 'replay-explored',
    target: null,
  },
  {
    id: 'data-explorer',
    title: 'Data Explorer',
    description: 'You explored how a recorded observation was compared.',
    category: 'learning',
    eventKind: 'calculation-opened',
    target: null,
  },
  {
    id: 'report-explorer',
    title: 'Report Explorer',
    description: 'You reviewed how your health reports are managed.',
    category: 'learning',
    eventKind: 'report-explained',
    target: null,
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function normalizeEngagement(value: unknown): EngagementState {
  if (!value || typeof value !== 'object') return { ...DEFAULT_ENGAGEMENT, events: [] };
  const record = value as Partial<EngagementState>;
  const seen = new Set<EngagementEventKind>();
  const events = Array.isArray(record.events)
    ? record.events.filter((event): event is EngagementEvent => {
      if (!event || typeof event !== 'object') return false;
      const candidate = event as EngagementEvent;
      if (!EVENT_KINDS.includes(candidate.kind) || seen.has(candidate.kind)) return false;
      if (typeof candidate.recordedAt !== 'string' || Number.isNaN(Date.parse(candidate.recordedAt))) return false;
      seen.add(candidate.kind);
      return true;
    })
    : [];
  return {
    journeyVisible: typeof record.journeyVisible === 'boolean' ? record.journeyVisible : true,
    events,
  };
}

export function addEngagementEvent(
  engagement: EngagementState,
  kind: EngagementEventKind,
  recordedAt: string,
): EngagementState {
  if (!engagement.journeyVisible) return engagement;
  if (engagement.events.some((event) => event.kind === kind)) return engagement;
  return { ...engagement, events: [...engagement.events, { kind, recordedAt }] };
}

export function setJourneyVisibility(engagement: EngagementState, visible: boolean): EngagementState {
  return engagement.journeyVisible === visible ? engagement : { ...engagement, journeyVisible: visible };
}

export function checkInDayKey(recordedAt: string): string | null {
  const time = Date.parse(recordedAt);
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10);
}

export function utcDayKeyFromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function formatUtcDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function calculateCheckInDays(checkIns: CheckIn[]): { days: CheckInDay[]; distinctDays: number } {
  const seenIds = new Set<string>();
  const counts = new Map<string, number>();
  checkIns.forEach((checkIn) => {
    if (seenIds.has(checkIn.id)) return;
    seenIds.add(checkIn.id);
    const key = checkInDayKey(checkIn.recordedAt);
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const days = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => ({ key, count }));
  return { days, distinctDays: days.length };
}

export function deriveRoutineProgress(checkIns: CheckIn[], referenceTime: number): RoutineProgress {
  const dayKey = utcDayKeyFromTime(referenceTime);
  const seenIds = new Set<string>();
  const recordsToday = checkIns.filter((checkIn) => {
    if (seenIds.has(checkIn.id)) return false;
    seenIds.add(checkIn.id);
    return checkInDayKey(checkIn.recordedAt) === dayKey;
  }).length;
  const complete = recordsToday > 0;
  const steps: RoutineStep[] = [
    { key: 'start', label: 'Start check-in', complete },
    { key: 'record', label: 'Record observations', complete },
    { key: 'review', label: 'Review your entries', complete },
    { key: 'save', label: 'Save check-in', complete },
  ];
  return {
    dayKey,
    complete,
    completedSteps: complete ? steps.length : 0,
    totalSteps: steps.length,
    recordsToday,
    steps,
  };
}

export function evaluateMilestones(checkIns: CheckIn[], engagement: EngagementState): EngagementMilestone[] {
  const { distinctDays } = calculateCheckInDays(checkIns);
  const eventFor = (kind: EngagementEventKind | null) =>
    kind ? engagement.events.find((event) => event.kind === kind) ?? null : null;

  return MILESTONES.map((definition) => {
    if (definition.eventKind) {
      const event = eventFor(definition.eventKind);
      const eventDay = event ? checkInDayKey(event.recordedAt) : null;
      return {
        ...definition,
        unlocked: event !== null,
        current: null,
        progressText: event
          ? eventDay ? `Explored on ${formatUtcDayKey(eventDay)}.` : 'Explored.'
          : 'Not explored yet.',
        unlockedAt: event?.recordedAt ?? null,
      };
    }

    const target = definition.target ?? 1;
    const current = Math.min(distinctDays, target);
    const unlocked = distinctDays >= target;
    return {
      ...definition,
      unlocked,
      current,
      progressText: definition.id === 'first-log'
        ? unlocked ? '1 valid check-in recorded.' : 'No valid check-in saved yet.'
        : `${current} of ${target} check-in days completed.`,
      unlockedAt: null,
    };
  });
}

export function getRecentParticipation(checkIns: CheckIn[], limit = 4): RecentParticipation[] {
  const seenIds = new Set<string>();
  return checkIns
    .flatMap((checkIn) => {
      if (seenIds.has(checkIn.id)) return [];
      seenIds.add(checkIn.id);
      const time = Date.parse(checkIn.recordedAt);
      const dayKey = checkInDayKey(checkIn.recordedAt);
      return Number.isNaN(time) || !dayKey ? [] : [{ id: checkIn.id, recordedAt: checkIn.recordedAt, dayKey, time }];
    })
    .sort((left, right) => right.time - left.time)
    .slice(0, limit)
    .map((entry) => ({ id: entry.id, recordedAt: entry.recordedAt, dayKey: entry.dayKey }));
}

function chooseNextAction(routine: RoutineProgress, engagement: EngagementState): JourneyAction {
  if (!routine.complete) {
    return {
      key: 'check-in',
      label: "Record today's check-in",
      description: 'Guided and detailed check-ins both complete the daily routine after a successful save.',
      href: '/guided-check-in',
    };
  }
  if (!engagement.events.some((event) => event.kind === 'calculation-opened')) {
    return {
      key: 'assessment',
      label: 'See how a value was compared',
      description: 'Open a calculation in your assessment to review the recorded value, baseline, and difference.',
      href: '/assessment',
    };
  }
  if (!engagement.events.some((event) => event.kind === 'replay-explored')) {
    return {
      key: 'replay',
      label: 'Explore your recorded history',
      description: 'Step through recorded observations in Mission Health Replay.',
      href: '/replay',
    };
  }
  if (!engagement.events.some((event) => event.kind === 'report-explained')) {
    return {
      key: 'delivery',
      label: 'Review how reports are managed',
      description: 'Read the existing report delivery explanation and local outbox status.',
      href: '/delivery',
    };
  }
  return {
    key: 'check-in',
    label: 'Record the next check-in when ready',
    description: 'Your next check-in is available whenever you are ready. There is no penalty for gaps.',
    href: '/check-in',
  };
}

export function buildJourneySummary({
  checkIns,
  engagement,
  referenceTime,
}: {
  checkIns: CheckIn[];
  engagement: EngagementState;
  referenceTime: number;
}): JourneySummary {
  const { days, distinctDays } = calculateCheckInDays(checkIns);
  const routine = deriveRoutineProgress(checkIns, referenceTime);
  const milestones = evaluateMilestones(checkIns, engagement);
  const encouragement = distinctDays === 0
    ? 'Your first check-in starts your mission record. Nothing is prefilled and no readings are required to begin.'
    : routine.complete
      ? "Today's check-in is recorded. Thank you for taking the time to log an honest observation."
      : 'Your mission record is growing. The next check-in is available whenever you are ready.';
  return {
    days,
    distinctDays,
    routine,
    milestones,
    unlockedCount: milestones.filter((milestone) => milestone.unlocked).length,
    recent: getRecentParticipation(checkIns),
    encouragement,
    nextAction: chooseNextAction(routine, engagement),
  };
}
