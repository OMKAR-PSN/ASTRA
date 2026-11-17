import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

type StepProgressProps = {
  current: number;
  total: number;
  label: string;
};

export function StepProgress({ current, total, label }: StepProgressProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}: ${label}`}
      accessibilityValue={{ min: 1, max: total, now: current, text: label }}
    >
      <View style={styles.head}>
        <Text style={styles.counter}>STEP {current} OF {total}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < current - 1 && styles.segmentDone,
              index === current - 1 && styles.segmentCurrent,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  counter: { fontFamily: fonts.mono, fontSize: 10, lineHeight: 15, letterSpacing: 0.7, color: colors.primary[300] },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.slate[300] },
  track: { flexDirection: 'row', gap: 5 },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentDone: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  segmentCurrent: { backgroundColor: colors.primary[300], borderColor: colors.primary[300] },
});
