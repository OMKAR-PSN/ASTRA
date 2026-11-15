import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusPill, deliveryStatusDisplay } from '@/components/StatusPill';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { formatTimestamp } from '@/lib/format';
import type { ReportRecord } from '@/types/astra';

type OutboxItemProps = {
  report: ReportRecord;
  onRetry: (reportId: string) => void;
};

export function OutboxItem({ report, onRetry }: OutboxItemProps) {
  const router = useRouter();
  const display = deliveryStatusDisplay[report.status];
  const steps = [
    { label: 'Saved locally', complete: true, active: false },
    { label: 'Queued', complete: true, active: report.status === 'queued' },
    { label: report.status === 'failed' ? 'Retry required' : 'Sending', complete: report.status === 'acknowledged', active: report.status === 'sending' || report.status === 'failed' },
    { label: 'Acknowledged', complete: report.status === 'acknowledged', active: false },
  ];
  return (
    <View style={styles.item}>
      <View style={styles.headerRow}>
        <Text style={styles.reportId}>{report.id}</Text>
        <StatusPill label={display.label} tone={display.tone} Icon={display.Icon} />
      </View>
      <Text style={styles.meta}>
        {`Check-in ${report.checkInId} · Created ${formatTimestamp(report.createdAt)}`}
      </Text>
      <View style={styles.timeline} accessibilityLabel="Report delivery timeline">
        {steps.map((step) => (
          <View key={step.label} style={styles.step}>
            <Text style={[styles.marker, step.complete && styles.complete, step.active && styles.active]}>{step.complete ? '✓' : step.active ? '●' : '○'}</Text>
            <Text style={styles.meta}>{step.label}</Text>
          </View>
        ))}
      </View>
      {report.receipt ? (
        <Text style={styles.meta}>
          {`Received ${formatTimestamp(report.receipt.receivedAt)} · Reference ${report.receipt.receiverReference}`}
        </Text>
      ) : null}
      {report.retryNote ? <Text style={styles.note}>{report.retryNote}</Text> : null}
      <PrimaryButton label="View report snapshot" variant="secondary"
        onPress={() => router.push({ pathname: '/report', params: { reportId: report.id } })} />
      {report.status === 'queued' || report.status === 'failed' ? (
        <PrimaryButton
          label={report.status === 'failed' ? 'Retry delivery' : 'Send report'}
          variant="secondary"
          onPress={() => onRetry(report.id)}
          accessibilityHint={`Attempts to send ${report.id}.`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderColor: colors.navy[600] },
  step: { flexBasis: 95, flexGrow: 1, gap: 4 },
  marker: { color: colors.slate[400], fontSize: 20 },
  complete: { color: colors.success[400] },
  active: { color: colors.accent[400] },
  item: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.navy[600],
    backgroundColor: colors.navy[900],
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportId: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate[300],
  },
  note: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.accent[400],
  },
});
