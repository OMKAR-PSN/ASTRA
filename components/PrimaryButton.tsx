import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  accessibilityHint?: string;
  Icon?: LucideIcon;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  Icon,
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';
  const glow = Platform.OS === 'web' && isPrimary && !disabled
    ? { boxShadow: '0 10px 26px rgba(80, 222, 216, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.28)' } as ViewStyle
    : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isPrimary && glow,
        hovered && !disabled && (isPrimary ? styles.primaryHover : styles.secondaryHover),
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {Icon ? <Icon size={17} strokeWidth={2.2} color={isPrimary ? colors.primary.ink : colors.primary[300]} /> : null}
        <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primary: {
    backgroundColor: colors.primary[400],
    borderColor: colors.primary[300],
  },
  primaryHover: {
    backgroundColor: colors.primary[300],
  },
  secondary: {
    backgroundColor: 'rgba(30, 50, 71, 0.55)',
    borderColor: 'rgba(80, 222, 216, 0.22)',
  },
  secondaryHover: {
    backgroundColor: colors.navy[700],
    borderColor: 'rgba(80, 222, 216, 0.4)',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    backgroundColor: colors.navy[700],
    borderColor: colors.navy[600],
    opacity: 1,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  primaryLabel: {
    color: colors.primary.ink,
  },
  secondaryLabel: {
    color: colors.offWhite,
  },
});
