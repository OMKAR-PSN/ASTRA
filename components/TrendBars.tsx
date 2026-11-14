import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { CheckIn } from '@/types/astra';

type TrendBarsProps = {
  title: string;
  unit: string;
  decimals: number;
  baseline: number;
  checkIns: CheckIn[];
  read: (checkIn: CheckIn) => number | null;
};

const MAX_BARS = 7;

export function TrendBars({ title, unit, decimals, baseline, checkIns, read }: TrendBarsProps) {
  const points = checkIns.slice(-MAX_BARS).map((checkIn) => ({ id: checkIn.id, value: read(checkIn) }));
  const values = points.map((point) => point.value).filter((value): value is number => value !== null);
  const scaleMax = Math.max(baseline, ...values) * 1.1;

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.baseline}>{`Baseline ${baseline.toFixed(decimals)} ${unit}`}</Text>
      </View>
      {points.length === 0 ? (
        <Text style={styles.empty}>No check-ins yet. Save a demo check-in to see this trend.</Text>
      ) : (
        <View style={styles.chart} accessibilityLabel={`${title} trend, ${points.length} check-ins`}>
          <View style={[styles.baselineLine, { bottom: `${(baseline / scaleMax) * 100}%` }]} />
          {points.map((point) => (
            <View key={point.id} style={styles.column}>
              <Text style={styles.barValue}>
                {point.value === null ? 'Missing' : point.value.toFixed(decimals)}
              </Text>
              <View style={styles.barTrack}>
                {point.value === null ? (
                  <View style={styles.missingMarker} />
                ) : (
                  <View
                    style={[
                      styles.bar,
                      { height: `${(point.value / scaleMax) * 100}%` },
                    ]}
                  />
                )}
              </View>
              <Text style={styles.barLabel}>{point.id.slice(-3)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.xs / 2,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.offWhite,
  },
  baseline: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
  empty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate[300],
    paddingVertical: spacing.sm,
  },
  chart: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs / 2,
    paddingTop: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.navy[600],
  },
  baselineLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.secondary[400],
    borderStyle: 'dashed',
  },
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barValue: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.slate[200],
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: 36,
    minHeight: 4,
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
    backgroundColor: colors.primary[400],
  },
  missingMarker: {
    width: '70%',
    maxWidth: 36,
    height: 2,
    backgroundColor: colors.slate[400],
  },
  barLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate[300],
  },
});
