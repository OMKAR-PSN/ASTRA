import { demoCrewIdentity } from '@/fixtures/demoCrew';
import { formatTimestamp } from '@/lib/format';
import type { CheckIn, DeliveryStatus, ReportRecord } from '@/types/astra';

export const PRIVACY_DEMO_BANNER = 'Demonstration View — Not an Authenticated Access-Control System';
export const PRIVACY_SHIELD_TITLE = 'Privacy Shield Active';
export const PRIVACY_SHIELD_BODY = 'Personal health details are hidden from view.';
export const PRIVACY_SHIELD_LIMIT = 'This screen is a visual privacy mode. It is not a lock, sign-in, encryption, or access-control system.';

export type PrivacySessionKind = 'local' | 'demo' | 'presentation';

export type PrivacySession = {
  kind: PrivacySessionKind;
  label: string;
  crewId: string | null;
  crewName: string | null;
  crewRole: string | null;
  ownerLabel: string;
  verifiedOwner: boolean;
  synthetic: boolean;
  storageScope: 'persistent' | 'session-only';
  survivesRefresh: boolean;
};

export type PersonalHealthLink = {
  key: 'overview' | 'trends' | 'assessment' | 'replay' | 'reports';
  label: string;
  description: string;
  href: '/' | '/dashboard' | '/assessment' | '/replay' | '/delivery';
};

export const PERSONAL_HEALTH_LINKS: readonly PersonalHealthLink[] = [
  { key: 'overview', label: 'Mission overview', description: 'Current mission context and latest summary.', href: '/' },
  { key: 'trends', label: 'Health trends', description: 'Recorded observations and the fictional baseline.', href: '/dashboard' },
  { key: 'assessment', label: 'Assessment', description: 'The demonstration comparison and plain-language explanation.', href: '/assessment' },
  { key: 'replay', label: 'Mission health replay', description: 'Read-only history of the active session.', href: '/replay' },
  { key: 'reports', label: 'Reports & sync', description: 'Personal report preview and the local outbox.', href: '/delivery' },
];

export type PersonalHealthView = {
  session: PrivacySession;
  storageDescription: string;
  recordCount: number;
  reportCount: number;
  latestCheckInId: string | null;
  lastRecordedAtUTC: string | null;
  lastRecordedAtText: string | null;
  hasRecords: boolean;
  links: readonly PersonalHealthLink[];
};

export type OperationalCheckIn = Pick<CheckIn, 'id' | 'recordedAt'>;
export type OperationalReport = Pick<ReportRecord, 'id' | 'status' | 'receipt'>;

export type CrewOperationalSummary = {
  generatedAtUTC: string;
  generatedOnLabel: string;
  crew: {
    id: string | null;
    displayName: string;
    ownerLabel: string;
    verifiedOwner: boolean;
  };
  session: {
    kind: PrivacySessionKind;
    label: string;
    storageScope: 'persistent' | 'session-only';
    survivesRefresh: boolean;
    synthetic: boolean;
  };
  checkIns: {
    count: number;
    lastRecordedAtUTC: string | null;
    lastRecordedAtText: string | null;
    recordedOnGeneratedDate: boolean | null;
  };
  reports: {
    total: number;
    queued: number;
    sending: number;
    failed: number;
    acknowledged: number;
    statusText: string;
    lastAcknowledgedAtUTC: string | null;
    lastAcknowledgedAtText: string | null;
  };
};

const validIso = (value: string | null | undefined): string | null =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

export function describePrivacySession(input: { active: boolean; activeCrewId: string | null }): PrivacySession {
  if (!input.active || !input.activeCrewId) {
    return {
      kind: 'local',
      label: 'Local device session',
      crewId: null,
      crewName: null,
      crewRole: null,
      ownerLabel: 'No verified crew owner stored on local records',
      verifiedOwner: false,
      synthetic: true,
      storageScope: 'persistent',
      survivesRefresh: true,
    };
  }
  const presentation = input.activeCrewId === 'PRESENTATION';
  return {
    kind: presentation ? 'presentation' : 'demo',
    label: presentation ? 'Presentation demo session' : 'Fictional crew demo session',
    crewId: input.activeCrewId,
    crewName: demoCrewIdentity.name,
    crewRole: demoCrewIdentity.role,
    ownerLabel: 'Fictional demo identifier · not authentication',
    verifiedOwner: false,
    synthetic: true,
    storageScope: 'session-only',
    survivesRefresh: false,
  };
}

export function buildPersonalHealthView(input: {
  session: PrivacySession;
  checkIns: readonly OperationalCheckIn[];
  reports: readonly Pick<ReportRecord, 'id'>[];
  storageDescription: string;
}): PersonalHealthView {
  const latest = input.checkIns
    .map((checkIn) => validIso(checkIn.recordedAt))
    .filter((value): value is string => value !== null)
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? null;
  const latestId = input.checkIns
    .filter((checkIn) => validIso(checkIn.recordedAt) === latest)
    .at(-1)?.id ?? null;
  return {
    session: { ...input.session },
    storageDescription: input.storageDescription,
    recordCount: input.checkIns.length,
    reportCount: input.reports.length,
    latestCheckInId: latestId,
    lastRecordedAtUTC: latest,
    lastRecordedAtText: latest ? formatTimestamp(latest) : null,
    hasRecords: input.checkIns.length > 0,
    links: PERSONAL_HEALTH_LINKS,
  };
}

const REPORT_STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: 'queued',
  sending: 'sending',
  failed: 'failed',
  acknowledged: 'acknowledged',
};

/** Restricted projection. Reads only ids, timestamps, delivery status and receipt timestamps. */
export function buildCrewOperationalSummary(input: {
  session: PrivacySession;
  checkIns: readonly OperationalCheckIn[];
  reports: readonly OperationalReport[];
  now: string;
}): CrewOperationalSummary {
  const generatedAtUTC = validIso(input.now) ?? new Date(0).toISOString();
  const generatedDay = generatedAtUTC.slice(0, 10);
  const timestamps = input.checkIns
    .map((checkIn) => validIso(checkIn.recordedAt))
    .filter((value): value is string => value !== null)
    .sort((left, right) => left.localeCompare(right));
  const latest = timestamps.at(-1) ?? null;

  const counts: Record<DeliveryStatus, number> = { queued: 0, sending: 0, failed: 0, acknowledged: 0 };
  let lastAcknowledged: string | null = null;
  input.reports.forEach((report) => {
    counts[report.status] += 1;
    if (report.status === 'acknowledged') {
      const received = validIso(report.receipt?.receivedAt);
      if (received && (!lastAcknowledged || received > lastAcknowledged)) lastAcknowledged = received;
    }
  });
  const statusText = input.reports.length === 0
    ? 'No reports queued'
    : (Object.keys(counts) as DeliveryStatus[])
        .filter((status) => counts[status] > 0)
        .map((status) => `${counts[status]} ${REPORT_STATUS_LABELS[status]}`)
        .join(' · ');

  return {
    generatedAtUTC,
    generatedOnLabel: formatTimestamp(generatedAtUTC),
    crew: {
      id: input.session.crewId,
      displayName: input.session.crewName ?? 'Unassigned local records',
      ownerLabel: input.session.ownerLabel,
      verifiedOwner: input.session.verifiedOwner,
    },
    session: {
      kind: input.session.kind,
      label: input.session.label,
      storageScope: input.session.storageScope,
      survivesRefresh: input.session.survivesRefresh,
      synthetic: input.session.synthetic,
    },
    checkIns: {
      count: input.checkIns.length,
      lastRecordedAtUTC: latest,
      lastRecordedAtText: latest ? formatTimestamp(latest) : null,
      recordedOnGeneratedDate: latest ? latest.slice(0, 10) === generatedDay : null,
    },
    reports: {
      total: input.reports.length,
      queued: counts.queued,
      sending: counts.sending,
      failed: counts.failed,
      acknowledged: counts.acknowledged,
      statusText,
      lastAcknowledgedAtUTC: lastAcknowledged,
      lastAcknowledgedAtText: lastAcknowledged ? formatTimestamp(lastAcknowledged) : null,
    },
  };
}
