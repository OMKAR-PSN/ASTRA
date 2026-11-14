import { StyleSheet, Switch, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { LinkIndicator } from '@/components/StatusPill';
import { OutboxItem } from '@/components/OutboxItem';
import { Panel } from '@/components/Panel';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, fonts, spacing } from '@/constants/theme';
import { useSession } from '@/state/SessionProvider';

export default function DeliveryScreen() {
  const { reports, linkAvailable, setLinkAvailable, retryReport, storageDescription } = useSession();

  return (
    <ScreenContainer
      title="Delivery"
      subtitle="Outbox for this demo session. Reports stay queued until a verified ground receiver confirms receipt."
    >
      <Text style={styles.footnote}>{storageDescription}</Text>
      <Grid>
        <GridItem>
          <Panel title="Simulated link">
            <LinkIndicator available={linkAvailable} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Simulate communications outage</Text>
                <Text style={styles.toggleHint}>
                  {"Demo control. Changing the link only updates this indicator. It never changes a report's status."}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Simulate communications outage"
                value={!linkAvailable}
                onValueChange={(outage) => setLinkAvailable(!outage)}
                trackColor={{ false: colors.navy[600], true: colors.accent[400] }}
                thumbColor={colors.offWhite}
              />
            </View>
          </Panel>
        </GridItem>

        <GridItem wide>
          <Panel title={`Outbox · ${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`}>
            {reports.length === 0 ? (
              <EmptyState
                title="Nothing queued yet"
                body="Confirm a report on the Report Preview screen to add it to the outbox."
              />
            ) : (
              <View style={styles.list}>
                {reports.map((report) => (
                  <OutboxItem key={report.id} report={report} onRetry={retryReport} />
                ))}
              </View>
            )}
            <Text style={styles.footnote}>
              Prototype only. No receiver is connected, so no report can be marked delivered here.
            </Text>
          </Panel>
        </GridItem>
      </Grid>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.navy[600],
  },
  toggleText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  toggleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.offWhite,
  },
  toggleHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
  list: {
    gap: spacing.xs,
  },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
});
