import { syntheticBaseline } from '@/fixtures/crew';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { initialSessionState, sessionReducer } from '@/state/sessionReducer';

/** Reproducible, separate presentation sandbox. Never reads or writes device storage. */
export function createPresentationRepository(): SessionRepository {
  let state = { ...initialSessionState };
  const rates = [72, 71, 73, 72, 92, 74, 73, 72];
  rates.forEach((heartRateBpm, index) => {
    state = sessionReducer(state, {
      type: 'saveCheckIn', recordedAt: `2026-11-${String(8 + index).padStart(2, '0')}T08:00:00.000Z`,
      draft: { readings: { ...syntheticBaseline, heartRateBpm, mood: 4, stress: 2 }, symptoms: [], activityNote: 'Presentation fixture v1. Fictional manual observation; no sensor source.' },
    });
  });
  state = sessionReducer(state, { type: 'confirmReport', checkInId: state.checkIns.at(-1)!.id, createdAt: '2026-11-15T08:05:00.000Z' });
  const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  return {
    async load() { return copy({ checkIns: state.checkIns, reports: state.reports, engagement: state.engagement }); },
    async saveCheckIn(draft, recordedAt) {
      state = sessionReducer(state, { type: 'saveCheckIn', draft: copy(draft), recordedAt });
      return copy(state.checkIns.at(-1)!);
    },
    async confirmReport(checkInId, createdAt) {
      if (!state.checkIns.some((item) => item.id === checkInId)) throw new Error('Check-in not found');
      state = sessionReducer(state, { type: 'confirmReport', checkInId, createdAt });
      return copy(state.reports.find((item) => item.checkInId === checkInId)!);
    },
    async updateDelivery(reportId, update) {
      const report = state.reports.find((item) => item.id === reportId);
      if (!report) throw new Error('Report not found');
      const updated = report.status === 'acknowledged' ? report : { ...report, ...copy(update) };
      state = { ...state, reports: state.reports.map((item) => item.id === reportId ? updated : item) };
      return copy(updated);
    },
    async recordEngagement(kind, recordedAt) {
      state = sessionReducer(state, { type: 'recordEngagement', kind, recordedAt });
      return copy(state.engagement);
    },
    async setJourneyVisible(visible) {
      state = sessionReducer(state, { type: 'setJourneyVisible', visible });
      return copy(state.engagement);
    },
  };
}
