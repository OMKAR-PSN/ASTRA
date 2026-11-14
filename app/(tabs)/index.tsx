import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LinkIndicator, StatusPill } from '@/components/StatusPill';
import { colors, fonts, spacing } from '@/constants/theme';
import { crewProfile } from '@/fixtures/crew';
import { formatTimestamp } from '@/lib/format';
import { useSession } from '@/state/SessionProvider';

export default function MissionHomeScreen() {
  const router = useRouter();
  const { latestCheckIn, reports, linkAvailable } = useSession();

  return (
    <ScreenContainer
      title="Mission Home"
      subtitle={`${crewProfile.name} · ${crewProfile.missionName} · Day ${crewProfile.missionDay}`}
    >
      <Grid>
        <GridItem>
          <Panel title="Crew and link">
            <View style={styles.block}>
              <Text style={styles.name}>{crewProfile.name}</Text>
              <Text style={styles.muted}>{crewProfile.role}</Text>
              <Text style={styles.muted}>{crewProfile.missionName}</Text>
            </View>
            <LinkIndicator available={linkAvailable} />
          </Panel>
        </GridItem>

        <GridItem>
          <Panel title="Outbox">
            <Text style={styles.count}>{reports.length}</Text>
            <Text style={styles.muted}>
              {reports.length === 1 ? 'report in this demo session' : 'reports in this demo session'}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.navigate('/delivery')}
              style={({ pressed, hovered }) => [styles.link, (hovered || pressed) && styles.linkActive]}
            >
              <Text style={styles.linkText}>View delivery</Text>
              <ChevronRight size={18} color={colors.primary[400]} />
            </Pressable>
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Latest check-in">
            {latestCheckIn ? (
              <View style={styles.block}>
                <Text style={styles.muted}>{formatTimestamp(latestCheckIn.recordedAt)}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>
                    {latestCheckIn.readings.heartRateBpm === null
                      ? 'Heart rate not recorded'
                      : `${latestCheckIn.readings.heartRateBpm} bpm heart rate`}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {latestCheckIn.readings.sleepHours === null
                      ? 'Sleep not recorded'
                      : `${latestCheckIn.readings.sleepHours} h sleep`}
                  </Text>
                </View>
                <StatusPill label="Saved for this demo session" tone="primary" />
              </View>
            ) : (
              <EmptyState
                title="No check-in saved yet"
                body="Save a demo check-in to see the latest readings here."
              />
            )}
            <PrimaryButton label="Start check-in" onPress={() => router.navigate('/check-in')} />
          </Panel>
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
