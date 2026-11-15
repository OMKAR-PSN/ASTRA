import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Activity, ArrowUpRight, ChartNoAxesCombined, ChevronRight, ClipboardList, Database, HeartPulse, Info, Moon, Orbit, Plus, Radio, ShieldCheck, Smile, Thermometer, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ComparisonTable } from '@/components/ComparisonTable';
import { EmptyState } from '@/components/EmptyState';
import { ObservationCard } from '@/components/ObservationCard';
import { PanelGlow } from '@/components/Atmosphere';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { TrendBars } from '@/components/TrendBars';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import { buildReadingTiles, type ReadingStatus } from '@/lib/readingTiles';
import { checkInStreak } from '@/lib/checkInStreak';
import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

const PLANNED_DEMO_MISSION_DAYS = 240;

type Observation = {
  label: string;
  value: string;
  unit: string;
  status: ReadingStatus;
  baseline?: string;
  delta?: string;
  deltaTone?: 'neutral' | 'success' | 'accent';
  context?: string;
  Icon: LucideIcon;
};

export default function MissionHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const fourStats = width >= 1360;
  const { latestCheckIn, checkIns, reports, linkAvailable } = useSession();
  const streak = checkInStreak(checkIns);
  const pendingCount = reports.filter((report) => report.status !== 'acknowledged').length;
  const acknowledgedCount = reports.filter((report) => report.status === 'acknowledged').length;
  const assessment = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);
  const tiles = latestCheckIn && assessment ? buildReadingTiles(latestCheckIn.readings, assessment.comparisons) : [];
  const review = tiles.some((tile) => tile.status === 'difference');
  const compared = assessment?.comparisons.some((item) => item.percentChange !== null);
  const progress = crewProfile.missionDay / PLANNED_DEMO_MISSION_DAYS * 100;
  const firstName = crewProfile.name.split(' ')[0];

  const reviewEvent = checkIns.flatMap((checkIn) => {
    const snapshot = createReportSnapshot(checkIn);
    const deviation = snapshot.comparisons.find((item) => item.percentChange !== null && Math.abs(item.percentChange) >= DIFFERENCE_THRESHOLD_PERCENT);
    return deviation ? [{ snapshot, deviation }] : [];
  }).at(-1) ?? null;

  const metric = (index: number) => tiles[index] ?? { value: 'Not recorded', unit: '', status: 'missing' as ReadingStatus };
  const systolic = metric(1);
  const diastolic = metric(2);
  const bpMissing = systolic.status === 'missing' && diastolic.status === 'missing';
  const bpStatus: ReadingStatus = bpMissing ? 'missing' : [systolic, diastolic].some((item) => item.status === 'difference') ? 'difference' : [systolic, diastolic].some((item) => item.status === 'missing') ? 'recorded' : 'baseline';
  const delta = (label: string, unit: string, decimals: number) => {
    const change = assessment?.comparisons.find((item) => item.label === label)?.change;
    return change === null || change === undefined ? undefined : `${formatSigned(change, decimals)} ${unit} vs baseline`;
  };
  const deltaTone = (status: ReadingStatus): Observation['deltaTone'] => status === 'difference' ? 'accent' : status === 'baseline' ? 'success' : 'neutral';

  const observations: Observation[] = [
    {
      ...metric(0), label: 'Heart rate', baseline: `${syntheticBaseline.heartRateBpm} bpm`,
      delta: delta('Heart rate', 'bpm', 0), deltaTone: deltaTone(metric(0).status),
      context: 'Manual pulse entry', Icon: HeartPulse,
    },
    {
      label: 'Blood pressure',
      value: bpMissing ? 'Not recorded' : `${systolic.status === 'missing' ? '—' : systolic.value}/${diastolic.status === 'missing' ? '—' : diastolic.value}`,
      unit: 'mmHg', status: bpStatus, baseline: `${syntheticBaseline.systolicMmHg}/${syntheticBaseline.diastolicMmHg} mmHg`,
      context: 'Manual cuff entry', Icon: Activity,
    },
    {
      ...metric(3), label: 'Body temperature', baseline: `${syntheticBaseline.temperatureC} °C`,
      delta: delta('Body temperature', '°C', 1), deltaTone: deltaTone(metric(3).status),
      context: 'Manual thermometer entry', Icon: Thermometer,
    },
    {
      ...metric(4), label: 'Sleep duration', baseline: `${syntheticBaseline.sleepHours} h`,
      delta: delta('Sleep', 'h', 1), deltaTone: deltaTone(metric(4).status),
      context: 'Self-reported rest', Icon: Moon,
    },
    {
      ...metric(5), label: 'Mood', unit: 'of 5', context: 'Self-check evaluation', Icon: Smile,
    },
    {
      ...metric(6), label: 'Perceived stress', unit: 'of 5', context: 'Daily self-assessment', Icon: Zap,
    },
  ];

  const stats = [
    { label: 'Mission phase', value: 'Meridian Transit', detail: 'SIMULATED TRANSIT', accent: colors.primary[400] },
    { label: 'Flight day', value: `Day ${crewProfile.missionDay}`, detail: `OF ${PLANNED_DEMO_MISSION_DAYS} PLANNED`, accent: colors.success[400] },
    { label: 'Check-in routine', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, detail: `${checkIns.length} SAVED · UTC STREAK`, accent: colors.secondary[400] },
    { label: 'Crew member', value: crewProfile.name, detail: 'SYSTEMS TEAM', accent: colors.slate[400] },
  ];
  const assessmentPill = !assessment || !compared
    ? { label: 'Insufficient data', tone: 'neutral' as const }
    : review ? { label: 'Review suggested · Demo', tone: 'accent' as const } : { label: 'Within demo range', tone: 'success' as const };
  const assessmentTitle = !assessment || !compared
    ? 'Awaiting comparison data'
    : review ? 'Deviation from synthetic baseline' : 'Within synthetic baseline range';

  return (
    <ScreenContainer title="Mission overview" hideHeading>
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow} numberOfLines={2}>CREW HEALTH OBSERVATION LOG · {crewProfile.missionName.toUpperCase()}</Text>
          </View>
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Good morning, {firstName}.</Text>
          <Text style={styles.heroSubtitle}>Your mission health overview.</Text>
        </View>
        {desktop ? <View style={styles.heroActions}>
          <View style={styles.linkChip}>
            <Radio size={13} color={linkAvailable ? colors.success[400] : colors.accent[400]} strokeWidth={2} />
            <Text style={styles.linkChipLabel}>Simulated link · {linkAvailable ? 'Available' : 'Unavailable'}</Text>
          </View>
          <PrimaryButton label="Start health check-in" Icon={Plus} onPress={() => router.navigate('/check-in')} />
        </View> : null}
      </View>

      <View style={styles.bannerSection}>
        <Surface variant="glass" tone="panel" style={[styles.banner, desktop && styles.bannerDesktop]}>
          <PanelGlow />
          {Platform.OS === 'web' ? <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 1000 320" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Path d="M 610 320 C 700 60, 900 20, 1040 200" stroke="rgba(80, 222, 216, 0.16)" strokeWidth={1.5} strokeDasharray="6 9" fill="none" />
            <Path d="M 560 340 C 690 120, 940 80, 1080 260" stroke="rgba(141, 187, 255, 0.10)" strokeWidth={1} strokeDasharray="4 10" fill="none" />
            <Circle cx={905} cy={102} r={3} fill="rgba(80, 222, 216, 0.45)" />
          </Svg> : null}

          <View style={[styles.bannerGrid, desktop && styles.bannerGridDesktop]}>
            <View style={styles.arcBlock}>
              <View style={styles.arcHeader}>
                <View style={styles.inline}><Orbit size={16} color={colors.primary[400]} strokeWidth={2.2} /><Text style={styles.arcLabel}>MISSION PROGRESS</Text></View>
                <View style={styles.percentPill}><View style={styles.percentDot} /><Text style={styles.percentText}>{progress.toFixed(1)}% COMPLETE</Text></View>
              </View>

              <View style={styles.trajectoryLabels}>
                <View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: colors.slate[400] }]} /><Text style={styles.trajectoryLabel}>LAUNCH · DAY 1</Text></View>
                <View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: colors.primary[400] }]} /><Text style={[styles.trajectoryLabel, { color: colors.primary[300] }]}>MERIDIAN</Text></View>
                <View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: colors.secondary[400] }]} /><Text style={[styles.trajectoryLabel, { color: colors.secondary[400] }]}>DAY {PLANNED_DEMO_MISSION_DAYS}</Text></View>
              </View>

              <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Simulated mission progress" accessibilityValue={{ min: 0, max: PLANNED_DEMO_MISSION_DAYS, now: crewProfile.missionDay }}>
                <LinearGradient colors={[colors.primary[300], colors.primary[400], colors.secondary[400]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.trackFill, { width: `${progress}%` }]} />
                <View style={[styles.craftMarker, { left: `${Math.min(99, Math.max(1, progress))}%` }]}>
                  <View style={styles.craftRing}><View style={styles.craftDot} /></View>
                </View>
              </View>

              <View style={styles.trajectoryFooter}>
                <Text style={styles.arcMeta}>Flight Day {crewProfile.missionDay} of {PLANNED_DEMO_MISSION_DAYS} · Planned demo timeline</Text>
                <Text style={styles.arcAccent}>{progress.toFixed(1)}%</Text>
              </View>
            </View>

            <View style={[styles.statGrid, desktop && styles.statGridDesktop]}>
              {stats.map((stat) => (
                <View key={stat.label} style={[styles.statBlock, !fourStats && styles.statBlockCompact]}>
                  <View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: stat.accent }]} /><Text style={styles.statLabel}>{stat.label}</Text></View>
                  <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                  <Text style={[styles.statDetail, { color: stat.accent }]} numberOfLines={1}>{stat.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        </Surface>

        {!desktop ? <PrimaryButton label="Start health check-in" Icon={Plus} onPress={() => router.navigate('/check-in')} /> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.inline}>
            <Activity size={18} color={colors.primary[400]} strokeWidth={2.2} />
            <Text accessibilityRole="header" style={[styles.sectionTitle, !desktop && styles.sectionTitleMobile]}>Physiological Baseline Telemetry</Text>
          </View>
          <View style={styles.inline}><Text style={styles.sectionMeta}>Logged observations</Text><View style={styles.statusDot} /></View>
        </View>
        {!latestCheckIn ? <Surface><EmptyState title="No check-in saved yet" body="Start a check-in to record observations. No measurements or historical events have been prefilled." /></Surface> : null}
        <View style={styles.observationGrid}>
          {observations.map((item) => <View key={item.label} style={[styles.observation, width < 540 && styles.observationFull, desktop && styles.observationDesktop]}><ObservationCard {...item} measuredAt={latestCheckIn?.recordedAt} /></View>)}
        </View>
      </View>

      <View style={[styles.analysis, desktop && styles.analysisDesktop]}>
        <Surface style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <View style={styles.inline}><ChartNoAxesCombined size={17} color={colors.primary[400]} strokeWidth={2.2} /><Text accessibilityRole="header" style={styles.cardTitle}>Physiological Trend Trajectory</Text></View>
              <Text style={styles.cardMeta}>Recorded observations vs. your synthetic baseline. No live sensor feed.</Text>
            </View>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.link}>
              <Text style={styles.cyan}>View trends</Text><ArrowUpRight size={15} color={colors.primary[400]} />
            </Pressable>
          </View>
          <TrendBars title="Heart rate" unit="bpm" decimals={0} baseline={syntheticBaseline.heartRateBpm} checkIns={checkIns} read={(item) => item.readings.heartRateBpm} />
        </Surface>

        <Surface style={[styles.panel, desktop && styles.assessmentDesktop]}>
          <View style={styles.panelHeader}>
            <View style={styles.inline}><ShieldCheck size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.panelLabel}>ALGORITHMIC ASSESSMENT</Text></View>
            <StatusPill label={assessmentPill.label} tone={assessmentPill.tone} />
          </View>
          <Text style={styles.panelTitle}>{assessmentTitle}</Text>
          <Text style={styles.panelBody}>{assessment?.explanation.possibleInterpretation ?? 'Save a check-in to see its comparison with the synthetic baseline.'}</Text>
          {reviewEvent ? <View style={styles.eventRow}>
            <View style={[styles.nodeDot, { backgroundColor: colors.accent[400], marginTop: 6 }]} />
            <View style={styles.eventText}>
              <Text style={styles.eventLabel}>MOST RECENT REVIEW EVENT</Text>
              <Text style={styles.eventValue} numberOfLines={2}>
                {reviewEvent.deviation.label} · {reviewEvent.deviation.current?.toFixed(reviewEvent.deviation.decimals)} {reviewEvent.deviation.unit} · {formatTimestamp(reviewEvent.snapshot.checkIn.recordedAt).split(',')[0]}
              </Text>
            </View>
          </View> : null}
          <View style={styles.notice}>
            <View style={styles.inline}><Info size={13} color={colors.slate[400]} strokeWidth={2} /><Text style={styles.noticeLabel}>EDUCATIONAL DEMO EVALUATION</Text></View>
            <Text style={styles.noticeBody}>Educational synthetic prototype. Does not diagnose medical conditions. All baselines are generated locally for mission simulations.</Text>
          </View>
          <View style={styles.panelFooter}>
            <PrimaryButton label="Open full assessment" variant="secondary" Icon={ChevronRight} onPress={() => router.navigate('/assessment')} />
            <Text style={styles.ruleText}>{DIFFERENCE_THRESHOLD_PERCENT}% RULE</Text>
          </View>
        </Surface>
      </View>

      <View style={[styles.bottomRow, desktop && styles.bottomRowDesktop]}>
        {assessment ? <Surface style={[styles.comparisonPanel, desktop && styles.comparisonDesktop]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Baseline Comparison Detail</Text>
              <Text style={styles.cardMeta}>Synthetic fixture baseline · {DIFFERENCE_THRESHOLD_PERCENT}% demo comparison threshold</Text>
            </View>
          </View>
          <ComparisonTable comparisons={assessment.comparisons} />
        </Surface> : null}

        <Surface style={[styles.panel, desktop && styles.dataDesktop]}>
          <View style={styles.panelHeader}>
            <View style={styles.inline}><Database size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.panelLabel}>LOCAL DATA &amp; UPLINK</Text></View>
            <StatusPill label="Offline OK" tone="success" />
          </View>
          <View style={styles.dataList}>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Locally saved records</Text><Text style={styles.dataMeta}>Device persistence</Text></View><Text style={styles.dataValue}>{checkIns.length} check-ins</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Awaiting delivery</Text><Text style={styles.dataMeta}>Queued in outbox</Text></View><Text style={[styles.dataValue, pendingCount > 0 && { color: colors.accent[400] }]}>{pendingCount} reports</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Receiver acknowledged</Text><Text style={styles.dataMeta}>Verified receipts only</Text></View><Text style={[styles.dataValue, acknowledgedCount > 0 && { color: colors.success[400] }]}>{acknowledgedCount} reports</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Simulated link</Text><Text style={styles.dataMeta}>Ground handoff state</Text></View><View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: linkAvailable ? colors.success[400] : colors.accent[400] }]} /><Text style={[styles.dataValue, { color: linkAvailable ? colors.success[400] : colors.accent[400] }]}>{linkAvailable ? 'Available' : 'Unavailable'}</Text></View></View>
          </View>
          {latestCheckIn ? <Text style={styles.dataMeta}>Latest check-in · {formatTimestamp(latestCheckIn.recordedAt)}</Text> : <Text style={styles.dataMeta}>No check-in recorded yet.</Text>}
          <PrimaryButton label="Open reports & sync" variant="secondary" onPress={() => router.navigate('/delivery')} />
        </Surface>
      </View>

      <Surface tone="panel" style={styles.hazards}>
        <View style={styles.panelHeader}>
          <View style={styles.inline}><ClipboardList size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text accessibilityRole="header" style={styles.cardTitle}>Spaceflight Hazards</Text></View>
          <Text style={styles.ruleText}>NASA HRP CONTEXT</Text>
        </View>
        <Text style={styles.hazardBody}>NASA&apos;s Human Research Program studies space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. This prototype explores keeping records accessible during communication outages.</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.nasa.gov/hrp/risks/')} style={styles.link}>
          <Text style={styles.cyan}>Explore NASA&apos;s spaceflight hazards</Text><ArrowUpRight size={15} color={colors.primary[400]} />
        </Pressable>
      </Surface>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  heroCopy: { gap: 5, flexShrink: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 8px rgba(80, 222, 216, 0.75)' } as ViewStyle : {}),
  },
  eyebrow: { ...typography.labelWide, color: colors.primary[300], flex: 1, minWidth: 0 },
  heroTitle: { ...typography.hero, color: colors.offWhite },
  heroTitleMobile: typography.heroMobile,
  heroSubtitle: { ...typography.body, color: colors.slate[300] },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
    backgroundColor: 'rgba(36, 55, 68, 0.42)',
  },
  linkChipLabel: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300] },

  bannerSection: { gap: 12 },
  banner: { padding: 20, gap: 18 },
  bannerDesktop: { padding: 24 },
  bannerGrid: { gap: 18 },
  bannerGridDesktop: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  arcBlock: { gap: 12, flex: 0.9, minWidth: 0 },
  arcHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  arcLabel: { ...typography.labelWide, color: colors.offWhite },
  percentPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(80, 222, 216, 0.3)', backgroundColor: 'rgba(80, 222, 216, 0.12)' },
  percentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary[300] },
  percentText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.4, color: colors.primary[300] },
  trajectoryLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' },
  trajectoryLabel: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.8, color: colors.slate[400] },
  nodeDot: { width: 5, height: 5, borderRadius: 3 },
  track: { height: 8, borderRadius: 999, backgroundColor: 'rgba(36, 55, 68, 0.8)', borderWidth: 1, borderColor: 'rgba(60, 73, 72, 0.5)', overflow: 'visible', justifyContent: 'center' },
  trackFill: { height: 6, borderRadius: 999, marginLeft: 0 },
  craftMarker: { position: 'absolute', top: -7, marginLeft: -10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  craftRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(114, 251, 244, 0.55)',
    backgroundColor: 'rgba(80, 222, 216, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 16px rgba(80, 222, 216, 0.75)' } as ViewStyle : {}),
  },
  craftDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary[300] },
  trajectoryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  arcMeta: { ...typography.meta, color: colors.slate[400] },
  arcAccent: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: colors.primary[300], fontVariant: ['tabular-nums'] },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, minWidth: 0 },
  statGridDesktop: { flex: 1.45 },
  statBlockCompact: { flexBasis: '46%' },
  statBlock: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 132,
    gap: 6,
    padding: 13,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(141, 187, 255, 0.13)',
    backgroundColor: 'rgba(9, 29, 42, 0.68)',
  },
  statLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[400], flexShrink: 1 },
  statValue: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.offWhite },
  statDetail: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.4, textTransform: 'uppercase' },

  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, color: colors.offWhite, flexShrink: 1 },
  sectionTitleMobile: typography.sectionMobile,
  sectionMeta: { ...typography.monoSmall, color: colors.slate[400] },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success[400] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  observationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  observation: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  observationFull: { flexBasis: '100%' },
  observationDesktop: { flexBasis: '31%' },

  analysis: { gap: 20 },
  analysisDesktop: { flexDirection: 'row', alignItems: 'stretch', gap: 20 },
  chartCard: { flex: 1.9, minWidth: 0, gap: 16, borderColor: 'rgba(80, 222, 216, 0.14)' },
  assessmentDesktop: { flex: 1, minWidth: 0 },
  panel: { gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  panelLabel: { ...typography.label, color: colors.slate[300], flexShrink: 1 },
  panelTitle: { ...typography.cardTitle, color: colors.offWhite },
  panelBody: { ...typography.bodySmall, color: colors.slate[300] },
  eventRow: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: 'rgba(243, 193, 107, 0.08)', borderWidth: 1, borderColor: 'rgba(243, 193, 107, 0.20)' },
  eventText: { gap: 2, flexShrink: 1, minWidth: 0 },
  eventLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.8, color: colors.accent[400] },
  eventValue: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  notice: { gap: 5, padding: 11, borderRadius: radius.sm, backgroundColor: stitch.panelDeep, borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)' },
  noticeLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.8, color: colors.slate[400], flexShrink: 1 },
  noticeBody: { ...typography.meta, color: colors.slate[500] },
  panelFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  ruleText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[500] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitleBlock: { gap: 2, flexShrink: 1, minWidth: 0 },
  cardTitle: { ...typography.cardTitle, color: colors.offWhite },
  cardMeta: { ...typography.meta, color: colors.slate[400] },
  cyan: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  link: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },

  dataList: { gap: 8 },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderRadius: radius.sm, backgroundColor: 'rgba(9, 29, 42, 0.62)', borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.75)' },
  dataLabel: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.slate[200] },
  dataMeta: { ...typography.meta, color: colors.slate[500] },
  dataValue: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.offWhite, fontVariant: ['tabular-nums'] },

  bottomRow: { gap: 20 },
  bottomRowDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  comparisonPanel: { gap: 12, borderColor: 'rgba(141, 187, 255, 0.14)' },
  comparisonDesktop: { flex: 1.6, minWidth: 0 },
  dataDesktop: { flex: 1, minWidth: 0 },
  hazards: { gap: 10 },
  hazardBody: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 980 },
});
