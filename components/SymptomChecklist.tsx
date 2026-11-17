import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';

type SymptomChecklistProps = {
  options: readonly string[];
  selected: string[];
  /** Explicit "No symptoms to report" state. Without it, an empty list keeps the legacy behavior. */
  noneSelected?: boolean;
  onChange: (next: string[]) => void;
  onNoneSelected?: () => void;
};

export function SymptomChecklist({ options, selected, noneSelected, onChange, onNoneSelected }: SymptomChecklistProps) {
  const [focused, setFocused] = useState<string | null>(null);
  const toggle = (option: string) => {
    if (option === 'None') {
      if (onNoneSelected) onNoneSelected();
      else onChange([]);
      return;
    }
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <View style={styles.list} accessibilityRole="list">
      {['None', ...options.filter((option) => option !== 'None')].map((option) => {
        const checked = option === 'None'
          ? (onNoneSelected ? Boolean(noneSelected) : selected.length === 0)
          : selected.includes(option);
        return (
          <Pressable
            key={option}
            accessibilityRole="checkbox"
            accessibilityLabel={option}
            aria-checked={checked}
            onPress={() => toggle(option)}
            onFocus={() => setFocused(option)}
            onBlur={() => setFocused((current) => (current === option ? null : current))}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.row,
              checked && styles.rowChecked,
              (hovered || pressed) && !checked && styles.rowHover,
              focused === option && styles.rowFocused,
            ]}
          >
            <View style={[styles.box, checked && styles.boxChecked]}>
              {checked ? <Check size={13} color={colors.primary.ink} strokeWidth={3} /> : null}
            </View>
            <Text style={[styles.label, checked && styles.labelChecked]}>{option}</Text>
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
    gap: 8,
  },
  row: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
  },
  rowHover: {
    backgroundColor: 'rgba(30, 50, 71, 0.7)',
  },
  rowFocused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  rowChecked: {
    borderColor: stitch.glassBorderStrong,
    backgroundColor: stitch.cyanMuted,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.slate[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[300],
  },
  label: {
    ...typography.bodySmall,
    color: colors.slate[200],
  },
  labelChecked: {
    fontFamily: fonts.semibold,
    color: colors.offWhite,
  },
});
