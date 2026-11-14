import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type ScaleSelectorProps = {
  label: string;
  hint: string;
  value: number | null;
  error?: string;
  onChange: (value: number | null) => void;
};

const scaleValues = [1, 2, 3, 4, 5];

export function ScaleSelector({ label, hint, value, error, onChange }: ScaleSelectorProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {scaleValues.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`${label} ${option} of 5`}
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? null : option)}
              style={({ pressed, hovered }) => [
                styles.option,
                selected && styles.optionSelected,
                (hovered || pressed) && !selected && styles.optionHover,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs / 2,
    flexBasis: 240,
    flexGrow: 1,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.offWhite,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.navy[600],
    backgroundColor: colors.navy[900],
  },
  optionSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.navy[700],
  },
  optionHover: {
    backgroundColor: colors.navy[700],
  },
  optionText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.slate[200],
  },
  optionTextSelected: {
    color: colors.primary[300],
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.slate[300],
  },
  error: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.error[400],
  },
});
