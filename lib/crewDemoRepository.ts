import { buildDemoCheckIns } from '@/fixtures/demoCrew';
import type { EngagementEventKind } from '@/lib/engagement';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { initialSessionState, sessionReducer } from '@/state/sessionReducer';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Session-only repository for a fictional crew. It never reads or writes IndexedDB/SQLite,
 * and every activation rebuilds the same deterministic fixture.
 */
export function createCrewDemoRepository(seed: CheckIn[] = buildDemoCheckIns()): SessionRepository {
  let state = { ...initialSessionState, checkIns: copy(seed), reports: [] as ReportRecord[] };

  return {
    async load() {
      return copy({ checkIns: state.checkIns, reports: state.reports, engagement: state.engagement });
    },

    async saveCheckIn(draft: CheckInDraft, recordedAt: string) {
      state = sessionReducer(state, { type: 'saveCheckIn', draft: copy(draft), recordedAt });
      return copy(state.checkIns.at(-1)!);
    },

    async confirmReport(checkInId: string, createdAt: string) {
      if (!state.checkIns.some((item) => item.id === checkInId)) {
        throw new Error('Check-in was not found in the demo session.');
      }
      state = sessionReducer(state, { type: 'confirmReport', checkInId, createdAt });
      return copy(state.reports.find((item) => item.checkInId === checkInId)!);
    },

    async updateDelivery(reportId: string, update: Pick<ReportRecord, 'status' | 'receipt' | 'retryNote'>) {
      const report = state.reports.find((item) => item.id === reportId);
      if (!report) throw new Error('Report was not found in the demo session.');
      const updated = report.status === 'acknowledged' ? report : { ...report, ...copy(update) };
      state = { ...state, reports: state.reports.map((item) => item.id === reportId ? updated : item) };
      return copy(updated);
    },

    async recordEngagement(kind: EngagementEventKind, recordedAt: string) {
      state = sessionReducer(state, { type: 'recordEngagement', kind, recordedAt });
      return copy(state.engagement);
    },

    async setJourneyVisible(visible: boolean) {
      state = sessionReducer(state, { type: 'setJourneyVisible', visible });
      return copy(state.engagement);
    },
  };
}
