import { StyleSheet, Text, View } from 'react-native';

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
  const display = deliveryStatusDisplay[report.status];
  return (
    <View style={styles.item}>
      <View style={styles.headerRow}>
        <Text style={styles.reportId}>{report.id}</Text>
        <StatusPill label={display.label} tone={display.tone} Icon={display.Icon} />
      </View>
      <Text style={styles.meta}>
        {`Check-in ${report.checkInId} · Created ${formatTimestamp(report.createdAt)}`}
      </Text>
      {report.receipt ? (
        <Text style={styles.meta}>
          {`Received ${formatTimestamp(report.receipt.receivedAt)} · Reference ${report.receipt.receiverReference}`}
        </Text>
      ) : null}
      {report.retryNote ? <Text style={styles.note}>{report.retryNote}</Text> : null}
      {report.status === 'queued' ? (
        <PrimaryButton
          label="Retry delivery"
          variant="secondary"
          onPress={() => onRetry(report.id)}
          accessibilityHint={`Attempts to send ${report.id}. The report stays queued in this prototype.`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
