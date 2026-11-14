import { createContext, createElement, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { initialSessionState, sessionReducer, type SessionState } from '@/state/sessionReducer';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

type SessionContextValue = SessionState & {
  latestCheckIn: CheckIn | null;
  findReportForCheckIn: (checkInId: string) => ReportRecord | undefined;
  saveCheckIn: (draft: CheckInDraft) => void;
  confirmReport: (checkInId: string) => void;
  setLinkAvailable: (available: boolean) => void;
  retryReport: (reportId: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);

  const saveCheckIn = useCallback(
    (draft: CheckInDraft) => dispatch({ type: 'saveCheckIn', draft, recordedAt: new Date().toISOString() }),
    [],
  );
  const confirmReport = useCallback(
    (checkInId: string) => dispatch({ type: 'confirmReport', checkInId, createdAt: new Date().toISOString() }),
    [],
  );
  const setLinkAvailable = useCallback(
    (available: boolean) => dispatch({ type: 'setLinkAvailable', available }),
    [],
  );
  const retryReport = useCallback((reportId: string) => dispatch({ type: 'retryReport', reportId }), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      latestCheckIn: state.checkIns.length > 0 ? state.checkIns[state.checkIns.length - 1] : null,
      findReportForCheckIn: (checkInId: string) =>
        state.reports.find((report) => report.checkInId === checkInId),
      saveCheckIn,
      confirmReport,
      setLinkAvailable,
      retryReport,
    }),
    [state, saveCheckIn, confirmReport, setLinkAvailable, retryReport],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}
