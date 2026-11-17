import {
  DEFAULT_ENGAGEMENT,
  normalizeEngagement,
  type EngagementEventKind,
  type EngagementState,
} from '@/lib/engagement';
import { normalizeCheckInAdaptive } from '@/lib/adaptiveQuestions';
import { normalizeCheckInSymptoms } from '@/lib/symptoms';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

export type StoredSession = {
  checkIns: CheckIn[];
  reports: ReportRecord[];
  engagement: EngagementState;
};

export type DeliveryUpdate = Pick<ReportRecord, 'status' | 'receipt' | 'retryNote'>;

export interface SessionRepository {
  updateDelivery(reportId: string, update: DeliveryUpdate): Promise<ReportRecord>;
  load(): Promise<StoredSession>;
  saveCheckIn(draft: CheckInDraft, recordedAt: string): Promise<CheckIn>;
  confirmReport(checkInId: string, createdAt: string): Promise<ReportRecord>;
  recordEngagement(kind: EngagementEventKind, recordedAt: string): Promise<EngagementState>;
  setJourneyVisible(visible: boolean): Promise<EngagementState>;
}

export const emptySession = (): StoredSession => ({
  checkIns: [],
  reports: [],
  engagement: { ...DEFAULT_ENGAGEMENT, events: [] },
});

export function normalizeStoredSession(value: Partial<StoredSession> | null | undefined): StoredSession {
  return {
    checkIns: Array.isArray(value?.checkIns)
      ? value.checkIns.map(normalizeCheckInSymptoms).map(normalizeCheckInAdaptive)
      : [],
    reports: Array.isArray(value?.reports) ? value.reports : [],
    engagement: normalizeEngagement(value?.engagement),
  };
}
