import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { MetricTile } from '@/components/MetricTile';
import { colors, fonts, spacing } from '@/constants/theme';
import { buildReadingTiles } from '@/lib/readingTiles';

type Tile = ReturnType<typeof buildReadingTiles>[number];

const regions = [
  { name: 'Head', labels: ['Mood', 'Stress'] },
  { name: 'Chest', labels: ['Heart rate', 'Systolic pressure', 'Diastolic pressure'] },
  { name: 'Whole body', labels: ['Body temperature', 'Sleep'] },
] as const;

export function BodyMap({ tiles }: { tiles: Tile[] }) {
  const [selected, setSelected] = useState(1);
  const region = regions[selected];
  const color = (index: number) => selected === index ? colors.primary[400] : colors.navy[700];

  return (
    <View style={styles.content}>
      <Svg width={116} height={175} viewBox="0 0 116 175" style={styles.figure} testID="body-map-figure">
        <Path
          d="M40 52 L28 57 L16 102 L24 107 L38 79 L42 111 L38 167 L51 167 L58 123 L65 167 L78 167 L74 111 L78 79 L92 107 L100 102 L88 57 L76 52 Z"
          fill={color(2)} stroke={colors.slate[400]} strokeWidth={2}
          onPress={() => setSelected(2)}
        />
        <Path
          d="M40 52 Q58 45 76 52 L74 84 Q58 91 42 84 Z"
          fill={color(1)} stroke={colors.slate[400]} strokeWidth={2}
          onPress={() => setSelected(1)}
        />
        <Circle cx={58} cy={28} r={17} fill={color(0)} stroke={colors.slate[400]} strokeWidth={2} onPress={() => setSelected(0)} />
      </Svg>
      <View style={styles.detail}>
        <View style={styles.options}>
          {regions.map(({ name }, index) => (
            <Pressable key={name} accessibilityRole="radio" aria-checked={selected === index}
              onPress={() => setSelected(index)} style={[styles.option, selected === index && styles.active]}>
              <Text style={styles.label}>{name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.options} accessibilityLiveRegion="polite">
          {tiles.filter((tile) => region.labels.some((label) => label === tile.label)).map((tile) => (
            <MetricTile key={tile.label} {...tile} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  figure: { alignSelf: 'center' },
  detail: { flexBasis: 220, flexGrow: 1, gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.navy[600] },
  active: { borderColor: colors.primary[400], backgroundColor: colors.navy[700] },
  label: { fontFamily: fonts.semibold, color: colors.offWhite },
});
