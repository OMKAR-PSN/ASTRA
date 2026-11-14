import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { formatSigned } from '@/lib/comparison';
import type { MetricComparison } from '@/types/astra';

type ComparisonTableProps = {
  comparisons: MetricComparison[];
};

const columns = ['Metric', 'Baseline', 'Current', 'Change', 'Percent'];

export function ComparisonTable({ comparisons }: ComparisonTableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table} accessibilityRole="table">
        <View style={[styles.row, styles.headerRow]}>
          {columns.map((column, index) => (
            <Text key={column} style={[styles.cell, styles.headerCell, index === 0 && styles.metricCell]}>
              {column}
            </Text>
          ))}
        </View>
        {comparisons.map((item) => {
          const hasComparison = item.percentChange !== null;
          return (
            <View key={item.key} style={styles.row}>
              <Text style={[styles.cell, styles.metricCell, styles.metricLabel]}>{item.label}</Text>
              <Text style={styles.cell}>{`${item.baseline.toFixed(item.decimals)} ${item.unit}`}</Text>
              <Text style={styles.cell}>
                {item.current === null ? 'Not recorded' : `${item.current.toFixed(item.decimals)} ${item.unit}`}
              </Text>
              <Text style={styles.cell}>
                {hasComparison && item.change !== null
                  ? `${formatSigned(item.change, item.decimals)} ${item.unit}`
                  : 'Insufficient data'}
              </Text>
              <Text style={styles.cell}>
                {hasComparison && item.percentChange !== null
                  ? `${formatSigned(item.percentChange, 2)}%`
                  : 'Insufficient data'}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    minWidth: 560,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.navy[600],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.navy[600],
  },
  headerRow: {
    backgroundColor: colors.navy[700],
  },
  cell: {
    flex: 1,
    minWidth: 100,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  headerCell: {
    fontFamily: fonts.semibold,
    color: colors.slate[200],
  },
  metricCell: {
    minWidth: 150,
  },
  metricLabel: {
    fontFamily: fonts.semibold,
  },
});
