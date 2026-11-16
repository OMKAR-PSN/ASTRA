import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, fonts, radius } from '@/constants/theme';
import { buildReadingTiles, type ReadingStatus } from '@/lib/readingTiles';
import { svgPress } from '@/lib/svgPress';

type Tile = ReturnType<typeof buildReadingTiles>[number];

const regions = [
  { name: 'Head', labels: ['Mood', 'Stress'] },
  { name: 'Chest', labels: ['Heart rate', 'Systolic pressure', 'Diastolic pressure'] },
  { name: 'Whole body', labels: ['Body temperature', 'Sleep'] },
] as const;

const statusColor: Record<ReadingStatus, string> = {
  baseline: colors.success[400],
  difference: colors.accent[400],
  recorded: colors.secondary[400],
  missing: colors.slate[400],
};

export function BodyMap({ tiles }: { tiles: Tile[] }) {
  const [selected, setSelected] = useState(1);
  const region = regions[selected];
  const color = (index: number) => selected === index ? colors.primary[400] : colors.navy[700];
  const regionTiles = tiles.filter((tile) => region.labels.some((label) => label === tile.label));

  return (
    <View style={styles.content}>
      <Svg width={116} height={175} viewBox="0 0 116 175" style={styles.figure} testID="body-map-figure">
        <Path
          d="M40 52 L28 57 L16 102 L24 107 L38 79 L42 111 L38 167 L51 167 L58 123 L65 167 L78 167 L74 111 L78 79 L92 107 L100 102 L88 57 L76 52 Z"
          fill={color(2)} stroke={colors.slate[400]} strokeWidth={2}
          {...svgPress(() => setSelected(2))}
        />
        <Path
          d="M40 52 Q58 45 76 52 L74 84 Q58 91 42 84 Z"
          fill={color(1)} stroke={colors.slate[400]} strokeWidth={2}
          {...svgPress(() => setSelected(1))}
        />
        <Circle cx={58} cy={28} r={17} fill={color(0)} stroke={colors.slate[400]} strokeWidth={2} {...svgPress(() => setSelected(0))} />
      </Svg>
      <View style={styles.detail}>
        <View style={styles.options} accessibilityRole="radiogroup">
          {regions.map(({ name }, index) => (
            <Pressable key={name} accessibilityRole="radio" aria-checked={selected === index}
              onPress={() => setSelected(index)} style={[styles.option, selected === index && styles.active]}>
              <Text style={[styles.optionLabel, selected === index && styles.optionLabelActive]}>{name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.readout} accessibilityLiveRegion="polite">
          {regionTiles.map((tile) => {
            const missing = tile.value === 'Not recorded';
            return (
              <View key={tile.label} style={[styles.tile, { borderLeftColor: statusColor[tile.status] }]}>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                <View style={styles.tileValueRow}>
                  <Text style={[styles.tileValue, missing && styles.tileMissing]}>{tile.value}</Text>
                  {missing ? null : <Text style={styles.tileUnit}>{tile.unit}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  figure: { alignSelf: 'center' },
  detail: { flexBasis: 210, flexGrow: 1, gap: 9, minWidth: 0 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  option: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.85)',
    backgroundColor: 'rgba(9, 29, 42, 0.5)',
  },
  active: { borderColor: 'rgba(0, 214, 198, 0.45)', backgroundColor: 'rgba(0, 214, 198, 0.10)' },
  optionLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.slate[300] },
  optionLabelActive: { color: colors.primary[300] },
  readout: { gap: 6 },
  tile: {
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(9, 29, 42, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(40, 60, 80, 0.75)',
    borderLeftWidth: 3,
  },
  tileLabel: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.slate[400] },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' },
  tileValue: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 21, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  tileMissing: { fontSize: 12, lineHeight: 18, color: colors.slate[400] },
  tileUnit: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
});
