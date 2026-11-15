import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Activity, ArrowUpRight, ClipboardList, Database, HeartPulse, Moon, Orbit, Radio, ShieldCheck, Smile, Thermometer, Zap } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ObservationCard } from '@/components/ObservationCard';
import { Surface } from '@/components/Surface';
import { TrendBars } from '@/components/TrendBars';
import { ComparisonTable } from '@/components/ComparisonTable';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { colors, fonts, layout, stitch } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import { buildReadingTiles, type ReadingStatus } from '@/lib/readingTiles';
import { checkInStreak } from '@/lib/checkInStreak';
import { formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

const PLANNED_DEMO_MISSION_DAYS = 240;

export default function MissionHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const { latestCheckIn, checkIns, reports, linkAvailable } = useSession();
  const streak = checkInStreak(checkIns);
  const pendingCount = reports.filter((report) => report.status !== 'acknowledged').length;
  const acknowledgedCount = reports.filter((report) => report.status === 'acknowledged').length;
  const assessment = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);
  const tiles = latestCheckIn && assessment ? buildReadingTiles(latestCheckIn.readings, assessment.comparisons) : [];
  const review = tiles.some((tile) => tile.status === 'difference');
  const compared = assessment?.comparisons.some((item) => item.percentChange !== null);
  const progress = crewProfile.missionDay / PLANNED_DEMO_MISSION_DAYS * 100;
  const metric = (index: number) => tiles[index] ?? { value: 'Not recorded', unit: '', status: 'missing' as ReadingStatus };
  const systolic = metric(1);
  const diastolic = metric(2);
  const bpMissing = systolic.status === 'missing' && diastolic.status === 'missing';
  const bpStatus: ReadingStatus = bpMissing ? 'missing' : [systolic, diastolic].some((item) => item.status === 'difference') ? 'difference' : [systolic, diastolic].some((item) => item.status === 'missing') ? 'recorded' : 'baseline';
  const observations = [
    { ...metric(0), label: 'Heart rate', baseline: `${syntheticBaseline.heartRateBpm} bpm`, Icon: HeartPulse },
    { label: 'Blood pressure', value: bpMissing ? 'Not recorded' : `${systolic.status === 'missing' ? '—' : systolic.value} / ${diastolic.status === 'missing' ? '—' : diastolic.value}`, unit: 'mmHg', status: bpStatus, baseline: `${syntheticBaseline.systolicMmHg}/${syntheticBaseline.diastolicMmHg} mmHg`, Icon: Activity },
    { ...metric(3), label: 'Body temperature', baseline: `${syntheticBaseline.temperatureC} °C`, Icon: Thermometer },
    { ...metric(4), label: 'Sleep duration', baseline: `${syntheticBaseline.sleepHours} h`, Icon: Moon },
    { ...metric(5), label: 'Mood', Icon: Smile },
    { ...metric(6), label: 'Stress', Icon: Zap },
  ];

  return (
    <ScreenContainer title="Mission overview" subtitle={`Welcome aboard, ${crewProfile.name.split(' ')[0]}. Your crew health observation log.`}>
      <View style={styles.actionRow}>
        <Text style={styles.eyebrow}>CREW HEALTH / SYNTHETIC MISSION</Text>
        <View style={!desktop && { width: '100%' }}><PrimaryButton label="Start check-in" onPress={() => router.navigate('/check-in')} /></View>
      </View>

      <Surface variant="glass" style={[styles.mission, desktop && styles.missionDesktop]}>
        <View style={[styles.transit, desktop && styles.flex]}>
          <View style={styles.row}><Orbit size={20} color={colors.primary[400]} /><Text style={styles.eyebrow}>MISSION PROGRESS</Text><Text style={styles.percent}>{progress.toFixed(1)}%</Text></View>
          <Text style={styles.sectionTitle}>{crewProfile.missionName}</Text>
          <View style={styles.trackLabels}><Text style={styles.meta}>Day 1</Text><Text style={styles.cyan}>FD {crewProfile.missionDay}</Text><Text style={styles.meta}>Day {PLANNED_DEMO_MISSION_DAYS}</Text></View>
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel="Simulated mission progress" accessibilityValue={{ min: 0, max: PLANNED_DEMO_MISSION_DAYS, now: crewProfile.missionDay }}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.meta}>{`Mission progress · Day ${crewProfile.missionDay} of ${PLANNED_DEMO_MISSION_DAYS}`}</Text>
        </View>
        {desktop ? <View style={styles.missionStats}>
          <View style={styles.inset}><Text style={styles.eyebrow}>CREW MEMBER</Text><Text style={styles.statValue}>{crewProfile.name}</Text>{desktop ? <Text style={styles.meta}>{crewProfile.role}</Text> : null}<Text style={styles.meta}>Fictional crew</Text></View>
          <View style={styles.inset}><Text style={styles.eyebrow}>CHECK-IN ROUTINE</Text><Text style={styles.statValue}>{streak} {streak === 1 ? 'day' : 'days'}</Text><Text style={styles.meta}>Consecutive UTC days</Text><Text style={styles.cyan}>{checkIns.length} saved {checkIns.length === 1 ? 'check-in' : 'check-ins'}</Text></View>
        </View> : <View style={styles.mobileCrew}><Text style={styles.cyan}>{crewProfile.name} · Fictional crew</Text><Text style={styles.meta}>{streak} {streak === 1 ? 'day' : 'days'} in your UTC streak · {checkIns.length} saved check-ins</Text></View>}
      </Surface>

      <View style={styles.sectionHeader}><View style={styles.row}><Activity size={22} color={colors.primary[400]} /><Text accessibilityRole="header" style={styles.sectionTitle}>Latest health observations</Text></View><Text style={styles.meta}>Manual entries · Synthetic data</Text></View>
      {!latestCheckIn ? <Surface><EmptyState title="No check-in saved yet" body="Start a check-in to record observations. No measurements or historical events have been prefilled." /></Surface> : null}
      <View style={styles.observationGrid}>
        {observations.map((item) => <View key={item.label} style={[styles.observation, desktop && styles.observationDesktop]}><ObservationCard {...item} measuredAt={latestCheckIn?.recordedAt} /></View>)}
      </View>

      <View style={[styles.analysis, desktop && styles.analysisDesktop]}>
        <Surface style={styles.chart}>
          <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>Health trend trajectory</Text><Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.link}><Text style={styles.cyan}>View trends</Text><ArrowUpRight size={16} color={colors.primary[400]} /></Pressable></View>
          <Text style={styles.meta}>Recorded observations against your synthetic baseline. No live sensor feed.</Text>
          <TrendBars title="Heart rate" unit="bpm" decimals={0} baseline={syntheticBaseline.heartRateBpm} checkIns={checkIns} read={(item) => item.readings.heartRateBpm} />
          {assessment ? <ComparisonTable comparisons={assessment.comparisons} /> : null}
        </Surface>
        <View style={styles.sideStack}>
          <Surface>
            <View style={styles.row}><ShieldCheck size={20} color={colors.secondary[400]} /><Text style={styles.eyebrow}>ASSESSMENT SUMMARY</Text></View>
            <StatusPill label={!compared ? 'Insufficient data' : review ? 'Review suggested · Demo rule' : 'Within demo comparison range'} tone={review ? 'accent' : 'neutral'} />
            <Text style={styles.body}>{assessment?.explanation.possibleInterpretation ?? 'Save a check-in to see its comparison with the synthetic baseline.'}</Text>
            <View style={styles.notice}><Text style={styles.meta}>Educational synthetic demonstration. Does not diagnose medical conditions or prescribe interventions.</Text></View>
            <PrimaryButton label="Open assessment" variant="secondary" onPress={() => router.navigate('/assessment')} />
          </Surface>
          <Surface>
            <View style={styles.row}><Database size={20} color={colors.secondary[400]} /><Text style={styles.sectionTitle}>Local data & handoff</Text></View>
            <Text style={styles.meta}>{latestCheckIn ? `Latest check-in · ${formatTimestamp(latestCheckIn.recordedAt)}` : 'No check-in recorded'}</Text>
            <View style={styles.detailRow}><Text style={styles.meta}>Awaiting delivery</Text><Text style={styles.cyan}>{pendingCount} reports</Text></View>
            <View style={styles.detailRow}><Text style={styles.meta}>Receiver acknowledged</Text><Text style={styles.cyan}>{acknowledgedCount} reports</Text></View>
            <View style={styles.row}><Radio size={16} color={colors.accent[400]} /><Text style={styles.meta}>Simulated link · {linkAvailable ? 'Available' : 'Unavailable'}</Text></View>
            <PrimaryButton label="Open delivery" variant="secondary" onPress={() => router.navigate('/delivery')} />
          </Surface>
        </View>
      </View>
      <Surface style={styles.hazards}>
        <View style={styles.row}><ClipboardList size={20} color={colors.secondary[400]} /><Text style={styles.sectionTitle}>Spaceflight hazards</Text></View>
        <Text style={styles.meta}>NASA&apos;s Human Research Program studies space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. This prototype explores keeping records accessible during communication outages.</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.nasa.gov/hrp/risks/')} style={styles.link}><Text style={styles.cyan}>Explore NASA&apos;s spaceflight hazards</Text><ArrowUpRight size={16} color={colors.primary[400]} /></Pressable>
      </Surface>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 17, letterSpacing: 0.7, color: colors.slate[300], flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  mission: { gap: 20 },
  missionDesktop: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  mobileCrew: { gap: 4 },
  transit: { gap: 12, minWidth: 0 },
  percent: { marginLeft: 'auto', fontFamily: fonts.mono, color: colors.primary[400], fontSize: 14 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.navy[600] },
  progressFill: { height: '100%', backgroundColor: colors.primary[400] },
  missionStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, flex: 1, minWidth: 0 },
  inset: { flex: 1, minWidth: 130, backgroundColor: colors.navy[900], padding: 16, borderRadius: 12, borderWidth: 1, borderColor: stitch.glassBorder, gap: 6 },
  statValue: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, color: colors.offWhite },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: colors.offWhite, flexShrink: 1 },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.slate[300] },
  cyan: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 19, color: colors.primary[400] },
  observationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  observation: { flexBasis: '46%', flexGrow: 1, minWidth: 0 },
  observationDesktop: { flexBasis: '30%' },
  analysis: { gap: 20, marginTop: 8 },
  analysisDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  chart: { flex: 1.8, minWidth: 0 },
  sideStack: { flex: 1, minWidth: 0, gap: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 23, color: colors.slate[300] },
  notice: { padding: 12, backgroundColor: colors.navy[900], borderRadius: 8 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.navy[600] },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  hazards: { marginTop: 4 },
});
