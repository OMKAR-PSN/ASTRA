import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { MetricTile } from '@/components/MetricTile';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { ComparisonTable } from '@/components/ComparisonTable';
import { StatusPill, deliveryStatusDisplay } from '@/components/StatusPill';
import { colors, fonts, spacing } from '@/constants/theme';
import { formatTimestamp } from '@/lib/format';
import { buildReadingTiles } from '@/lib/readingTiles';
import { createReportSnapshot } from '@/lib/snapshot';
import { useSession } from '@/state/SessionProvider';

export default function ReportPreviewScreen() {
  const router = useRouter();
  const { latestCheckIn, findReportForCheckIn, confirmReport } = useSession();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmedMessage, setConfirmedMessage] = useState(false);

  const queued = latestCheckIn ? findReportForCheckIn(latestCheckIn.id) : undefined;
  const snapshot = useMemo(() => {
    if (queued) return queued.snapshot;
    return latestCheckIn ? createReportSnapshot(latestCheckIn) : null;
  }, [queued, latestCheckIn]);

  if (!latestCheckIn || !snapshot) {
    return (
      <ScreenContainer title="Report Preview" subtitle="Review a check-in before it is queued.">
        <Panel>
          <EmptyState
            title="No check-in to report"
            body="Save a check-in first, then come back here to review the report."
            action={<PrimaryButton label="Go to Check-in" onPress={() => router.navigate('/check-in')} />}
          />
        </Panel>
      </ScreenContainer>
    );
  }

  const display = deliveryStatusDisplay.queued;

  return (
    <ScreenContainer
      title="Report Preview"
      subtitle="Review the values below. Confirming adds one report to the outbox. Nothing is sent from this screen."
    >
      <Grid>
        <GridItem wide>
          <Panel title="Report">
            {queued ? (
              <View style={styles.identityRow}>
                <Text style={styles.reportId}>{queued.id}</Text>
                <StatusPill label={display.label} tone={display.tone} Icon={display.Icon} />
              </View>
            ) : (
              <Text style={styles.muted}>Not queued yet. Confirming creates one report ID for this check-in.</Text>
            )}
            <View style={styles.meta}>
              <Text style={styles.metaLine}>{`${snapshot.crew.name} · ${snapshot.crew.role}`}</Text>
              <Text style={styles.metaLine}>{`${snapshot.crew.missionName} · Day ${snapshot.crew.missionDay}`}</Text>
              <Text style={styles.metaLine}>{`Check-in ${snapshot.checkIn.id} · ${formatTimestamp(
                snapshot.checkIn.recordedAt,
              )}`}</Text>
            </View>
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Recorded values">
            <View style={styles.tiles}>
              {buildReadingTiles(snapshot.checkIn.readings).map((tile) => (
                <MetricTile key={tile.label} label={tile.label} value={tile.value} unit={tile.unit} />
              ))}
            </View>
            <Text style={styles.listLabel}>Symptoms</Text>
            <Text style={styles.body}>
              {snapshot.checkIn.symptoms.length > 0 ? snapshot.checkIn.symptoms.join(', ') : 'None selected'}
            </Text>
            <Text style={styles.listLabel}>Activity note</Text>
            <Text style={styles.body}>{snapshot.checkIn.activityNote || 'No note added'}</Text>
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Baseline comparison">
            <ComparisonTable comparisons={snapshot.comparisons} />
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title="Explanation">
            <ExplanationPanel explanation={snapshot.explanation} />
          </Panel>
        </GridItem>

        <GridItem wide>
          {queued ? (
            <View style={styles.actions}>
              <Text style={styles.muted}>
                This report is a read-only snapshot. It was created when you confirmed the check-in.
              </Text>
              <PrimaryButton
                label={`Already queued as ${queued.id}`}
                disabled
                onPress={() => undefined}
              />
              <PrimaryButton
                label="View in Delivery"
                variant="secondary"
                onPress={() => router.navigate('/delivery')}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <PrimaryButton
                label={confirming ? 'Saving report…' : 'Confirm and queue'}
                disabled={confirming}
                onPress={async () => {
                  setConfirming(true);
                  setConfirmError(null);
                  try {
                    await confirmReport(latestCheckIn.id);
                    setConfirmedMessage(true);
                  } catch {
                    setConfirmError('Could not save this report to offline storage. Please try again.');
                  } finally {
                    setConfirming(false);
                  }
                }}
                accessibilityHint="Creates one queued report. It is not delivered in this prototype."
              />
              {confirmedMessage ? <Text style={styles.muted}>Report saved to the offline outbox. It has not been delivered.</Text> : null}
              {confirmError ? <Text accessibilityRole="alert" style={styles.muted}>{confirmError}</Text> : null}
            </View>
          )}
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  reportId: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate[300],
  },
  meta: {
    gap: spacing.xs / 2,
  },
  metaLine: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate[200],
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  listLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary[300],
    marginTop: spacing.xs / 2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.offWhite,
  },
  actions: {
    gap: spacing.xs,
  },
});
