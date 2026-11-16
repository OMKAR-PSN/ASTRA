import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';

type DurationStepperProps = {
  label: string;
  unit: string;
  hint: string;
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onStep: (direction: 1 | -1) => void;
  onClear: () => void;
};

export function DurationStepper({ label, unit, hint, value, error, onChangeText, onStep, onClear }: DurationStepperProps) {
  const [focused, setFocused] = useState(false);
  const [focusedButton, setFocusedButton] = useState<-1 | 1 | null>(null);
  const canDecrement = value.trim() !== '' && Number.isFinite(Number(value));

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueTag}>{value.trim() === '' ? 'NOT MEASURED' : `${value} ${unit}`}</Text>
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease sleep by 30 minutes"
          accessibilityState={{ disabled: !canDecrement }}
          disabled={!canDecrement}
          onPress={() => onStep(-1)}
          onFocus={() => setFocusedButton(-1)}
          onBlur={() => setFocusedButton((current) => (current === -1 ? null : current))}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.stepButton,
            (hovered || pressed) && canDecrement && styles.stepButtonHover,
            !canDecrement && styles.stepButtonDisabled,
            focusedButton === -1 && focusRing,
          ]}
        >
          <Minus size={22} color={canDecrement ? colors.primary[300] : colors.slate[500]} strokeWidth={2.4} />
        </Pressable>

        <View style={[styles.inputRow, focused && styles.inputRowFocused, error ? styles.inputRowError : null]}>
          <TextInput
            accessibilityLabel={`${label} in ${unit}`}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="decimal-pad"
            placeholder="Not recorded"
            placeholderTextColor={colors.slate[500]}
            aria-invalid={Boolean(error)}
            style={styles.input}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase sleep by 30 minutes"
          onPress={() => onStep(1)}
          onFocus={() => setFocusedButton(1)}
          onBlur={() => setFocusedButton((current) => (current === 1 ? null : current))}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.stepButton,
            (hovered || pressed) && styles.stepButtonHover,
            focusedButton === 1 && focusRing,
          ]}
        >
          <Plus size={22} color={colors.primary[300]} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.helperRow}>
        <View style={styles.helperCopy}>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <Text style={styles.hint}>{hint}</Text>}
        </View>
        {value.trim() !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear sleep duration"
            accessibilityHint="Records sleep as not measured."
            onPress={onClear}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.clear, (hovered || pressed) && styles.clearHover]}
          >
            <Text style={styles.clearLabel}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const focusRing = Platform.OS === 'web'
  ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
  : { borderColor: colors.primary[300] };

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { ...typography.label, color: colors.slate[200] },
  valueTag: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[500] },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  stepButton: {
    width: 58,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.32)',
    backgroundColor: 'rgba(30, 50, 71, 0.55)',
  },
  stepButtonHover: { backgroundColor: 'rgba(0, 214, 198, 0.12)' },
  stepButtonDisabled: { borderColor: 'rgba(40, 60, 80, 0.9)', backgroundColor: stitch.panelDeep },
  inputRow: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitch.panelDeep,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    borderRadius: radius.sm,
    paddingHorizontal: 14,
  },
  inputRowFocused: { borderColor: stitch.glassBorderStrong, backgroundColor: 'rgba(9, 22, 36, 0.96)' },
  inputRowError: { borderColor: colors.error[400] },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    fontFamily: fonts.mono,
    fontSize: 26,
    lineHeight: 32,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 17, color: colors.slate[500], marginLeft: 8 },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  helperCopy: { flex: 1, minWidth: 0 },
  hint: { ...typography.meta, color: colors.slate[500] },
  error: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.error[400] },
  clear: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4, borderRadius: 6 },
  clearHover: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  clearLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.primary[300] },
});
