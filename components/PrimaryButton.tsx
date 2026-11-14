import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        hovered && !disabled && (isPrimary ? styles.primaryHover : styles.secondaryHover),
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[400],
  },
  primaryHover: {
    backgroundColor: colors.primary[300],
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.primary[400],
  },
  secondaryHover: {
    backgroundColor: colors.navy[700],
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: colors.navy[700],
    borderColor: colors.navy[600],
    opacity: 1,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
  },
  primaryLabel: {
    color: colors.primary.ink,
  },
  secondaryLabel: {
    color: colors.primary[300],
  },
});
