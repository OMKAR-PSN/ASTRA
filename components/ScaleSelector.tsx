import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';

type ScaleSelectorProps = {
  label: string;
  hint: string;
  value: number | null;
  error?: string;
  anchors?: readonly string[];
  onChange: (value: number | null) => void;
};

const scaleValues = [1, 2, 3, 4, 5];

export function ScaleSelector({ label, hint, value, error, anchors, onChange }: ScaleSelectorProps) {
  const [focused, setFocused] = useState<number | null>(null);
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueTag}>{value === null ? 'NOT SET' : `${value} / 5`}</Text>
      </View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {scaleValues.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`${label} ${option} of 5`}
              accessibilityHint={anchors?.[option - 1]}
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : option)}
              onFocus={() => setFocused(option)}
              onBlur={() => setFocused((current) => (current === option ? null : current))}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.option,
                selected && styles.optionSelected,
                (hovered || pressed) && !selected && styles.optionHover,
                focused === option && styles.optionFocused,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : (
        <Text style={styles.hint}>
          {anchors && value !== null ? `${anchors[value - 1]} anchor · tap ${value} again to clear` : hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
    flexBasis: 240,
    flexGrow: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    ...typography.label,
    color: colors.slate[200],
  },
  valueTag: {
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.5,
    color: colors.slate[500],
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
  },
  optionSelected: {
    borderColor: stitch.glassBorderStrong,
    backgroundColor: stitch.cyanMuted,
  },
  optionHover: {
    backgroundColor: 'rgba(30, 50, 71, 0.7)',
  },
  optionFocused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  optionText: {
    fontFamily: fonts.mono,
    fontSize: 17,
    lineHeight: 22,
    color: colors.slate[200],
    fontVariant: ['tabular-nums'],
  },
  optionTextSelected: {
    color: colors.primary[300],
    fontFamily: fonts.semibold,
  },
  hint: {
    ...typography.meta,
    color: colors.slate[500],
  },
  error: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.error[400],
  },
});
