import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, ClipboardList, Users } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { MetricTile } from '@/components/MetricTile';
import { TrendBars } from '@/components/TrendBars';
import { ComparisonTable } from '@/components/ComparisonTable';
import { buildReadingTiles } from '@/lib/readingTiles';
import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LinkIndicator, StatusPill } from '@/components/StatusPill';
import { colors, fonts, spacing } from '@/constants/theme';
import { crewProfile, syntheticBaseline } from '@/fixtures/crew';
import { checkInStreak } from '@/lib/checkInStreak';
import { formatReadingValue, formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

const PLANNED_DEMO_MISSION_DAYS = 240;

export default function MissionHomeScreen() {
  const router = useRouter();
  const { latestCheckIn, checkIns, reports, linkAvailable } = useSession();
  const streak = checkInStreak(checkIns);
  const pendingCount = reports.filter((report) => report.status !== 'acknowledged').length;
  const assessment = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);

  return (
    <ScreenContainer
      title="Mission overview"
      subtitle={`${crewProfile.missionName} · Mission day ${crewProfile.missionDay} · Crew health monitoring`}
    >
      <Grid>
        <GridItem>
          <Panel title="Crew status">
            <View style={styles.crewHeader}>
              <View style={styles.crewIcon}><Users size={21} color={colors.primary[400]} /></View>
              <View style={styles.block}>
                <Text style={styles.name}>{crewProfile.name}</Text>
                <Text style={styles.muted}>{crewProfile.role}</Text>
              </View>
            </View>
            <Text style={styles.muted}>{`Mission progress · Day ${crewProfile.missionDay} of ${PLANNED_DEMO_MISSION_DAYS}`}</Text>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Simulated mission progress"
              accessibilityValue={{ min: 0, max: PLANNED_DEMO_MISSION_DAYS, now: crewProfile.missionDay }}
            >
              <View style={[styles.progressFill, { width: `${crewProfile.missionDay / PLANNED_DEMO_MISSION_DAYS * 100}%` }]} />
            </View>
            <LinkIndicator available={linkAvailable} />
            <Text style={styles.muted}>{streak > 0 ? `Check-in streak · ${streak} ${streak === 1 ? 'day' : 'days'} (UTC)` : 'Save a check-in to start a streak.'}</Text>
          </Panel>
        </GridItem>
        <GridItem>
          <Panel title="Latest check-in">
            {latestCheckIn ? (
              <View style={styles.block}>
                <Text style={styles.muted}>{`Recorded ${formatTimestamp(latestCheckIn.recordedAt)} · ${latestCheckIn.id}`}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{`Mood ${latestCheckIn.readings.mood ?? 'not recorded'} / 5`}</Text>
                  <Text style={styles.summaryValue}>{`Stress ${latestCheckIn.readings.stress ?? 'not recorded'} / 5`}</Text>
                  <Text style={styles.summaryValue}>{`Temperature ${formatReadingValue(latestCheckIn.readings.temperatureC, '°C', 1)}`}</Text>
                </View>
                <StatusPill label="Saved locally" tone="primary" />
              </View>
            ) : <EmptyState title="No check-in saved yet" body="Save a check-in to see current readings and assessment." />}
            <PrimaryButton label="Start check-in" onPress={() => router.navigate('/check-in')} />
          </Panel>
        </GridItem>

        {latestCheckIn && assessment ? (
          <GridItem wide>
            <Panel title="Latest health observations">
              <Text style={styles.muted}>{formatTimestamp(latestCheckIn.recordedAt)} · Manual entry · Synthetic demo</Text>
              <View style={styles.summaryRow}>
                {buildReadingTiles(latestCheckIn.readings, assessment.comparisons).map((tile) => (
                  <MetricTile key={tile.label} {...tile} measuredAt={latestCheckIn.recordedAt} />
                ))}
              </View>
            </Panel>
          </GridItem>
        ) : null}
        {latestCheckIn ? (
          <GridItem>
            <Panel title="Historical heart rate">
              <TrendBars title="Heart rate" unit="bpm" decimals={0} baseline={syntheticBaseline.heartRateBpm} checkIns={checkIns} read={(item) => item.readings.heartRateBpm} />
            </Panel>
          </GridItem>
        ) : null}
        {assessment ? (
          <GridItem>
            <Panel title="Synthetic baseline comparison">
              <ComparisonTable comparisons={assessment.comparisons} />
            </Panel>
          </GridItem>
        ) : null}

        <GridItem>
          <Panel title="Assessment summary">
            <Text style={styles.assessmentText}>{assessment?.explanation.possibleInterpretation ?? 'Save a check-in to see its comparison with the synthetic baseline.'}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/assessment')} style={styles.link}>
              <Text style={styles.linkText}>Open assessment</Text><ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>
        <GridItem>
          <Panel title="Queued reports">
            <View style={styles.summaryHeading}><ClipboardList size={18} color={colors.primary[400]} /><Text style={styles.count}>{pendingCount}</Text></View>
            <Text style={styles.muted}>{pendingCount === 1 ? 'report awaiting delivery' : 'reports awaiting delivery'}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/delivery')} style={styles.link}>
              <Text style={styles.linkText}>Open delivery</Text><ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>
        <GridItem wide>
          <Panel title="Spaceflight hazards">
            <Text style={styles.muted}>NASA&apos;s Human Research Program studies space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile or closed environments.</Text>
            <Text style={styles.muted}>ASTRA CARE demonstrates one challenge of distance from Earth: keeping records accessible while communications are unavailable.</Text>
            <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.nasa.gov/hrp/risks/')} style={styles.link}>
              <Text style={styles.linkText}>Explore NASA&apos;s spaceflight hazards</Text>
              <ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.navy[600] },
  progressFill: { height: '100%', backgroundColor: colors.primary[400] },
  crewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  crewIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy[700] },
  summaryCard: { minHeight: 140, padding: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.navy[600], backgroundColor: colors.navy[800], justifyContent: 'space-between', gap: spacing.xs },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs / 2 },
  cardLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.8, color: colors.slate[300] },
  assessmentText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.offWhite },
  block: {
    gap: spacing.xs / 2,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.offWhite,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate[300],
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 38,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  link: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
  },
  linkActive: {
    backgroundColor: colors.navy[700],
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary[400],
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryValue: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
});
