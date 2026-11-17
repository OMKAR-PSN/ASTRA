import { useRouter } from 'expo-router';
import { useState } from 'react';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Grid, GridItem } from '@/components/Grid';
import { KnowledgeLink } from '@/components/KnowledgeLink';
import { LinkIndicator } from '@/components/StatusPill';
import { OutboxItem } from '@/components/OutboxItem';
import { Panel } from '@/components/Panel';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, fonts, spacing } from '@/constants/theme';
import { receiverUrl } from '@/lib/receiver';
import { useSession } from '@/state/SessionProvider';

export default function DeliveryScreen() {
  const router = useRouter();
  const { reports, linkAvailable, setLinkAvailable, retryReport, storageDescription, engagement, recordEngagement } = useSession();
  const [explained, setExplained] = useState(() => engagement.events.some((event) => event.kind === 'report-explained'));

  const revealExplanation = async () => {
    setExplained(true);
    await recordEngagement('report-explained');
  };

  return (
    <ScreenContainer
      title="Reports & sync"
      subtitle="Send synthetic reports to the simulated ground receiver."
    >
      <Text style={styles.footnote}>{storageDescription}</Text>
      <PrimaryButton label="Preview latest report" onPress={() => router.navigate('/report')} />
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

        <GridItem>
          <Panel title="How reports are managed">
            <Text style={styles.footnote}>Reports are created only when you confirm a report preview. Saving a check-in never queues or sends anything.</Text>
            {explained ? (
              <View accessibilityLiveRegion="polite" style={styles.explanation}>
                <Text style={styles.explanationText}>The outbox keeps each report and its delivery status on this device while the simulated link is unavailable.</Text>
                <Text style={styles.explanationText}>A report becomes acknowledged only after the simulated ground receiver confirms receipt. No acknowledgement is generated locally.</Text>
                <Text style={styles.explanationText}>Mission Wellness Journey milestones, check-in days, and learning progress are never included in reports or sent to the receiver.</Text>
                <Text style={styles.explanationStatus}>Report explanation reviewed.</Text>
              </View>
            ) : (
              <PrimaryButton label="Show report explanation" variant="secondary" onPress={() => { void revealExplanation(); }} />
            )}
            <View style={styles.knowledgeLinks}>
              <KnowledgeLink cardId="offline-report-queue" label="What does queued mean?" />
              <KnowledgeLink cardId="ground-acknowledgement" label="What a ground acknowledgement means" />
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
              {receiverUrl ? 'Acknowledgement appears after the simulated receiver confirms receipt.' : 'Ground receiver URL is not configured. Reports stay in the local outbox.'}
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
  explanation: { gap: spacing.xs, padding: spacing.sm, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.22)', backgroundColor: 'rgba(0, 214, 198, 0.06)' },
  explanationText: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.slate[200] },
  explanationStatus: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.success[400] },
  knowledgeLinks: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: colors.navy[600], paddingTop: spacing.xs },
});
