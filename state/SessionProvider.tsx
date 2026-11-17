import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, spacing } from '@/constants/theme';

import { receiverUrl, submitReport } from '@/lib/receiver';
import type { EngagementEventKind } from '@/lib/engagement';
import type { SessionRepository } from '@/lib/sessionRepositoryContract';
import { sessionRepository, storageDescription } from '@/lib/sessionRepository';
import { initialSessionState, type SessionState } from '@/state/sessionReducer';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

type SessionContextValue = SessionState & {
  ready: boolean;
  storageDescription: string;
  latestCheckIn: CheckIn | null;
  findReportForCheckIn: (checkInId: string) => ReportRecord | undefined;
  saveCheckIn: (draft: CheckInDraft) => Promise<CheckIn>;
  confirmReport: (checkInId: string) => Promise<void>;
  setLinkAvailable: (available: boolean) => void;
  retryReport: (reportId: string) => void;
  recordEngagement: (kind: EngagementEventKind) => Promise<void>;
  setJourneyVisible: (visible: boolean) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children, repository = sessionRepository, storageLabel = storageDescription }: { children: ReactNode; repository?: SessionRepository; storageLabel?: string }) {
  const [state, setState] = useState<SessionState>(initialSessionState);
  const [loadedRepository, setLoadedRepository] = useState<SessionRepository | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Never expose the previous session's records while a new repository is loading.
  const viewState: SessionState = loadedRepository === repository ? state : initialSessionState;

  useEffect(() => {
    let active = true;
    setState(initialSessionState);
    setLoadedRepository(repository);
    setLoading(true);
    setLoadError(null);
    repository.load().then((saved) => {
      if (active) {
        setState((current) => ({ ...current, checkIns: saved.checkIns, reports: saved.reports, engagement: saved.engagement }));
        setReady(true);
      }
    }).catch(() => {
      if (active) setLoadError('Stored mission data could not be restored. Your existing data has not been changed.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadAttempt, repository]);

  const saveCheckIn = useCallback(async (draft: CheckInDraft) => {
    const checkIn = await repository.saveCheckIn(draft, new Date().toISOString());
    setState((current) => ({ ...current, checkIns: [...current.checkIns, checkIn] }));
    return checkIn;
  }, [repository]);

  const confirmReport = useCallback(async (checkInId: string) => {
    const report = await repository.confirmReport(checkInId, new Date().toISOString());
    setState((current) => current.reports.some((item) => item.id === report.id)
      ? current
      : { ...current, reports: [...current.reports, report] });
  }, [repository]);

  const setLinkAvailable = useCallback((available: boolean) => {
    setState((current) => ({ ...current, linkAvailable: available }));
  }, []);

  const recordEngagement = useCallback(async (kind: EngagementEventKind) => {
    if (!viewState.engagement.journeyVisible || viewState.engagement.events.some((event) => event.kind === kind)) return;
    const engagement = await repository.recordEngagement(kind, new Date().toISOString());
    setState((current) => ({ ...current, engagement }));
  }, [viewState.engagement, repository]);

  const setJourneyVisible = useCallback(async (visible: boolean) => {
    const engagement = await repository.setJourneyVisible(visible);
    setState((current) => ({ ...current, engagement }));
  }, [repository]);

  const sending = useRef(new Set<string>());
  const retryReport = useCallback(async (reportId: string) => {
    const report = viewState.reports.find((item) => item.id === reportId);
    if (!report || report.status === 'acknowledged' || sending.current.has(reportId)) return;

    const setReport = (updated: ReportRecord) => setState((current) => ({
      ...current,
      reports: current.reports.map((item) => item.id === reportId ? updated : item),
    }));
    if (!viewState.linkAvailable || !receiverUrl) {
      setReport({
        ...report,
        retryNote: viewState.linkAvailable ? 'Ground receiver URL is not configured.' : 'Simulated link is unavailable.',
      });
      return;
    }

    sending.current.add(reportId);
    setReport({ ...report, status: 'sending', retryNote: null });
    try {
      let receipt;
      try {
        receipt = await submitReport(report);
      } catch {
        setReport(await repository.updateDelivery(reportId, {
          status: 'failed', receipt: null, retryNote: 'Delivery could not be confirmed. Retry when the receiver is reachable.',
        }));
        return;
      }
      setReport(await repository.updateDelivery(reportId, {
        status: 'acknowledged', receipt, retryNote: null,
      }));
    } catch {
      setReport({ ...report, retryNote: 'Could not save the delivery result. Retry to recover the receiver receipt.' });
    } finally {
      sending.current.delete(reportId);
    }
  }, [viewState.linkAvailable, viewState.reports, repository]);

  const value = useMemo<SessionContextValue>(() => ({
    ...viewState,
    ready,
    storageDescription: storageLabel,
    latestCheckIn: viewState.checkIns.at(-1) ?? null,
    findReportForCheckIn: (checkInId) => viewState.reports.find((report) => report.checkInId === checkInId),
    saveCheckIn,
    confirmReport,
    setLinkAvailable,
    retryReport,
    recordEngagement,
    setJourneyVisible,
  }), [viewState, ready, saveCheckIn, confirmReport, setLinkAvailable, retryReport, recordEngagement, setJourneyVisible, storageLabel]);

  if (!ready) {
    return createElement(
      SafeAreaView,
      { style: recoveryStyles.root },
      createElement(View, { style: recoveryStyles.card },
        loadError
          ? createElement(Text, { style: recoveryStyles.title }, 'Storage unavailable')
          : createElement(ActivityIndicator, { size: 'large', color: colors.primary[400], accessibilityLabel: 'Restoring stored mission data' }),
        createElement(Text, { style: recoveryStyles.message, accessibilityRole: loadError ? 'alert' : undefined },
          loadError ?? 'Restoring your mission data…'),
        loadError
          ? createElement(PrimaryButton, {
              label: loading ? 'Retrying…' : 'Retry',
              disabled: loading,
              onPress: () => setLoadAttempt((attempt) => attempt + 1),
            })
          : null,
      ),
    );
  }
  return createElement(SessionContext.Provider, { value }, children);
}

const recoveryStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: colors.navy[900] },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.navy[600], backgroundColor: colors.navy[800] },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.offWhite },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.slate[300] },
});

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
