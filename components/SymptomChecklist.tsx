import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type SymptomChecklistProps = {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export function SymptomChecklist({ options, selected, onChange }: SymptomChecklistProps) {
  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <View style={styles.list} accessibilityRole="list">
      {options.map((option) => {
        const checked = selected.includes(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="checkbox"
            accessibilityLabel={option}
            accessibilityState={{ checked }}
            onPress={() => toggle(option)}
            style={({ pressed, hovered }) => [
              styles.row,
              (hovered || pressed) && styles.rowHover,
            ]}
          >
            <View style={[styles.box, checked && styles.boxChecked]}>
              {checked ? <Check size={16} color={colors.primary.ink} strokeWidth={3} /> : null}
            </View>
            <Text style={styles.label}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.navy[600],
    backgroundColor: colors.navy[900],
  },
  rowHover: {
    backgroundColor: colors.navy[700],
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[400],
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.offWhite,
  },
});
