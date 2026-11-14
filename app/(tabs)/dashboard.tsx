import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ComparisonTable } from '@/components/ComparisonTable';
import { EmptyState } from '@/components/EmptyState';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { Grid, GridItem } from '@/components/Grid';
import { MetricTile } from '@/components/MetricTile';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { TrendBars } from '@/components/TrendBars';
import { colors, fonts, spacing } from '@/constants/theme';
import { syntheticBaseline } from '@/fixtures/crew';
import { formatReadingValue, formatTimestamp } from '@/lib/format';
import { buildReadingTiles } from '@/lib/readingTiles';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

const RECENT_LIMIT = 5;

export default function DashboardScreen() {
  const router = useRouter();
  const { latestCheckIn, checkIns } = useSession();

  const snapshot = useMemo(() => (latestCheckIn ? createReportSnapshot(latestCheckIn) : null), [latestCheckIn]);

  if (!latestCheckIn || !snapshot) {
    return (
      <ScreenContainer title="Dashboard" subtitle="Latest readings and trends appear after a check-in is saved.">
        <Panel>
          <EmptyState
            title="No readings to show"
            body="Save a demo check-in to see the latest readings, baseline comparison, and trends."
            action={<PrimaryButton label="Go to Check-in" onPress={() => router.navigate('/check-in')} />}
          />
        </Panel>
      </ScreenContainer>
    );
  }

  const recent = [...checkIns].reverse().slice(0, RECENT_LIMIT);

  return (
    <ScreenContainer
      title="Dashboard"
      subtitle={`Compared with your synthetic baseline of ${syntheticBaseline.heartRateBpm} bpm heart rate.`}
    >
      <Grid>
        <GridItem wide>
          <Panel title="Latest reading">
            <Text style={styles.timestamp}>{`Recorded ${formatTimestamp(latestCheckIn.recordedAt)} · ${latestCheckIn.id}`}</Text>
            <View style={styles.tiles}>
              {buildReadingTiles(latestCheckIn.readings).map((tile) => (
                <MetricTile
                  key={tile.label}
                  label={tile.label}
                  value={tile.value}
                  unit={tile.unit}
                />
              ))}
            </View>
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Baseline comparison">
            <ComparisonTable comparisons={snapshot.comparisons} />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel>
            <TrendBars
              title="Heart rate"
              unit="bpm"
              decimals={0}
              baseline={syntheticBaseline.heartRateBpm}
              checkIns={checkIns}
              read={(item) => item.readings.heartRateBpm}
            />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel>
            <TrendBars
              title="Sleep"
              unit="hours"
              decimals={1}
              baseline={syntheticBaseline.sleepHours}
              checkIns={checkIns}
              read={(item) => item.readings.sleepHours}
            />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel title="Explanation">
            <ExplanationPanel explanation={snapshot.explanation} />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel title="Recent check-ins">
            <View style={styles.history}>
              {recent.map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <Text style={styles.historyId}>{item.id}</Text>
                  <Text style={styles.historyMeta}>{formatTimestamp(item.recordedAt)}</Text>
                  <Text style={styles.historyMeta}>
                    {`HR ${formatReadingValue(item.readings.heartRateBpm, 'bpm', 0)}`}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {`Sleep ${formatReadingValue(item.readings.sleepHours, 'h', 1)}`}
                  </Text>
                </View>
              ))}
            </View>
          </Panel>
        </GridItem>

        <GridItem wide>
          <PrimaryButton
            label="Preview report"
            onPress={() => router.navigate('/report')}
            accessibilityHint="Opens the report preview for the latest check-in. Nothing is sent."
          />
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  timestamp: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate[300],
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  history: {
    gap: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.navy[600],
  },
  historyId: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.offWhite,
    minWidth: 64,
  },
  historyMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate[200],
    fontVariant: ['tabular-nums'],
  },
});
