import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, HeartPulse, Moon, ClipboardList, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LinkIndicator, StatusPill } from '@/components/StatusPill';
import { colors, fonts, spacing } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { formatReadingValue, formatTimestamp } from '@/lib/format';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

export default function MissionHomeScreen() {
  const router = useRouter();
  const { latestCheckIn, reports, linkAvailable, storageDescription } = useSession();
  const assessment = useMemo(() => latestCheckIn ? createReportSnapshot(latestCheckIn) : null, [latestCheckIn]);

  return (
    <ScreenContainer
      title="Mission overview"
      subtitle={`${crewProfile.missionName} · Mission day ${crewProfile.missionDay} · Crew health monitoring`}
    >
      <Panel title="Crew status">
        <View style={styles.crewHeader}>
          <View style={styles.crewIcon}><Users size={21} color={colors.primary[400]} /></View>
          <View style={styles.block}>
            <Text style={styles.name}>{crewProfile.name}</Text>
            <Text style={styles.muted}>{crewProfile.role}</Text>
          </View>
        </View>
        <LinkIndicator available={linkAvailable} />
      </Panel>

      <Grid>
        <GridItem>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.summaryCard}>
            <View style={styles.summaryHeading}><HeartPulse size={18} color={colors.primary[400]} /><Text style={styles.cardLabel}>LATEST HEART RATE</Text></View>
            <Text style={styles.count}>{formatReadingValue(latestCheckIn?.readings.heartRateBpm ?? null, 'bpm', 0)}</Text>
            <Text style={styles.muted}>{latestCheckIn ? formatTimestamp(latestCheckIn.recordedAt) : 'No check-in recorded'}</Text>
          </Pressable>
        </GridItem>
        <GridItem>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.summaryCard}>
            <View style={styles.summaryHeading}><Moon size={18} color={colors.primary[400]} /><Text style={styles.cardLabel}>SLEEP</Text></View>
            <Text style={styles.count}>{formatReadingValue(latestCheckIn?.readings.sleepHours ?? null, 'h', 1)}</Text>
            <Text style={styles.muted}>{latestCheckIn ? 'Latest recorded check-in' : 'No check-in recorded'}</Text>
          </Pressable>
        </GridItem>
        <GridItem>
          <Panel title="Assessment summary">
            <Text style={styles.assessmentText}>{assessment?.explanation.possibleInterpretation ?? 'Save a check-in to see its comparison with the synthetic baseline.'}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/dashboard')} style={styles.link}>
              <Text style={styles.linkText}>Open dashboard</Text><ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>
        <GridItem>
          <Panel title="Queued reports">
            <View style={styles.summaryHeading}><ClipboardList size={18} color={colors.primary[400]} /><Text style={styles.count}>{reports.length}</Text></View>
            <Text style={styles.muted}>{reports.length === 1 ? 'report awaiting delivery' : 'reports awaiting delivery'}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.navigate('/delivery')} style={styles.link}>
              <Text style={styles.linkText}>Open delivery</Text><ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>
        <GridItem wide>
          <Panel title="Latest check-in">
            {latestCheckIn ? (
              <View style={styles.block}>
                <Text style={styles.muted}>{`Recorded ${formatTimestamp(latestCheckIn.recordedAt)} · ${latestCheckIn.id}`}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{`Mood ${latestCheckIn.readings.mood ?? 'not recorded'} / 5`}</Text>
                  <Text style={styles.summaryValue}>{`Stress ${latestCheckIn.readings.stress ?? 'not recorded'} / 5`}</Text>
                  <Text style={styles.summaryValue}>{`Temperature ${formatReadingValue(latestCheckIn.readings.temperatureC, '°C', 1)}`}</Text>
                </View>
                <StatusPill label={storageDescription.includes('IndexedDB') ? 'Saved locally' : 'Session-only storage'} tone="primary" />
              </View>
            ) : <EmptyState title="No check-in saved yet" body="Save a check-in to see current readings and assessment." />}
            <PrimaryButton label="Start check-in" onPress={() => router.navigate('/check-in')} />
          </Panel>
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 40,
    lineHeight: 48,
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
