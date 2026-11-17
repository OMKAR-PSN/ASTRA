import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import type { KnowledgeDiagram as KnowledgeDiagramVariant } from '@/lib/knowledge/types';

type Props = { variant: KnowledgeDiagramVariant };

function BaselineDiagram() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Illustration: a fictional baseline of 72 beats per minute and a reading of 81 beats per minute, which is 9 beats higher." style={styles.wrap}>
      <Text style={styles.eyebrow}>FICTIONAL EXAMPLE</Text>
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>Baseline</Text>
        <View style={styles.track}>
          <View style={[styles.fill, styles.fillBaseline, { width: '72%' }]} />
        </View>
        <Text style={styles.barValue}>72 bpm</Text>
      </View>
      <View style={styles.barRow}>
        <Text style={styles.barLabel}>Reading</Text>
        <View style={styles.track}>
          <View style={[styles.fill, styles.fillReading, { width: '81%' }]} />
        </View>
        <Text style={[styles.barValue, { color: colors.accent[400] }]}>81 bpm</Text>
      </View>
      <Text style={styles.caption}>+9 bpm. Bars illustrate the example only; they are not a clinical scale.</Text>
    </View>
  );
}

function PercentageDiagram() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Illustration: the calculation 81 minus 72 equals 9 beats per minute, then 9 divided by 72 times 100 equals 12.5 percent." style={styles.wrap}>
      <Text style={styles.eyebrow}>THE CALCULATION</Text>
      <View style={styles.stepRow}>
        <Text style={styles.stepIndex}>1</Text>
        <Text style={styles.stepText}>81 − 72 = 9 bpm</Text>
      </View>
      <View style={styles.stepRow}>
        <Text style={styles.stepIndex}>2</Text>
        <Text style={styles.stepText}>9 ÷ 72 × 100 = 12.5%</Text>
      </View>
      <View style={styles.stepRow}>
        <Text style={styles.stepIndex}>3</Text>
        <Text style={styles.stepText}>12.5% is above the 10% demonstration rule</Text>
      </View>
      <Text style={styles.caption}>Absolute change and percentage change are both shown so the arithmetic stays visible.</Text>
    </View>
  );
}

function TimelineDiagram() {
  const slots = [
    { label: 'Day 1', value: 'Recorded', filled: true },
    { label: 'Day 2', value: 'No entry', filled: false },
    { label: 'Day 3', value: 'No entry', filled: false },
    { label: 'Day 4', value: 'Recorded', filled: true },
  ];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Illustration: four days in a record. Days one and four have entries; days two and three have no entry and remain empty." style={styles.wrap}>
      <Text style={styles.eyebrow}>A RECORD WITH GAPS</Text>
      <View style={styles.timeline}>
        {slots.map((slot) => (
          <View key={slot.label} style={styles.slot}>
            <View style={[styles.slotDot, slot.filled ? styles.slotDotFilled : styles.slotDotEmpty]} />
            <Text style={styles.slotLabel}>{slot.label}</Text>
            <Text style={[styles.slotValue, !slot.filled && styles.slotValueEmpty]}>{slot.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>An empty day stays empty. The app does not fill gaps with averages, previous readings or guesses.</Text>
    </View>
  );
}

export function KnowledgeDiagram({ variant }: Props) {
  if (variant === 'percentage') return <PercentageDiagram />;
  if (variant === 'timeline') return <TimelineDiagram />;
  return <BaselineDiagram />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: stitch.glassInset,
  },
  eyebrow: { ...typography.label, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.primary[300] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, color: colors.slate[400], width: 58 },
  track: { flex: 1, height: 10, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  fillBaseline: { backgroundColor: 'rgba(121, 180, 255, 0.55)' },
  fillReading: { backgroundColor: colors.accent[400] },
  barValue: { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 15, color: colors.slate[200], width: 54, textAlign: 'right' },
  caption: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 20,
    color: colors.primary.ink,
    backgroundColor: colors.primary[300],
    overflow: 'hidden',
  },
  stepText: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.slate[200], flexShrink: 1 },
  timeline: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, alignItems: 'center', gap: 4, minWidth: 0 },
  slotDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  slotDotFilled: { backgroundColor: colors.primary[400], borderColor: colors.primary[300] },
  slotDotEmpty: { backgroundColor: 'transparent', borderColor: colors.slate[500], borderStyle: 'dashed' },
  slotLabel: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, color: colors.slate[500] },
  slotValue: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 13, color: colors.primary[300], textAlign: 'center' },
  slotValueEmpty: { fontFamily: fonts.regular, color: colors.slate[500] },
});
