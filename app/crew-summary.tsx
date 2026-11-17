import { ArrowLeft, CheckCircle2, Database, EyeOff, ShieldCheck, TriangleAlert, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, type as typography } from '@/constants/theme';
import { PRIVACY_DEMO_BANNER, buildCrewOperationalSummary, describePrivacySession } from '@/lib/privacy';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';

const EXCLUDED_FIELDS = [
  'Measurements (heart rate, blood pressure, temperature, sleep)',
  'Symptoms and body-map detail',
  'Activity notes and adaptive answers',
  'Baseline comparison and assessment results',
  'Report snapshots and their contents',
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export default function CrewStatusSummaryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const presentation = usePresentation();
  const { checkIns, reports } = useSession();
  const session = describePrivacySession({ active: presentation.active, activeCrewId: presentation.activeCrewId });
  const [now] = useState(() => new Date().toISOString());

  const summary = buildCrewOperationalSummary({
    session,
    checkIns: checkIns.map(({ id, recordedAt }) => ({ id, recordedAt })),
    reports: reports.map(({ id, status, receipt }) => ({ id, status, receipt })),
    now,
  });

  return (
    <ScreenContainer title="Crew Status Summary" subtitle="Limited workflow information for the demonstration.">
      <View style={styles.topRow}>
        <Pressable accessibilityRole="link" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <StatusPill label="RESTRICTED PROJECTION" tone="accent" Icon={EyeOff} />
      </View>

      <View style={styles.banner}>
        <ShieldCheck size={15} color={colors.accent[400]} strokeWidth={2.2} />
        <Text style={styles.bannerText}>{PRIVACY_DEMO_BANNER}</Text>
      </View>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        <View style={styles.mainColumn}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.crewRow}>
              <View style={styles.crewIcon}><Users size={19} color={colors.primary[300]} strokeWidth={2} /></View>
              <View style={styles.crewCopy}>
                <Text accessibilityRole="header" style={styles.crewName}>{summary.crew.displayName}</Text>
                <Text style={styles.crewMeta}>{summary.crew.id ?? 'No crew identifier'} · {summary.crew.verifiedOwner ? 'Verified owner' : 'Owner not verified'}</Text>
              </View>
              <View style={styles.generated}>
                <Text style={styles.generatedLabel}>GENERATED</Text>
                <Text style={styles.generatedValue}>{summary.generatedOnLabel}</Text>
              </View>
            </View>
            <Text style={styles.note}>{summary.crew.ownerLabel}. The summary reflects the current active session only.</Text>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Workflow status</Text>
              <Text style={styles.sectionMeta}>COUNTS AND TIMESTAMPS ONLY</Text>
            </View>
            {summary.checkIns.count === 0 ? (
              <View style={styles.empty} accessibilityRole="text">
                <Database size={18} color={colors.slate[400]} strokeWidth={2} />
                <View style={styles.emptyCopy}>
                  <Text style={styles.emptyTitle}>No check-ins recorded in this session</Text>
                  <Text style={styles.emptyBody}>A crew summary can only report that a check-in exists, when it was last recorded, and how many there are.</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.statGrid}>
              <Stat label="CHECK-INS RECORDED" value={String(summary.checkIns.count)} />
              <Stat label="LAST RECORDED" value={summary.checkIns.lastRecordedAtText ?? 'No record yet'} hint={summary.checkIns.recordedOnGeneratedDate === null ? undefined : summary.checkIns.recordedOnGeneratedDate ? 'Recorded today (UTC)' : 'Recorded on an earlier day'} />
              <Stat label="REPORTS TOTAL" value={String(summary.reports.total)} />
              <Stat label="DELIVERY STATE" value={summary.reports.statusText} />
              <Stat label="LAST ACKNOWLEDGED" value={summary.reports.lastAcknowledgedAtText ?? 'No acknowledgement'} />
            </View>
            <View style={styles.statusRow}>
              {summary.reports.acknowledged > 0 ? <CheckCircle2 size={14} color={colors.success[400]} strokeWidth={2.2} /> : <TriangleAlert size={14} color={colors.accent[400]} strokeWidth={2.2} />}
              <Text style={styles.statusText}>
                {summary.reports.total === 0
                  ? 'No reports have been created from this session.'
                  : `${summary.reports.queued} queued · ${summary.reports.sending} sending · ${summary.reports.failed} failed · ${summary.reports.acknowledged} acknowledged`}
              </Text>
            </View>
          </Surface>
        </View>

        <View style={[styles.sideColumn, desktop && styles.sideColumnDesktop]}>
          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Not included</Text>
              <EyeOff size={15} color={colors.accent[400]} strokeWidth={2} />
            </View>
            <Text style={styles.body}>This projection reads only identifiers, timestamps, and delivery states. The following are never passed to this screen:</Text>
            <View style={styles.excludedList}>
              {EXCLUDED_FIELDS.map((field) => (
                <View key={field} style={styles.excludedRow}>
                  <View style={styles.excludedDot} />
                  <Text style={styles.excludedText}>{field}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>The summary has no readiness score, percentage, compliance mark, or health classification. None is calculated.</Text>
          </Surface>

          <Surface tone="panel" style={styles.section}>
            <View style={styles.sectionHead}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Session scope</Text>
              <Text style={styles.sectionMeta}>{summary.session.storageScope === 'persistent' ? 'LOCAL STORE' : 'SESSION-ONLY'}</Text>
            </View>
            <View style={styles.statusLine}><Text style={styles.statusLabel}>Source</Text><Text style={styles.statusValue}>{summary.session.label}</Text></View>
            <View style={styles.statusLine}><Text style={styles.statusLabel}>Synthetic</Text><Text style={styles.statusValue}>{summary.session.synthetic ? 'Yes · fictional demonstration' : 'No'}</Text></View>
            <View style={styles.statusLine}><Text style={styles.statusLabel}>Survives refresh</Text><Text style={styles.statusValue}>{summary.session.survivesRefresh ? 'Yes, local records' : 'No, demo records'}</Text></View>
            <PrimaryButton label="Return to Personal Health" variant="secondary" onPress={() => router.navigate('/personal')} style={styles.fullWidth} />
          </Surface>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 2 },
  backLabel: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, paddingHorizontal: 13,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(242, 192, 120, 0.32)', backgroundColor: 'rgba(242, 192, 120, 0.08)',
  },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.accent[400] },
  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.sectionGap },
  mainColumn: { gap: 18, flex: 1.35, minWidth: 0 },
  sideColumn: { gap: 18, flex: 1, minWidth: 0 },
  sideColumnDesktop: { flex: 0.85 },
  section: { gap: 14, padding: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 13, flexWrap: 'wrap' },
  crewIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.34)', backgroundColor: 'rgba(0, 214, 198, 0.10)',
  },
  crewCopy: { gap: 2, flex: 1, minWidth: 0 },
  crewName: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  crewMeta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, letterSpacing: 0.4, color: colors.slate[400] },
  generated: { alignItems: 'flex-end', gap: 2 },
  generatedLabel: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 11, letterSpacing: 0.8, color: colors.slate[500] },
  generatedValue: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[300] },
  note: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[500] },
  empty: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(4, 16, 28, 0.46)',
  },
  emptyCopy: { flex: 1, gap: 3, minWidth: 0 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.offWhite },
  emptyBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[400] },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1, flexBasis: 140, gap: 3, padding: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(4, 16, 28, 0.46)',
  },
  statLabel: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[500] },
  statValue: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.offWhite },
  statHint: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 11, borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  statusText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[300] },
  body: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.slate[300] },
  excludedList: { gap: 8 },
  excludedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  excludedDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6, backgroundColor: colors.accent[400] },
  excludedText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.slate[300] },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 3 },
  statusLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[400] },
  statusValue: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.offWhite, textAlign: 'right', flexShrink: 1 },
  fullWidth: { width: '100%' },
});
