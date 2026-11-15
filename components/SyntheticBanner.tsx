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
    borderColor: 'rgba(141, 187, 255, 0.28)',
    backgroundColor: 'rgba(141, 187, 255, 0.09)',
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
    color: '#C8DBF2',
  },
});
