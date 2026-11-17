import { ArrowDown, ArrowUp, Equal } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, stitch } from '@/constants/theme';

type ComparisonBarProps = {
  baseline: number;
  observed: number;
  baselineText: string;
  observedText: string;
  differenceText: string;
  relativeText: string;
  review: boolean;
  zeroBaseline: boolean;
  thresholdPercent: number;
};

/** Two labelled lanes share one scale so baseline and observation never hide each other. */
export function ComparisonBar({
  baseline,
  observed,
  baselineText,
  observedText,
  differenceText,
  relativeText,
  review,
  zeroBaseline,
  thresholdPercent,
}: ComparisonBarProps) {
  const scaleMax = Math.max(Math.abs(baseline), Math.abs(observed), 1) * 1.12;
  const position = (value: number) => `${Math.min(96, Math.max(2, (Math.abs(value) / scaleMax) * 100))}%` as const;
  const change = observed - baseline;
  const equal = Math.abs(change) < 1e-9;
  const direction = equal ? 'Matches baseline' : change > 0 ? 'Higher than baseline' : 'Lower than baseline';
  const DirectionIcon = equal ? Equal : change > 0 ? ArrowUp : ArrowDown;
  const accent = equal ? colors.slate[300] : review ? colors.accent[400] : colors.primary[300];
  const summary = `Baseline ${baselineText}. Recorded ${observedText}. ${direction}${equal ? '' : `, ${differenceText}`}.`;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={summary}>
      <View style={styles.laneRow}>
        <Text style={styles.laneLabel}>Baseline</Text>
        <View style={styles.laneTrack}>
          <View style={styles.laneLine} />
          <View style={[styles.baselineMarker, { left: position(baseline) }]} />
        </View>
      </View>
      <View style={styles.laneRow}>
        <Text style={styles.laneLabel}>Recorded</Text>
        <View style={styles.laneTrack}>
          <View style={styles.laneLine} />
          <View style={[styles.observedMarker, { left: position(observed), borderColor: accent, backgroundColor: review ? stitch.amberMuted : stitch.cyanMuted }]} />
        </View>
      </View>
      <View style={styles.directionRow}>
        <DirectionIcon size={14} color={accent} strokeWidth={2.2} />
        <Text style={[styles.directionText, { color: accent }]}>
          {direction}{equal ? '' : ` · ${differenceText}`}
        </Text>
      </View>
      <Text style={styles.caption}>
        {zeroBaseline
          ? 'A percentage difference is undefined for a zero baseline.'
          : `Relative difference ${relativeText}. The prototype flags ${thresholdPercent}% or more.`}
        {' '}This bar shows relative position only, not a clinical range.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: stitch.glassInset,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  laneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  laneLabel: {
    width: 64,
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.slate[400],
  },
  laneTrack: { flex: 1, height: 16, justifyContent: 'center' },
  laneLine: { height: 2, borderRadius: 1, backgroundColor: 'rgba(166, 187, 208, 0.24)' },
  baselineMarker: {
    position: 'absolute',
    width: 3,
    height: 14,
    marginLeft: -1.5,
    borderRadius: 1.5,
    backgroundColor: colors.slate[300],
  },
  observedMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
  },
  directionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  directionText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.slate[400] },
});
