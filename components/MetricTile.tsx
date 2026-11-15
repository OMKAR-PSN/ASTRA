import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { ReadingStatus } from '@/lib/readingTiles';
import { formatTimestamp } from '@/lib/format';

const statusStyles = {
  baseline: { label: 'Near demo baseline', color: colors.success[400] },
  difference: { label: 'Differs from demo baseline', color: colors.accent[400] },
  recorded: { label: 'Recorded', color: colors.secondary[400] },
  missing: { label: 'Missing reading', color: colors.slate[300] },
};

type MetricTileProps = {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  status?: ReadingStatus;
  measuredAt?: string;
};

export function MetricTile({ label, value, unit, sublabel, status, measuredAt }: MetricTileProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const missing = value === 'Not recorded';
  const indicator = status ? statusStyles[status] : undefined;
  return (
    <View style={[styles.tile, indicator && { borderLeftWidth: 3, borderLeftColor: indicator.color }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, missing && styles.missing]}>{value}</Text>
        {unit && !missing ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      {measuredAt ? <Text style={styles.sublabel}>{formatTimestamp(measuredAt)} · Manual / synthetic</Text> : null}
      {measuredAt && !missing && now - Date.parse(measuredAt) > 86400000 ? <Text style={[styles.sublabel, { color: colors.accent[400] }]}>Older than 24 h · demo freshness rule</Text> : null}
      {indicator && !missing ? <Text style={[styles.sublabel, { color: indicator.color }]}>{indicator.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: 140,
    flexGrow: 1,
    gap: spacing.xs / 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.navy[900],
    borderWidth: 1,
    borderColor: colors.navy[600],
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs / 2,
    flexWrap: 'wrap',
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  missing: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.slate[300],
  },
  unit: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate[300],
  },
  sublabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
});
