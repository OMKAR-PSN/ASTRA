import {
  Activity, ChevronDown, ChevronUp, CircleDashed, CircleEqual, CircleSlash, Clock3,
  Gauge, HeartPulse, Info, Moon, Smile, Thermometer, TriangleAlert,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComparisonBar } from '@/components/ComparisonBar';
import { StatusPill } from '@/components/StatusPill';
import { Surface } from '@/components/Surface';
import { colors, fonts, radius, stitch, type } from '@/constants/theme';
import type { AssessmentFinding, AssessmentStatus } from '@/lib/assessment';
import type { Readings } from '@/types/astra';

const metricIcon: Record<keyof Readings, LucideIcon> = {
  heartRateBpm: HeartPulse,
  systolicMmHg: Activity,
  diastolicMmHg: Activity,
  temperatureC: Thermometer,
  sleepHours: Moon,
  mood: Smile,
  stress: Gauge,
};

const statusIcon: Record<AssessmentStatus, LucideIcon> = {
  review: TriangleAlert,
  'within-range': CircleEqual,
  'no-baseline': CircleSlash,
  missing: CircleDashed,
};

type AssessmentCardProps = {
  finding: AssessmentFinding;
  thresholdPercent: number;
};

export function AssessmentCard({ finding, thresholdPercent }: AssessmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const review = finding.status === 'review';
  const missing = finding.status === 'missing';
  const MetricIcon = metricIcon[finding.key];
  const StatusIcon = statusIcon[finding.status];
  const tone = review ? 'accent' : finding.status === 'within-range' ? 'primary' : 'neutral';
  const toggleLabel = review ? 'Why was this highlighted?' : 'Show the calculation';
  const rows: [string, string][] = [
    ['Current observation', finding.calculation.observed],
    ['Personal baseline', finding.calculation.baseline],
    ['Absolute difference', finding.calculation.difference],
    ['Percentage difference', finding.calculation.relative],
    ['Prototype threshold', finding.calculation.threshold],
    ['Source', finding.calculation.source],
    ['Recorded time', finding.calculation.recordedAt],
    ['Baseline provenance', finding.calculation.baselineSource],
  ];

  return (
    <Surface variant="glass" tone="panel" padded={false} style={[styles.card, review && styles.cardReview]}>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.metric}>
            <View style={[styles.metricIcon, review && styles.metricIconReview]}>
              <MetricIcon size={15} color={review ? colors.accent[400] : colors.primary[300]} strokeWidth={2} />
            </View>
            <Text style={styles.label}>{finding.label}</Text>
          </View>
          <StatusPill label={finding.statusLabel} tone={tone} Icon={StatusIcon} />
        </View>

        <View
          style={styles.valueRow}
          accessible
          accessibilityLabel={`${finding.label}: ${finding.observedText}. ${finding.statusLabel}.`}
        >
          {missing ? (
            <Text style={styles.missingValue}>Not measured</Text>
          ) : (
            <>
              <Text style={styles.value}>{finding.observedValue}</Text>
              <Text style={styles.unit}>{finding.unit}</Text>
            </>
          )}
        </View>

        <View style={styles.baselineRow}>
          <Text style={styles.baselineLabel}>Personal baseline</Text>
          <Text style={styles.baselineValue}>{finding.baselineText}</Text>
        </View>

        <Text style={styles.headline}>{finding.headline}</Text>
        <Text style={styles.note}>{finding.note}</Text>

        {finding.staleNote ? (
          <View style={styles.staleRow}>
            <Clock3 size={13} color={colors.accent[400]} strokeWidth={2} />
            <Text style={styles.staleText}>{finding.staleNote}</Text>
          </View>
        ) : null}

        <View style={styles.timeRow}>
          <Clock3 size={11} color={colors.slate[500]} strokeWidth={2} />
          <Text style={styles.timeText}>{finding.recordedAtText} · {finding.ageText}</Text>
        </View>

        <Pressable
          nativeID={`calculation-toggle-${finding.key}`}
          onPress={() => setExpanded((current) => !current)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          aria-controls={`calculation-${finding.key}`}
          accessibilityLabel={`${expanded ? 'Hide the calculation' : toggleLabel.replace(/\?$/, '')} for ${finding.label}`}
          accessibilityHint="Shows how the comparison was calculated."
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        >
          <Text style={styles.toggleText}>{expanded ? 'Hide the calculation' : toggleLabel}</Text>
          {expanded
            ? <ChevronUp size={15} color={colors.primary[300]} strokeWidth={2.2} />
            : <ChevronDown size={15} color={colors.primary[300]} strokeWidth={2.2} />}
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.calculation} nativeID={`calculation-${finding.key}`}>
          {finding.hasBar && finding.observed !== null && finding.baseline !== null ? (
            <ComparisonBar
              baseline={finding.baseline}
              observed={finding.observed}
              baselineText={finding.baselineText}
              observedText={finding.observedText}
              differenceText={finding.calculation.difference}
              relativeText={finding.calculation.relative}
              review={review}
              zeroBaseline={finding.baseline === 0}
              thresholdPercent={thresholdPercent}
            />
          ) : null}
          <View style={styles.rows}>
            {rows.map(([name, value]) => (
              <View key={name} style={styles.detailRow}>
                <Text style={styles.detailName}>{name}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.formula}>
            <Text style={styles.formulaLabel}>Formula</Text>
            <Text style={styles.formulaText}>{finding.calculation.formula}</Text>
          </View>
          <View style={styles.ruleRow}>
            <Info size={13} color={colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.ruleText}>{finding.calculation.note}</Text>
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: 440, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  cardReview: { borderColor: 'rgba(242, 192, 120, 0.34)' },
  body: { padding: 18, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.24)',
    backgroundColor: stitch.cyanMuted,
  },
  metricIconReview: { borderColor: 'rgba(242, 192, 120, 0.3)', backgroundColor: stitch.amberMuted },
  label: { ...type.cardTitle, color: colors.offWhite },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  value: { ...type.numeral, color: colors.offWhite },
  unit: { ...type.mono, color: colors.slate[400] },
  missingValue: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 30, color: colors.slate[300] },
  baselineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  baselineLabel: { ...type.label, color: colors.slate[500] },
  baselineValue: { ...type.mono, color: colors.slate[300] },
  headline: { ...type.body, color: colors.slate[200] },
  note: { ...type.meta, color: colors.slate[400] },
  staleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(242, 192, 120, 0.28)',
    backgroundColor: stitch.amberMuted,
    borderRadius: radius.sm,
    padding: 9,
  },
  staleText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, color: colors.accent[400] },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { ...type.monoSmall, color: colors.slate[500] },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)',
    backgroundColor: stitch.cyanMuted,
  },
  togglePressed: { backgroundColor: 'rgba(0, 214, 198, 0.22)' },
  toggleText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1, color: colors.primary[300] },
  calculation: {
    gap: 12,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: stitch.glassBorder,
    backgroundColor: 'rgba(3, 12, 22, 0.45)',
  },
  rows: { gap: 0 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailName: { flexShrink: 0, width: 138, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.slate[500] },
  detailValue: { flex: 1, fontFamily: fonts.mono, fontSize: 11.5, lineHeight: 16, color: colors.slate[200], textAlign: 'right' },
  formula: { gap: 5, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: stitch.panelDeep, borderRadius: radius.sm, padding: 11 },
  formulaLabel: { ...type.label, color: colors.slate[500] },
  formulaText: { ...type.mono, color: colors.primary[300] },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  ruleText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
});
