import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

export type StoredSession = {
  checkIns: CheckIn[];
  reports: ReportRecord[];
};

export type DeliveryUpdate = Pick<ReportRecord, 'status' | 'receipt' | 'retryNote'>;

export interface SessionRepository {
  updateDelivery(reportId: string, update: DeliveryUpdate): Promise<ReportRecord>;
  load(): Promise<StoredSession>;
  saveCheckIn(draft: CheckInDraft, recordedAt: string): Promise<CheckIn>;
  confirmReport(checkInId: string, createdAt: string): Promise<ReportRecord>;
}

export const emptySession = (): StoredSession => ({ checkIns: [], reports: [] });
