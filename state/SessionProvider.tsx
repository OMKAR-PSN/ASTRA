import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { sessionRepository, storageDescription } from '@/lib/sessionRepository';
import { initialSessionState, type SessionState } from '@/state/sessionReducer';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

type SessionContextValue = SessionState & {
  ready: boolean;
  storageDescription: string;
  latestCheckIn: CheckIn | null;
  findReportForCheckIn: (checkInId: string) => ReportRecord | undefined;
  saveCheckIn: (draft: CheckInDraft) => Promise<void>;
  confirmReport: (checkInId: string) => Promise<void>;
  setLinkAvailable: (available: boolean) => void;
  retryReport: (reportId: string) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(initialSessionState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    sessionRepository.load().then((saved) => {
      if (active) {
        setState((current) => ({ ...current, checkIns: saved.checkIns, reports: saved.reports }));
        setReady(true);
      }
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  const saveCheckIn = useCallback(async (draft: CheckInDraft) => {
    const checkIn = await sessionRepository.saveCheckIn(draft, new Date().toISOString());
    setState((current) => ({ ...current, checkIns: [...current.checkIns, checkIn] }));
  }, []);

  const confirmReport = useCallback(async (checkInId: string) => {
    const report = await sessionRepository.confirmReport(checkInId, new Date().toISOString());
    setState((current) => current.reports.some((item) => item.id === report.id)
      ? current
      : { ...current, reports: [...current.reports, report] });
  }, []);

  const setLinkAvailable = useCallback((available: boolean) => {
    setState((current) => ({ ...current, linkAvailable: available }));
  }, []);

  const retryReport = useCallback((reportId: string) => {
    setState((current) => ({
      ...current,
      reports: current.reports.map((report) => report.id === reportId && report.status === 'queued'
        ? { ...report, retryNote: current.linkAvailable
          ? 'Ground receiver unavailable. Report remains queued and was not delivered.'
          : 'Communications link unavailable. Report remains queued and was not delivered.' }
        : report),
    }));
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    ...state,
    ready,
    storageDescription,
    latestCheckIn: state.checkIns.at(-1) ?? null,
    findReportForCheckIn: (checkInId) => state.reports.find((report) => report.checkInId === checkInId),
    saveCheckIn,
    confirmReport,
    setLinkAvailable,
    retryReport,
  }), [state, ready, saveCheckIn, confirmReport, setLinkAvailable, retryReport]);

  if (!ready) return null;
  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
