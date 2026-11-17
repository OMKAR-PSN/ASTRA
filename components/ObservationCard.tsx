import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/Surface';
import { colors, fonts, type as typography } from '@/constants/theme';
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

const statusDisplay: Record<ReadingStatus, { label: string; color: string }> = {
  baseline: { label: 'Nominal', color: colors.success[400] },
  difference: { label: 'Review', color: colors.accent[400] },
  recorded: { label: 'Recorded', color: colors.secondary[400] },
  missing: { label: 'Missing', color: colors.slate[400] },
};

export function ObservationCard({ label, value, unit, baseline, delta, deltaTone = 'neutral', status, measuredAt, Icon }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const stale = measuredAt && now - Date.parse(measuredAt) > 86400000;
  const compactValue = status === 'missing' || value.length > 5;
  const display = statusDisplay[status];
  const deltaColor = deltaTone === 'success' ? colors.success[400] : deltaTone === 'accent' ? colors.accent[400] : colors.slate[300];

  return (
    <Surface variant="glass" tone="panel" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.icon}><Icon size={15} color={colors.primary[300]} strokeWidth={2} /></View>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
      </View>

      <View style={styles.readingRow}>
        <Text style={[styles.value, compactValue && styles.compactValue]} numberOfLines={1}>{value}</Text>
        {unit && status !== 'missing' ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {delta ? <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>{delta}</Text> : <Text style={styles.deltaPlaceholder}>No comparison</Text>}

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>{baseline ? `Base ${baseline}` : 'Self-report 1–5'}</Text>
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: display.color }]} />
          <Text style={[styles.statusText, { color: display.color }]}>{display.label}</Text>
        </View>
      </View>
      {stale ? <Text style={styles.warning}>Older than 24 h · demo rule</Text> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 8, minHeight: 152, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, minHeight: 30 },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.24)',
    backgroundColor: 'rgba(0, 214, 198, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodySmall, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.slate[200], flexShrink: 1, paddingTop: 5 },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5 },
  value: { ...typography.numeral, color: colors.offWhite },
  compactValue: { ...typography.numeralSmall, color: colors.offWhite },
  unit: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[500], letterSpacing: 0.3, textTransform: 'lowercase' },
  delta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, fontVariant: ['tabular-nums'] },
  deltaPlaceholder: { ...typography.meta, fontSize: 9.5, lineHeight: 14, color: colors.slate[500] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 7,
  },
  footerText: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, color: colors.slate[400], flexShrink: 1 },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12 },
  warning: { ...typography.meta, fontSize: 9, lineHeight: 13, color: colors.accent[400] },
});
