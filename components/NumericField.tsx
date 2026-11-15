import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type NumericFieldProps = {
  label: string;
  unit: string;
  hint: string;
  value: string;
  error?: string;
  onChangeText: (text: string) => void;
};

export function NumericField({ label, unit, hint, value, error, onChangeText }: NumericFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          accessibilityLabel={`${label} in ${unit}`}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          aria-invalid={Boolean(error)}
          placeholder="Not recorded"
          placeholderTextColor={colors.slate[400]}
          style={styles.input}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs / 2,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.offWhite,
  },
  inputRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy[900],
    borderWidth: 1,
    borderColor: colors.navy[600],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  inputRowError: {
    borderColor: colors.error[400],
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.offWhite,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate[300],
    marginLeft: spacing.xs / 2,
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
