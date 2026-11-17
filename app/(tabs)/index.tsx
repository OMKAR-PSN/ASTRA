import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Activity, ArrowRight, ArrowUpRight, BookOpen, ChartNoAxesCombined, ChevronRight, ClipboardList, Database, Eye, HeartPulse, Info, Moon, ShieldCheck, Smile, Sparkles, Thermometer, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { ComparisonTable } from '@/components/ComparisonTable';
import { EmptyState } from '@/components/EmptyState';
import { KnowledgeLink } from '@/components/KnowledgeLink';
import { ObservationCard } from '@/components/ObservationCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { TrendBars } from '@/components/TrendBars';
import { colors, fonts, layout, radius, type as typography } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import { buildReadingTiles, type ReadingStatus } from '@/lib/readingTiles';
import { buildJourneySummary } from '@/lib/engagement';
import { DIFFERENCE_THRESHOLD_PERCENT, formatSigned } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import { useUtcClock } from '@/hooks/useUtcClock';
import { createReportSnapshot } from '@/lib/snapshot';
import { usePresentation } from '@/state/PresentationSession';
import { useSession } from '@/state/SessionProvider';

const PLANNED_DEMO_MISSION_DAYS = 240;
const missionName = crewProfile.missionName.replace(' (simulated)', '');

type Observation = {
  label: string;
  value: string;
  unit: string;
  status: ReadingStatus;
  baseline?: string;
  delta?: string;
  deltaTone?: 'neutral' | 'success' | 'accent';
  Icon: LucideIcon;
};

export default function MissionHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const sixCards = width >= 1360;
  const { latestCheckIn, checkIns, reports, linkAvailable, engagement, setJourneyVisible } = useSession();
  const { active: demoActive } = usePresentation();
  const now = useUtcClock();
  const journey = useMemo(
    () => buildJourneySummary({ checkIns, engagement, referenceTime: now }),
    [checkIns, engagement, now],
  );
  const nextMilestone = journey.milestones.find((milestone) => !milestone.unlocked) ?? null;
  const pendingCount = reports.filter((report) => report.status !== 'acknowledged').length;
  const acknowledgedCount = reports.filter((report) => report.status === 'acknowledged').length;
  const assessment = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);
  const tiles = latestCheckIn && assessment ? buildReadingTiles(latestCheckIn.readings, assessment.comparisons) : [];
  const heartTrend = assessment?.comparisons.find((item) => item.label === 'Heart rate') ?? null;
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
    return change === null || change === undefined ? undefined : `${formatSigned(change, decimals)} ${unit} vs base`;
  };
  const deltaTone = (status: ReadingStatus): Observation['deltaTone'] => status === 'difference' ? 'accent' : status === 'baseline' ? 'success' : 'neutral';

  const observations: Observation[] = [
    {
      ...metric(0), label: 'Heart rate', baseline: `${syntheticBaseline.heartRateBpm} bpm`,
      delta: delta('Heart rate', 'bpm', 0), deltaTone: deltaTone(metric(0).status),
      Icon: HeartPulse,
    },
    {
      label: 'Blood pressure',
      value: bpMissing ? 'Not recorded' : `${systolic.status === 'missing' ? '—' : systolic.value}/${diastolic.status === 'missing' ? '—' : diastolic.value}`,
      unit: 'mmHg', status: bpStatus, baseline: `${syntheticBaseline.systolicMmHg}/${syntheticBaseline.diastolicMmHg} mmHg`,
      Icon: Activity,
    },
    {
      ...metric(3), label: 'Body temperature', baseline: `${syntheticBaseline.temperatureC} °C`,
      delta: delta('Body temperature', '°C', 1), deltaTone: deltaTone(metric(3).status),
      Icon: Thermometer,
    },
    {
      ...metric(4), label: 'Sleep duration', baseline: `${syntheticBaseline.sleepHours} h`,
      delta: delta('Sleep', 'h', 1), deltaTone: deltaTone(metric(4).status),
      Icon: Moon,
    },
    {
      ...metric(5), label: 'Mood', unit: 'of 5', delta: 'Self-reported 1–5', deltaTone: 'neutral', Icon: Smile,
    },
    {
      ...metric(6), label: 'Perceived stress', unit: 'of 5', delta: 'Self-reported 1–5', deltaTone: 'neutral', Icon: Zap,
    },
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
          <Text accessibilityRole="header" style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>Good morning, {firstName}.</Text>
          <Text style={styles.heroSubtitle}>Your mission health overview.</Text>
        </View>
        {desktop ? <View style={styles.heroMeta}>
          <View style={styles.heroMetaDot} />
          <Text style={styles.heroMetaText}>SYNTHETIC MANUAL OBSERVATIONS · NO LIVE SENSOR FEED</Text>
        </View> : null}
      </View>

      <Surface variant="glass" tone="panel" style={[styles.banner, desktop && styles.bannerDesktop]}>
        {desktop ? <>
          <Image source={require('@/assets/images/mars-banner.png')} style={styles.bannerArt} resizeMode="cover" />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(4, 16, 28, 0.97)', 'rgba(4, 16, 28, 0.82)', 'rgba(4, 16, 28, 0.18)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </> : <Image source={require('@/assets/images/mars-banner.png')} style={styles.bannerArtMobile} resizeMode="cover" />}

        <View style={styles.bannerContent}>
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerEyebrow}>MISSION</Text>
            <Text style={[styles.bannerTitle, !desktop && styles.bannerTitleMobile]}>{missionName}</Text>
            <View style={styles.bannerMetaRow}>
              <StatusPill label="Simulated transit" tone="primary" />
              <Text style={styles.bannerMeta}>Flight Day {crewProfile.missionDay} of {PLANNED_DEMO_MISSION_DAYS}</Text>
            </View>
          </View>

          <View style={styles.factRow}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>FLIGHT DAY</Text>
              <Text style={styles.factValue}>Day {crewProfile.missionDay}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>PLANNED DURATION</Text>
              <Text style={styles.factValue}>{PLANNED_DEMO_MISSION_DAYS} days</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>CHECK-IN DAYS</Text>
              <Text style={styles.factValue}>{journey.distinctDays} {journey.distinctDays === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>MISSION PHASE</Text>
              <Text style={styles.factValue}>Transit</Text>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>Mission progress</Text>
              <Text style={styles.progressValue}>{progress.toFixed(1)}% complete</Text>
            </View>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Simulated mission progress" accessibilityValue={{ min: 0, max: PLANNED_DEMO_MISSION_DAYS, now: crewProfile.missionDay }}>
              <LinearGradient colors={[colors.primary[300], colors.primary[400], colors.secondary[400]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.trackFill, { width: `${progress}%` }]} />
              <View style={[styles.craftMarker, { left: `${Math.min(99, Math.max(1, progress))}%` }]}>
                <View style={styles.craftRing}><View style={styles.craftDot} /></View>
              </View>
            </View>
            <Text style={styles.progressMeta}>Planned demo timeline · Day {crewProfile.missionDay} of {PLANNED_DEMO_MISSION_DAYS}</Text>
          </View>

          <View style={styles.bannerFooter}>
            <View style={styles.bannerFooterCopy}>
              <Text style={styles.bannerFooterLabel}>DAILY HEALTH ROUTINE</Text>
              <Text style={styles.bannerFooterText}>Record manual observations. Everything stays on this device.</Text>
            </View>
            <PrimaryButton label="Start Health Check-In" Icon={ArrowRight} onPress={() => router.push('/guided-check-in')} style={!desktop ? styles.ctaMobile : undefined} />
          </View>
        </View>
      </Surface>

      {engagement.journeyVisible ? (
        <Surface variant="glass" tone="panel" style={styles.journeyStrip}>
          <View style={styles.journeyHead}>
            <View style={styles.inline}>
              <Sparkles size={15} color={colors.primary[300]} strokeWidth={2.2} />
              <Text accessibilityRole="header" style={styles.journeyLabel}>MISSION WELLNESS JOURNEY</Text>
            </View>
            <StatusPill label={demoActive ? 'Demo session · temporary' : 'Optional participation'} tone={demoActive ? 'accent' : 'primary'} />
          </View>
          <View style={[styles.journeyBodyRow, desktop && styles.journeyBodyRowDesktop]}>
            <View style={styles.journeyCopy}>
              <Text style={styles.journeyTitle}>
                {journey.distinctDays === 0 ? 'Your first check-in starts the journey.' : journey.routine.complete ? "Today's health routine is complete." : 'Your next check-in is available whenever you are ready.'}
              </Text>
              <Text style={styles.journeyText}>{journey.encouragement}</Text>
              <View style={styles.journeyMetaRow}>
                <Text style={styles.journeyMeta}>{`${journey.distinctDays} check-in ${journey.distinctDays === 1 ? 'day' : 'days'} · ${journey.unlockedCount} of ${journey.milestones.length} milestones`}</Text>
                {nextMilestone ? <Text style={styles.journeyMeta}>{`Current · ${nextMilestone.title}`}</Text> : <Text style={styles.journeyMeta}>All milestones explored</Text>}
              </View>
            </View>
            <PrimaryButton label="Open Mission Journey" onPress={() => router.navigate('/journey')} style={!desktop ? styles.ctaMobile : undefined} />
          </View>
          {demoActive ? <Text style={styles.journeyFootnote}>Demo progress is temporary and session-only. Saved device records are unchanged.</Text> : null}
        </Surface>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => { void setJourneyVisible(true); }} style={styles.showJourney}>
          <Eye size={14} color={colors.primary[300]} strokeWidth={2} />
          <Text style={styles.showJourneyText}>Show Mission Wellness Journey</Text>
        </Pressable>
      )}

      <View style={styles.section}>
        {!latestCheckIn ? <Surface variant="glass"><EmptyState title="No check-in saved yet" body="Start a check-in to record observations. No measurements or historical events have been prefilled." /></Surface> : null}
        {latestCheckIn ? <View style={styles.observationSectionHead}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Physiological baseline</Text>
          <Text style={styles.sectionMeta}>Latest · {formatTimestamp(latestCheckIn.recordedAt)}</Text>
        </View> : null}
        <View style={styles.observationGrid}>
          {observations.map((item) => (
            <View key={item.label} style={[styles.observation, width < 360 && styles.observationFull, desktop && (sixCards ? styles.observationSix : styles.observationDesktop)]}>
              <ObservationCard {...item} measuredAt={latestCheckIn?.recordedAt} />
            </View>
          ))}
        </View>
        <Text style={styles.observationNote}>Synthetic manual observations · Self-reported by astronaut · For research and educational use only.</Text>
      </View>

      <View style={[styles.analysis, desktop && styles.analysisDesktop]}>
        <Surface variant="glass" tone="panel" style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.inline}><ChartNoAxesCombined size={17} color={colors.primary[300]} strokeWidth={2.2} /><Text accessibilityRole="header" style={styles.cardTitle}>Health trends · heart rate</Text></View>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.link}>
              <Text style={styles.cyan}>View trends</Text><ArrowUpRight size={15} color={colors.primary[300]} />
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/replay')} style={styles.link}>
              <Text style={styles.cyan}>Open replay</Text><ArrowUpRight size={15} color={colors.primary[300]} />
            </Pressable>
          </View>
          <Text style={styles.cardMeta}>Recorded observations against your synthetic baseline. No live sensor feed.</Text>
          <TrendBars hideHeading title="Heart rate" unit="bpm" decimals={0} baseline={syntheticBaseline.heartRateBpm} checkIns={checkIns} read={(item) => item.readings.heartRateBpm} />
        </Surface>

        <Surface variant="glass" tone="panel" style={[styles.panel, desktop && styles.assessmentDesktop]}>
          <View style={styles.panelHeader}>
            <View style={styles.inline}><ShieldCheck size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.panelLabel}>ASSESSMENT</Text></View>
            <StatusPill label={assessmentPill.label} tone={assessmentPill.tone} />
          </View>
          <Text style={styles.panelTitle}>{assessmentTitle}</Text>
          <Text style={styles.panelBody}>{assessment?.explanation.possibleInterpretation ?? 'Save a check-in to see its comparison with the synthetic baseline.'}</Text>
          {reviewEvent ? <View style={styles.eventRow}>
            <View style={[styles.nodeDot, { backgroundColor: colors.accent[400], marginTop: 5 }]} />
            <View style={styles.eventText}>
              <Text style={styles.eventLabel}>MOST RECENT REVIEW EVENT</Text>
              <Text style={styles.eventValue} numberOfLines={2}>
                {reviewEvent.deviation.label} · {reviewEvent.deviation.current?.toFixed(reviewEvent.deviation.decimals)} {reviewEvent.deviation.unit} · {formatTimestamp(reviewEvent.snapshot.checkIn.recordedAt).split(',')[0]}
              </Text>
            </View>
          </View> : null}
          <View style={styles.contextStrip}>
            <View style={styles.contextCell}>
              <Text style={styles.contextLabel}>BASELINE</Text>
              <Text style={styles.contextValue}>{syntheticBaseline.heartRateBpm}<Text style={styles.contextUnit}> bpm</Text></Text>
            </View>
            <View style={styles.contextDivider} />
            <View style={styles.contextCell}>
              <Text style={styles.contextLabel}>LATEST</Text>
              <Text style={styles.contextValue}>{metric(0).status === 'missing' ? '—' : metric(0).value}<Text style={styles.contextUnit}>{metric(0).status === 'missing' ? '' : ' bpm'}</Text></Text>
            </View>
            <View style={styles.contextDivider} />
            <View style={styles.contextCell}>
              <Text style={styles.contextLabel}>DIFFERENCE</Text>
              <Text numberOfLines={1} style={[styles.contextValue, !desktop && styles.contextValueMobile, { color: colors.accent[400] }]}>{heartTrend?.percentChange != null ? `${formatSigned(heartTrend.percentChange, 2)}%` : '—'}</Text>
            </View>
          </View>
          <View style={styles.assessmentNote}>
            <Info size={12} color={colors.slate[400]} strokeWidth={2} />
            <Text style={styles.assessmentNoteText}>Educational synthetic evaluation · does not diagnose medical conditions</Text>
          </View>
          <View style={[styles.panelFooter, desktop && styles.footerPush]}>
            <PrimaryButton label="View explanation" variant="secondary" Icon={ChevronRight} onPress={() => router.navigate('/assessment')} />
            <Text style={styles.ruleText}>{DIFFERENCE_THRESHOLD_PERCENT}% RULE</Text>
          </View>
        </Surface>
      </View>

      <View style={[styles.bottomRow, desktop && styles.bottomRowDesktop]}>
        {assessment ? <Surface variant="glass" tone="panel" style={[styles.comparisonPanel, desktop && styles.comparisonDesktop]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Baseline comparison</Text>
              <Text style={styles.cardMeta}>Synthetic fixture baseline · {DIFFERENCE_THRESHOLD_PERCENT}% demo comparison threshold</Text>
            </View>
          </View>
          <ComparisonTable comparisons={assessment.comparisons} />
          {!desktop ? <Text style={styles.comparisonNote}>Swipe horizontally to view change and percent.</Text> : null}
          <Text style={styles.comparisonNote}>Percent change is measured against the synthetic fixture baseline, not a clinical reference range.</Text>
        </Surface> : null}

        <Surface variant="glass" tone="panel" style={[styles.panel, desktop && styles.dataDesktop]}>
          <View style={styles.panelHeader}>
            <View style={styles.inline}><Database size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text style={styles.panelLabel}>REPORTS &amp; SYNC</Text></View>
            <StatusPill label="Offline OK" tone="success" />
          </View>
          <View style={styles.dataList}>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Report saved locally</Text><Text style={styles.dataMeta}>Device persistence</Text></View><Text style={styles.dataValue}>{checkIns.length} check-ins</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Queued for transmission</Text><Text style={styles.dataMeta}>Awaiting ground receiver</Text></View><Text style={[styles.dataValue, pendingCount > 0 && { color: colors.accent[400] }]}>{pendingCount} reports</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Receiver acknowledged</Text><Text style={styles.dataMeta}>Verified receipts only</Text></View><Text style={[styles.dataValue, acknowledgedCount > 0 && { color: colors.success[400] }]}>{acknowledgedCount} reports</Text></View>
            <View style={styles.dataRow}><View><Text style={styles.dataLabel}>Simulated connection</Text><Text style={styles.dataMeta}>Ground handoff state</Text></View><View style={styles.inline}><View style={[styles.nodeDot, { backgroundColor: linkAvailable ? colors.success[400] : colors.accent[400] }]} /><Text style={[styles.dataValue, { color: linkAvailable ? colors.success[400] : colors.accent[400] }]}>{linkAvailable ? 'Available' : 'Unavailable'}</Text></View></View>
          </View>
          {latestCheckIn ? <Text style={styles.dataMeta}>Latest check-in · {formatTimestamp(latestCheckIn.recordedAt)}</Text> : <Text style={styles.dataMeta}>No check-in recorded yet.</Text>}
          <PrimaryButton label="Open reports & sync" variant="secondary" onPress={() => router.navigate('/delivery')} />
        </Surface>
      </View>

      <Surface variant="glass" tone="panel" style={styles.hazards}>
        <View style={styles.panelHeader}>
          <View style={styles.inline}><ClipboardList size={16} color={colors.secondary[400]} strokeWidth={2.2} /><Text accessibilityRole="header" style={styles.cardTitle}>Spaceflight hazards</Text></View>
          <Text style={styles.ruleText}>NASA HRP CONTEXT</Text>
        </View>
        <Text style={styles.hazardBody}>NASA&apos;s Human Research Program studies space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments. This prototype explores keeping records accessible during communication outages.</Text>
        <View style={styles.hazardLinks}>
          <KnowledgeLink
            cardId="five-hazards"
            label="Read: The five hazards of human spaceflight"
            hint="Opens the bundled knowledge card. Available offline."
          />
          <PrimaryButton variant="secondary" label="Crew Knowledge Hub" Icon={BookOpen} onPress={() => router.navigate('/knowledge')} style={styles.knowledgeButton} />
        </View>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.nasa.gov/hrp/risks/')} style={styles.link}>
          <Text style={styles.cyan}>Explore NASA&apos;s spaceflight hazards</Text><ArrowUpRight size={15} color={colors.primary[300]} />
        </Pressable>
      </Surface>

      <View style={styles.pageFooter}>
        <Info size={13} color={colors.slate[500]} strokeWidth={2} />
        <Text style={styles.pageFooterText}>Synthetic demonstration for an educational prototype. Not a medical device, no live sensor integration, and no NASA certification is implied.</Text>
      </View>
    </ScreenContainer>
  );
}

const markerGlow = Platform.OS === 'web' ? { boxShadow: '0 0 18px rgba(0, 214, 198, 0.75)' } as ViewStyle : {};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  heroMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  heroCopy: { gap: 4, flexShrink: 1, minWidth: 0 },
  heroTitle: { ...typography.hero, color: colors.offWhite },
  heroTitleMobile: typography.heroMobile,
  heroSubtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.slate[300] },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingBottom: 7 },
  heroMetaDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary[400] },
  heroMetaText: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 13, letterSpacing: 0.6, color: colors.slate[500] },

  banner: { padding: 20, gap: 16, minHeight: 250 },
  bannerDesktop: { padding: 26, paddingRight: 30, justifyContent: 'flex-end' },
  bannerArt: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '48%', height: '100%', opacity: 0.92 },
  bannerArtMobile: { width: '100%', height: 108, borderRadius: 14, opacity: 0.9 },
  bannerContent: { gap: 16, zIndex: 1 },
  bannerCopy: { gap: 5 },
  bannerEyebrow: { ...typography.labelWide, color: colors.primary[300] },
  bannerTitle: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 37, letterSpacing: -0.7, color: colors.offWhite },
  bannerTitleMobile: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  bannerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  bannerMeta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[400], letterSpacing: 0.3 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, maxWidth: '72%' },
  fact: { gap: 3, minWidth: 96 },
  factLabel: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  factValue: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  progressBlock: { gap: 7, maxWidth: 760 },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  progressLabel: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[300] },
  progressValue: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.primary[300] },
  track: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.10)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', overflow: 'visible', justifyContent: 'center' },
  trackFill: { height: 6, borderRadius: 999 },
  craftMarker: { position: 'absolute', top: -6, marginLeft: -9, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  craftRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(125, 251, 240, 0.65)',
    backgroundColor: 'rgba(0, 214, 198, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    ...markerGlow,
  },
  craftDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary[300] },
  progressMeta: { ...typography.meta, fontSize: 10, color: colors.slate[500] },
  bannerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginTop: 2 },
  bannerFooterCopy: { gap: 2, flexShrink: 1, minWidth: 0 },
  bannerFooterLabel: { ...typography.label, fontSize: 8.5, color: colors.slate[400] },
  bannerFooterText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, color: colors.slate[300] },
  ctaMobile: { width: '100%' },

  journeyStrip: { padding: 18, gap: 12, borderColor: 'rgba(0, 214, 198, 0.22)' },
  journeyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  journeyLabel: { ...typography.label, color: colors.slate[200] },
  journeyBodyRow: { gap: 14 },
  journeyBodyRowDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journeyCopy: { gap: 4, flexShrink: 1, minWidth: 0 },
  journeyTitle: { ...typography.cardTitle, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  journeyText: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 820 },
  journeyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 2 },
  journeyMeta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, letterSpacing: 0.3, color: colors.slate[400] },
  journeyFootnote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  showJourney: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.22)', backgroundColor: 'rgba(0, 214, 198, 0.06)' },
  showJourneyText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },

  section: { gap: 12 },
  observationSectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitle: { ...typography.section, color: colors.offWhite, flexShrink: 1 },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[400] },
  observationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  observation: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  observationFull: { flexBasis: '100%' },
  observationDesktop: { flexBasis: '31%' },
  observationSix: { flexBasis: 150, flexGrow: 1 },
  observationNote: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.3, color: colors.slate[500] },

  analysis: { gap: 18 },
  analysisDesktop: { flexDirection: 'row', alignItems: 'stretch', gap: 18 },
  chartCard: { flex: 1.75, minWidth: 0, gap: 12 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  assessmentDesktop: { flex: 1, minWidth: 0 },
  panel: { gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  panelLabel: { ...typography.label, color: colors.slate[200], flexShrink: 1 },
  panelTitle: { ...typography.cardTitle, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  panelBody: { ...typography.bodySmall, fontSize: 13, lineHeight: 20, color: colors.slate[300] },
  eventRow: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: 'rgba(242, 192, 120, 0.07)', borderWidth: 1, borderColor: 'rgba(242, 192, 120, 0.20)' },
  eventText: { gap: 2, flexShrink: 1, minWidth: 0 },
  eventLabel: { ...typography.label, fontSize: 8, lineHeight: 12, letterSpacing: 0.8, color: colors.accent[400] },
  eventValue: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  assessmentNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  assessmentNoteText: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500], flexShrink: 1 },
  contextStrip: { flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.09)', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  contextCell: { flex: 1, gap: 3, paddingVertical: 10, paddingHorizontal: 11, minWidth: 0 },
  contextDivider: { width: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  contextLabel: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, color: colors.slate[500] },
  contextValue: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  contextValueMobile: { fontSize: 16, lineHeight: 22 },
  contextUnit: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[400] },
  footerPush: { marginTop: 'auto' },
  panelFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  ruleText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[500] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitleBlock: { gap: 2, flexShrink: 1, minWidth: 0 },
  cardTitle: { ...typography.cardTitle, fontSize: 17, lineHeight: 23, color: colors.offWhite },
  cardMeta: { ...typography.meta, color: colors.slate[400] },
  cyan: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
  link: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  nodeDot: { width: 5, height: 5, borderRadius: 3 },

  dataList: { gap: 7 },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderRadius: radius.sm, backgroundColor: 'rgba(255, 255, 255, 0.035)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  dataLabel: { ...typography.bodySmall, fontSize: 12, lineHeight: 17, color: colors.slate[200] },
  dataMeta: { ...typography.meta, color: colors.slate[500] },
  dataValue: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, color: colors.offWhite, fontVariant: ['tabular-nums'] },

  bottomRow: { gap: 18 },
  bottomRowDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  comparisonPanel: { gap: 12 },
  comparisonDesktop: { flex: 1.6, minWidth: 0 },
  comparisonNote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  dataDesktop: { flex: 1, minWidth: 0 },
  hazards: { gap: 10 },
  hazardBody: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 980 },
  hazardLinks: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  knowledgeButton: { flexGrow: 0 },
  pageFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingTop: 2 },
  pageFooterText: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500], flexShrink: 1 },
});
