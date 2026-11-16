import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export function SyntheticBanner() {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <View style={styles.dot} />
      <Text style={styles.label}>SYNTHETIC DEMO DATA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(121, 180, 255, 0.30)',
    backgroundColor: 'rgba(121, 180, 255, 0.10)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.secondary[400],
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.8,
    color: '#C9D9E8',
  },
});
