import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { colors, fonts, spacing } from '@/constants/theme';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import type { CheckIn } from '@/types/astra';

type TrendBarsProps = {
  title: string;
  unit: string;
  decimals: number;
  baseline: number;
  checkIns: CheckIn[];
  read: (checkIn: CheckIn) => number | null;
};

export function TrendBars({ title, unit, decimals, baseline, checkIns, read }: TrendBarsProps) {
  const [selection, setSelection] = useState<string | null>(null);
  const [width, setWidth] = useState(320);
  const points = [...checkIns].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)).slice(-20)
    .map((entry) => ({ ...entry, value: read(entry) }));
  const values = points.flatMap((point) => point.value !== null && Number.isFinite(point.value) ? [point.value] : []);
  const min = Math.min(baseline, ...values);
  const max = Math.max(baseline, ...values);
  const padding = Math.max((max - min) * 0.2, 1);
  const lower = Math.max(0, min - padding);
  const upper = max + padding;
  const left = 42;
  const right = Math.max(left + 80, width - 12);
  const top = 18;
  const bottom = 170;
  const firstTime = Date.parse(points[0]?.recordedAt ?? '');
  const lastTime = Date.parse(points.at(-1)?.recordedAt ?? '');
  const x = (index: number) => firstTime === lastTime
    ? left + (right - left) * (points.length === 1 ? 0.5 : index / (points.length - 1))
    : left + (Date.parse(points[index].recordedAt) - firstTime) / (lastTime - firstTime) * (right - left);
  const y = (value: number) => bottom - (value - lower) / (upper - lower) * (bottom - top);
  const selected = points.find((point) => point.id === selection) ?? points.at(-1);
  const review = (value: number | null) => value !== null && baseline !== 0
    && Math.abs((value - baseline) / baseline) * 100 >= DIFFERENCE_THRESHOLD_PERCENT;

  return (
    <View style={styles.wrapper} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{unit} · Latest {points.length} check-ins</Text>
      </View>
      {points.length === 0 ? <Text style={styles.meta}>Insufficient history. Save a check-in to start a trend.</Text> : (
        <>
          <Svg width="100%" height={196} accessible={false}>

            {[lower, (upper + lower) / 2, upper].map((tick) => (
              <Line key={tick} x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke={colors.navy[600]} />
            ))}
            {[lower, (upper + lower) / 2, upper].map((tick) => (
              <SvgText key={tick} x={left - 6} y={y(tick) + 4} textAnchor="end" fontSize={12} fill={colors.slate[300]}>{tick.toFixed(decimals)}</SvgText>
            ))}
            <Line x1={left} x2={right} y1={y(baseline)} y2={y(baseline)} stroke={colors.secondary[400]} strokeDasharray="5 4" />
            {points.map((point, index) => {
              const previous = points[index - 1];
              return point.value !== null && previous?.value != null ? (
                <Line key={point.id} x1={x(index - 1)} y1={y(previous.value)} x2={x(index)} y2={y(point.value)} stroke={colors.primary[400]} strokeWidth={2} />
              ) : null;
            })}
            {points.map((point, index) => point.value !== null ? (
              <Circle key={point.id} cx={x(index)} cy={y(point.value)} r={selected?.id === point.id ? 6 : 4}
                fill={review(point.value) ? colors.accent[400] : colors.primary[400]}
                onPress={() => setSelection(point.id)} />
            ) : null)}
            <SvgText x={left} y={192} fontSize={11} fill={colors.slate[300]}>{points[0].recordedAt.slice(5, 10) + ' ' + points[0].recordedAt.slice(11, 16)}</SvgText>
            <SvgText x={right} y={192} textAnchor="end" fontSize={11} fill={colors.slate[300]}>{points.at(-1)!.recordedAt.slice(5, 10) + ' ' + points.at(-1)!.recordedAt.slice(11, 16) + ' UTC'}</SvgText>
          </Svg>
          <Text style={styles.meta}>Dashed line · Synthetic baseline {baseline.toFixed(decimals)} {unit}. Gaps indicate missing readings.</Text>
          <View style={styles.selection} accessibilityLiveRegion="polite">
            <Text style={styles.selected}>{selected?.value == null ? 'Missing reading' : selected.value.toFixed(decimals) + ' ' + unit}{review(selected?.value ?? null) ? ' · Review suggested by demo rule' : ''}</Text>
            <Text style={styles.meta}>{selected ? formatTimestamp(selected.recordedAt) + ' · ' + selected.id : ''}</Text>
          </View>
          <View style={styles.points}>
            {points.map((point, index) => (
              <Pressable key={point.id} accessibilityRole="radio" aria-checked={selected?.id === point.id}
                accessibilityLabel={title + ', ' + formatTimestamp(point.recordedAt) + ', ' + (point.value ?? 'missing') + ' ' + unit}
                onPress={() => setSelection(point.id)} onHoverIn={() => setSelection(point.id)}
                style={[styles.point, selected?.id === point.id && styles.active]}>
                <Text style={styles.meta}>{index + 1}{point.value === null ? ' —' : review(point.value) ? ' △' : ''}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  heading: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 17, color: colors.offWhite },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.slate[300] },
  selection: { padding: 12, backgroundColor: colors.navy[900], borderRadius: 8, gap: 4 },
  selected: { fontFamily: fonts.semibold, fontSize: 15, color: colors.offWhite },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  point: { minHeight: 44, minWidth: 44, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.navy[600], borderRadius: 6 },
  active: { borderColor: colors.primary[400], backgroundColor: colors.navy[700] },
});
