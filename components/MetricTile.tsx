import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type MetricTileProps = {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
};

export function MetricTile({ label, value, unit, sublabel }: MetricTileProps) {
  const missing = value === 'Not recorded';
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, missing && styles.missing]}>{value}</Text>
        {unit && !missing ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: 150,
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
