import { createReportSnapshot } from '@/lib/snapshot';
import { DEFAULT_ENGAGEMENT, addEngagementEvent, setJourneyVisibility, type EngagementEventKind, type EngagementState } from '@/lib/engagement';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

export const RECEIVER_UNAVAILABLE_NOTE = 'Ground receiver unavailable in this prototype.';
export const LINK_UNAVAILABLE_NOTE = 'Communications link unavailable. The report stays queued.';

export type SessionState = {
  checkIns: CheckIn[];
  reports: ReportRecord[];
  engagement: EngagementState;
  linkAvailable: boolean;
};

export type SessionAction =
  | { type: 'saveCheckIn'; draft: CheckInDraft; recordedAt: string }
  | { type: 'confirmReport'; checkInId: string; createdAt: string }
  | { type: 'setLinkAvailable'; available: boolean }
  | { type: 'recordEngagement'; kind: EngagementEventKind; recordedAt: string }
  | { type: 'setJourneyVisible'; visible: boolean }
  | { type: 'retryReport'; reportId: string };

export const initialSessionState: SessionState = {
  checkIns: [],
  reports: [],
  engagement: { ...DEFAULT_ENGAGEMENT, events: [] },
  linkAvailable: false,
};

export const formatCheckInId = (sequence: number) => `CHK-${String(sequence).padStart(3, '0')}`;
export const formatReportId = (sequence: number) => `ASTRA-${String(sequence).padStart(4, '0')}`;

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'saveCheckIn': {
      const checkIn: CheckIn = {
        id: formatCheckInId(state.checkIns.length + 1),
        recordedAt: action.recordedAt,
        readings: action.draft.readings,
        symptoms: action.draft.symptoms,
        activityNote: action.draft.activityNote,
      };
      return { ...state, checkIns: [...state.checkIns, checkIn] };
    }

    case 'confirmReport': {
      if (state.reports.some((report) => report.checkInId === action.checkInId)) return state;
      const checkIn = state.checkIns.find((item) => item.id === action.checkInId);
      if (!checkIn) return state;
      const report: ReportRecord = {
        id: formatReportId(state.reports.length + 1),
        checkInId: checkIn.id,
        createdAt: action.createdAt,
        status: 'queued',
        snapshot: createReportSnapshot(checkIn),
        receipt: null,
        retryNote: null,
      };
      return { ...state, reports: [...state.reports, report] };
    }

    case 'setLinkAvailable':
      return { ...state, linkAvailable: action.available };

    case 'recordEngagement':
      return { ...state, engagement: addEngagementEvent(state.engagement, action.kind, action.recordedAt) };

    case 'setJourneyVisible':
      return { ...state, engagement: setJourneyVisibility(state.engagement, action.visible) };

    case 'retryReport': {
      const retryNote = state.linkAvailable ? RECEIVER_UNAVAILABLE_NOTE : LINK_UNAVAILABLE_NOTE;
      return {
        ...state,
        reports: state.reports.map((report) =>
          report.id === action.reportId && report.status === 'queued' ? { ...report, retryNote } : report,
        ),
      };
    }
  }
}
