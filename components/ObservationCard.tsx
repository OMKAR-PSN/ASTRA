import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/Surface';
import { StatusPill } from '@/components/StatusPill';
import { colors, fonts, type as typography } from '@/constants/theme';
import { formatTimestamp } from '@/lib/format';
import type { ReadingStatus } from '@/lib/readingTiles';

type Props = {
  label: string;
  value: string;
  unit?: string;
  baseline?: string;
  delta?: string;
  deltaTone?: 'neutral' | 'success' | 'accent';
  context?: string;
  status: ReadingStatus;
  measuredAt?: string;
  Icon: LucideIcon;
};

const statusDisplay: Record<ReadingStatus, { label: string; tone: 'primary' | 'accent' | 'success' | 'neutral' }> = {
  baseline: { label: 'Within baseline', tone: 'success' },
  difference: { label: 'Review · Demo rule', tone: 'accent' },
  recorded: { label: 'Recorded', tone: 'primary' },
  missing: { label: 'Not recorded', tone: 'neutral' },
};

export function ObservationCard({ label, value, unit, baseline, delta, deltaTone = 'neutral', context, status, measuredAt, Icon }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const stale = measuredAt && now - Date.parse(measuredAt) > 86400000;
  const compactValue = status === 'missing' || value.length > 7;
  const display = statusDisplay[status];
  const deltaColor = deltaTone === 'success' ? colors.success[400] : deltaTone === 'accent' ? colors.accent[400] : colors.slate[300];

  return (
    <Surface tone="panel" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={styles.labelRow}>
            <Icon size={14} color={colors.primary[400]} strokeWidth={2} />
            <Text style={styles.label}>{label}</Text>
          </View>
          <Text style={styles.timestamp} numberOfLines={1}>{measuredAt ? `Logged · ${formatTimestamp(measuredAt)}` : 'Awaiting first observation'}</Text>
        </View>
        <StatusPill label={display.label} tone={display.tone} />
      </View>

      <View style={styles.readingRow}>
        <Text style={[styles.value, compactValue && styles.compactValue]}>{value}</Text>
        {unit && status !== 'missing' ? <Text style={styles.unit}>{unit}</Text> : null}
        {delta ? <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>{delta}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>{context ?? 'Manual entry · Synthetic demo'}</Text>
        <Text style={styles.footerStrong} numberOfLines={1}>{baseline ? `Baseline ${baseline}` : 'Self-reported 1–5 scale'}</Text>
      </View>
      {stale ? <Text style={styles.warning}>Older than 24 h · Demo freshness rule</Text> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 12, minHeight: 184, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titleBlock: { gap: 3, flexShrink: 1, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...typography.label, color: colors.slate[200], flexShrink: 1 },
  timestamp: { ...typography.meta, color: colors.slate[500] },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 7 },
  value: { ...typography.numeral, color: colors.offWhite },
  compactValue: { ...typography.numeralSmall, color: colors.offWhite },
  unit: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: colors.slate[500], letterSpacing: 0.4, textTransform: 'uppercase' },
  delta: { marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 10, lineHeight: 15 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.navy[600],
    paddingTop: 10,
  },
  footerText: { ...typography.monoSmall, color: colors.slate[400], flexShrink: 1 },
  footerStrong: { ...typography.monoSmall, color: colors.slate[300] },
  warning: { ...typography.meta, color: colors.accent[400] },
});
