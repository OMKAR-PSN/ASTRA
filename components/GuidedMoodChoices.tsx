import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import { moodChoices, type MoodChoiceId } from '@/lib/guidedCheckIn';

type GuidedMoodChoicesProps = {
  value: MoodChoiceId | null;
  error?: string;
  onChange: (value: MoodChoiceId) => void;
};

export function GuidedMoodChoices({ value, error, onChange }: GuidedMoodChoicesProps) {
  const [focused, setFocused] = useState<MoodChoiceId | null>(null);
  return (
    <View style={styles.wrap}>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Mood">
        {moodChoices.map((choice) => {
          const selected = value === choice.id;
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityHint={choice.description}
              accessibilityState={{ selected }}
              onPress={() => onChange(choice.id)}
              onFocus={() => setFocused(choice.id)}
              onBlur={() => setFocused((current) => (current === choice.id ? null : current))}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.option,
                selected && styles.optionSelected,
                (hovered || pressed) && !selected && styles.optionHover,
                focused === choice.id && focusRing,
              ]}
            >
              <View style={[styles.box, selected && styles.boxSelected]}>
                {selected ? <Check size={13} color={colors.primary.ink} strokeWidth={3} /> : null}
              </View>
              <View style={styles.copy}>
                <Text style={[styles.label, selected && styles.labelSelected]}>{choice.label}</Text>
                <Text style={styles.description}>{choice.description}</Text>
              </View>
              <Text style={[styles.value, selected && styles.valueSelected]}>
                {choice.value === null ? 'NO VALUE' : `${choice.value} / 5`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const focusRing = Platform.OS === 'web'
  ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
  : { borderColor: colors.primary[300] };

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexBasis: 164,
    flexGrow: 1,
    minWidth: 0,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    backgroundColor: stitch.panelDeep,
  },
  optionSelected: { borderColor: stitch.glassBorderStrong, backgroundColor: stitch.cyanMuted },
  optionHover: { backgroundColor: 'rgba(30, 50, 71, 0.7)' },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.slate[500],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxSelected: { backgroundColor: colors.primary[400], borderColor: colors.primary[300] },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.offWhite },
  labelSelected: { color: colors.primary[300] },
  description: { ...typography.meta, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  value: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.4, color: colors.slate[500], flexShrink: 0 },
  valueSelected: { color: colors.primary[300] },
  error: { ...typography.bodySmall, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.error[400] },
});
