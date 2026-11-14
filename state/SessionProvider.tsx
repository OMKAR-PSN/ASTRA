import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, spacing } from '@/constants/theme';

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    sessionRepository.load().then((saved) => {
      if (active) {
        setState((current) => ({ ...current, checkIns: saved.checkIns, reports: saved.reports }));
        setReady(true);
      }
    }).catch(() => {
      if (active) setLoadError('Stored mission data could not be restored. Your existing data has not been changed.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadAttempt]);

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
