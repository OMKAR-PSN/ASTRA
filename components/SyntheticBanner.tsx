import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

export function SyntheticBanner() {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.label}>SYNTHETIC DEMO DATA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary[400],
    borderRadius: radius.sm,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: colors.primary[400],
  },
});
