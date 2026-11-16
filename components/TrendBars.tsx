import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { colors, fonts, radius, spacing, stitch, type as typography } from '@/constants/theme';
import { DIFFERENCE_THRESHOLD_PERCENT } from '@/lib/comparison';
import { formatTimestamp } from '@/lib/format';
import { svgPress } from '@/lib/svgPress';
import type { CheckIn } from '@/types/astra';

type TrendBarsProps = {
  title: string;
  unit: string;
  decimals: number;
  baseline: number;
  checkIns: CheckIn[];
  read: (checkIn: CheckIn) => number | null;
  hideHeading?: boolean;
};

const CHART_HEIGHT = 228;
const TOOLTIP_WIDTH = 154;

const hasValue = (value: number | null | undefined): value is number => value != null && Number.isFinite(value);

export function TrendBars({ title, unit, decimals, baseline, checkIns, read, hideHeading = false }: TrendBarsProps) {
  const [selection, setSelection] = useState<string | null>(null);
  const [width, setWidth] = useState(320);
  const points = [...checkIns].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)).slice(-20)
    .map((entry) => ({ ...entry, value: read(entry) }));
  const values = points.flatMap((point) => hasValue(point.value) ? [point.value] : []);
  const min = Math.min(baseline, ...values);
  const max = Math.max(baseline, ...values);
  const padding = Math.max((max - min) * 0.22, 1);
  const lower = Math.max(0, min - padding);
  const upper = max + padding;
  const left = 42;
  const right = Math.max(left + 80, width - 14);
  const top = 22;
  const bottom = 178;
  const firstTime = Date.parse(points[0]?.recordedAt ?? '');
  const lastTime = Date.parse(points.at(-1)?.recordedAt ?? '');
  const x = (index: number) => firstTime === lastTime
    ? left + (right - left) * (points.length === 1 ? 0.5 : index / (points.length - 1))
    : left + (Date.parse(points[index].recordedAt) - firstTime) / (lastTime - firstTime) * (right - left);
  const y = (value: number) => bottom - (value - lower) / (upper - lower) * (bottom - top);
  const selectedIndex = selection ? points.findIndex((point) => point.id === selection) : points.length - 1;
  const selected = points[selectedIndex >= 0 ? selectedIndex : points.length - 1];
  const timeLabel = (iso: string) => {
    const date = new Date(iso);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getUTCDate())} ${pad(date.getUTCMonth() + 1)} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
  };
  const review = (value: number | null) => value !== null && baseline !== 0
    && Math.abs((value - baseline) / baseline) * 100 >= DIFFERENCE_THRESHOLD_PERCENT;
  const bandLower = baseline * (1 - DIFFERENCE_THRESHOLD_PERCENT / 100);
  const bandUpper = baseline * (1 + DIFFERENCE_THRESHOLD_PERCENT / 100);
  const runs = points.reduce<{ index: number; value: number }[][]>((all, point, index) => {
    if (!hasValue(point.value)) return all;
    const run = all.at(-1);
    const entry = { index, value: point.value };
    if (!run || run.at(-1)!.index !== index - 1) return [...all, [entry]];
    run.push(entry);
    return all;
  }, []);
  const areaPath = (run: { index: number; value: number }[]) => {
    if (run.length < 2) return '';
    const line = run.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
    return `${line} L${x(run.at(-1)!.index).toFixed(1)},${bottom} L${x(run[0].index).toFixed(1)},${bottom} Z`;
  };
  const tick = (value: number) => value.toFixed(decimals);
  const selectedX = selectedIndex >= 0 ? x(selectedIndex) : 0;
  const selectedY = selected?.value != null ? y(selected.value) : bottom;
  const tooltipLeft = Math.max(6, Math.min(width - TOOLTIP_WIDTH - 6, selectedX - TOOLTIP_WIDTH / 2));
  const tooltipTop = Math.max(2, selectedY - 64);
  const delta = selected?.value != null ? selected.value - baseline : null;
  const selectedReview = review(selected?.value ?? null);

  return (
    <View style={styles.wrapper} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {hideHeading ? null : <View style={styles.heading}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>Recorded observations vs synthetic baseline · {unit}</Text>
        </View>
        <Text style={styles.meta}>{points.length} logged</Text>
      </View>}

      {points.length === 0 ? <Text style={styles.meta}>Insufficient history. Save a check-in to start a trend.</Text> : (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={styles.legendLine} /><Text style={styles.legendText}>Logged observations</Text></View>
            <View style={styles.legendItem}><View style={styles.legendDash} /><Text style={styles.legendText}>Synthetic baseline</Text></View>
            <View style={styles.legendItem}><View style={styles.legendBand} /><Text style={styles.legendText}>Demo band</Text></View>
            <Text style={[styles.legendText, styles.units]}>UNITS: {unit.toUpperCase()}</Text>
          </View>

          <View style={[styles.canvas, { height: CHART_HEIGHT }]}>
            <Svg width="100%" height={CHART_HEIGHT}>
              <Defs>
                <SvgLinearGradient id={`area-${title.replaceAll(' ', '-')}`} x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0" stopColor={colors.primary[400]} stopOpacity="0.34" />
                  <Stop offset="0.65" stopColor={colors.primary[400]} stopOpacity="0.10" />
                  <Stop offset="1" stopColor={colors.primary[400]} stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>

              <Rect x={left} y={y(bandUpper)} width={Math.max(0, right - left)} height={Math.max(0, y(bandLower) - y(bandUpper))} fill="rgba(0, 214, 198, 0.05)" />
              <Line x1={left} x2={right} y1={y(bandUpper)} y2={y(bandUpper)} stroke="rgba(0, 214, 198, 0.25)" strokeDasharray="4 5" />
              <Line x1={left} x2={right} y1={y(bandLower)} y2={y(bandLower)} stroke="rgba(0, 214, 198, 0.25)" strokeDasharray="4 5" />
              {width > 430 ? <SvgText x={right - 4} y={y(bandUpper) - 5} textAnchor="end" fontSize={9} fill="rgba(0, 214, 198, 0.65)">{`DEMO BAND ${tick(bandLower)}–${tick(bandUpper)}`}</SvgText> : null}

              {[lower, (upper + lower) / 2, upper].map((value) => (
                <Line key={value} x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="rgba(40, 60, 80, 0.55)" strokeWidth={1} />
              ))}
              {[lower, (upper + lower) / 2, upper].map((value) => (
                <SvgText key={value} x={left - 8} y={y(value) + 3.5} textAnchor="end" fontSize={9} fill={colors.slate[500]}>{tick(value)}</SvgText>
              ))}

              <Line x1={left} x2={right} y1={y(baseline)} y2={y(baseline)} stroke={colors.secondary[400]} strokeDasharray="5 5" strokeOpacity={0.7} />

              {runs.filter((run) => run.length > 1).map((run) => <Path key={`area-${run[0].index}`} d={areaPath(run)} fill={`url(#area-${title.replaceAll(' ', '-')})`} />)}
              {points.map((point, index) => {
                const previous = points[index - 1];
                return hasValue(point.value) && hasValue(previous?.value) ? (
                  <Line key={point.id} x1={x(index - 1)} y1={y(previous.value)} x2={x(index)} y2={y(point.value)} stroke={colors.primary[400]} strokeWidth={2.2} strokeLinecap="round" />
                ) : null;
              })}
              {points.map((point, index) => hasValue(point.value) ? (
                <Circle key={point.id} cx={x(index)} cy={y(point.value)} r={selected?.id === point.id ? 5.5 : 3.6}
                  fill={review(point.value) ? colors.accent[400] : colors.primary[400]}
                  stroke="#091624" strokeWidth={2}
                  {...svgPress(() => setSelection(point.id))} />
              ) : null)}

              {points.length === 1 ? <SvgText x={(left + right) / 2} y={CHART_HEIGHT - 10} textAnchor="middle" fontSize={9} fill={colors.primary[400]}>{timeLabel(points[0].recordedAt)}</SvgText> : null}
              {points.length > 1 ? <SvgText x={left} y={CHART_HEIGHT - 10} fontSize={9} fill={colors.slate[500]}>{timeLabel(points[0].recordedAt)}</SvgText> : null}
              {points.length > 1 ? <SvgText x={right} y={CHART_HEIGHT - 10} textAnchor="end" fontSize={9} fill={colors.primary[400]}>{timeLabel(points.at(-1)!.recordedAt)}</SvgText> : null}
            </Svg>

            {selection && selected ? <View pointerEvents="none" style={[
              styles.tooltip,
              { left: tooltipLeft, top: tooltipTop },
              selectedReview && styles.tooltipReview,
            ]}>
              <Text style={[styles.tooltipTitle, selectedReview && { color: colors.accent[400] }]} numberOfLines={1}>
                {selected.value != null ? `${selected.value.toFixed(decimals)} ${unit}` : 'Missing reading'}
              </Text>
              <Text style={styles.tooltipMeta} numberOfLines={1}>
                {delta === null ? 'No recorded value' : `${delta > 0 ? '+' : ''}${delta.toFixed(decimals)} vs baseline`}
              </Text>
              <Text style={styles.tooltipMeta} numberOfLines={1}>{formatTimestamp(selected.recordedAt)}</Text>
            </View> : null}
          </View>

          <View style={styles.selection} accessibilityLiveRegion="polite">
            <Text style={styles.selected}>{selected?.value == null ? 'Missing reading' : selected.value.toFixed(decimals) + ' ' + unit}{selectedReview ? ' · Review suggested by demo rule' : ''}</Text>
            <Text style={styles.meta}>{selected ? formatTimestamp(selected.recordedAt) : ''}</Text>
          </View>

          <View style={styles.points}>
            {points.map((point, index) => (
              <Pressable key={point.id} accessibilityRole="radio" aria-checked={selected?.id === point.id}
                accessibilityLabel={title + ', ' + formatTimestamp(point.recordedAt) + ', ' + (point.value ?? 'missing') + ' ' + unit}
                onPress={() => setSelection(point.id)} onHoverIn={() => setSelection(point.id)} hitSlop={4}
                style={[styles.point, selected?.id === point.id && styles.active]}>
                <Text style={[styles.pointLabel, selected?.id === point.id && styles.pointLabelActive]}>{point.recordedAt.slice(8, 10)} {point.recordedAt.slice(5, 7)}</Text>
                <Text style={[styles.pointValue, review(point.value) && { color: colors.accent[400] }]}>{point.value === null ? '—' : point.value.toFixed(decimals)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' },
  title: { ...typography.cardTitle, color: colors.offWhite },
  meta: { ...typography.meta, color: colors.slate[400] },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, paddingVertical: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 14, height: 2, borderRadius: 1, backgroundColor: colors.primary[400] },
  legendDash: { width: 14, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.secondary[400] },
  legendBand: { width: 14, height: 7, borderRadius: 2, backgroundColor: 'rgba(0, 214, 198, 0.10)', borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.22)' },
  legendText: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[400] },
  units: { marginLeft: 'auto', color: colors.slate[500], letterSpacing: 0.6 },
  canvas: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.8)',
    backgroundColor: stitch.panelDeep,
    overflow: 'hidden',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    gap: 1,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.32)',
    backgroundColor: 'rgba(9, 29, 42, 0.92)',
  },
  tooltipReview: { borderColor: 'rgba(243, 193, 107, 0.45)', backgroundColor: 'rgba(58, 40, 16, 0.88)' },
  tooltipTitle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.offWhite },
  tooltipMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, color: colors.slate[300] },
  selection: { paddingTop: 2, gap: 1 },
  selected: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.offWhite },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 2 },
  point: { minHeight: 38, paddingVertical: 4, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(40, 60, 80, 0.8)', borderRadius: 6, backgroundColor: 'rgba(9, 29, 42, 0.45)' },
  active: { borderColor: 'rgba(0, 214, 198, 0.45)', backgroundColor: 'rgba(0, 214, 198, 0.10)' },
  pointLabel: { fontFamily: fonts.mono, fontSize: 8, lineHeight: 11, color: colors.slate[500] },
  pointLabelActive: { color: colors.primary[400] },
  pointValue: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 14, color: colors.slate[300], fontVariant: ['tabular-nums'] },
});
