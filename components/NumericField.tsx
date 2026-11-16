import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';

type NumericFieldProps = {
  label: string;
  unit: string;
  hint: string;
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
};

export function NumericField({ label, unit, hint, value, error, onChangeText, onClear }: NumericFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused, error ? styles.inputRowError : null]}>
        <TextInput
          accessibilityLabel={`${label} in ${unit}`}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          aria-invalid={Boolean(error)}
          placeholder="Not recorded"
          placeholderTextColor={colors.slate[500]}
          style={styles.input}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.helperRow}>
        <View style={styles.helperCopy}>
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>{hint}</Text>
          )}
        </View>
        {onClear && value.trim() !== '' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            accessibilityHint="Records this field as not measured."
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

const styles = StyleSheet.create({
  wrapper: {
    gap: 5,
    minWidth: 0,
  },
  label: {
    ...typography.label,
    color: colors.slate[200],
    flexShrink: 1,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: stitch.panelDeep,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.9)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
  },
  inputRowFocused: {
    borderColor: stitch.glassBorderStrong,
    backgroundColor: 'rgba(9, 22, 36, 0.96)',
  },
  inputRowError: {
    borderColor: colors.error[400],
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    fontFamily: fonts.mono,
    fontSize: 20,
    lineHeight: 26,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate[500],
    marginLeft: 8,
  },
  hint: {
    ...typography.meta,
    color: colors.slate[500],
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  helperCopy: { flex: 1, minWidth: 0 },
  clear: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  clearHover: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  clearLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary[300],
  },
  error: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.error[400],
  },
});
