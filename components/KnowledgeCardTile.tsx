import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import { getKnowledgeCategory, type KnowledgeCard } from '@/lib/knowledge';

type Props = { card: KnowledgeCard; onPress: () => void; style?: ViewStyle };

export function KnowledgeCardTile({ card, onPress, style }: Props) {
  const [focused, setFocused] = useState(false);
  const category = getKnowledgeCategory(card.category);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${card.title}. ${card.summary}`}
      accessibilityHint="Opens this knowledge card."
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.card,
        hovered && styles.cardHover,
        pressed && styles.cardPressed,
        focused && styles.cardFocused,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{category?.shortLabel ?? card.category}</Text>
        </View>
        <Text style={styles.meta}>30–60 sec</Text>
      </View>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.summary} numberOfLines={3}>{card.summary}</Text>
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <BookOpen size={13} color={colors.primary[300]} strokeWidth={2} />
          <Text style={styles.footerText}>{card.contentClassification}</Text>
        </View>
        <ChevronRight size={16} color={colors.primary[300]} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 0,
    gap: 8,
    minHeight: 154,
    padding: 15,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(8, 26, 42, 0.66)',
  },
  cardHover: { borderColor: 'rgba(0, 214, 198, 0.34)', backgroundColor: 'rgba(10, 33, 52, 0.78)' },
  cardPressed: { opacity: 0.9 },
  cardFocused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  categoryChip: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.26)',
    backgroundColor: stitch.cyanMuted,
    flexShrink: 1,
  },
  categoryText: { fontFamily: fonts.semibold, fontSize: 8, lineHeight: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.primary[300] },
  meta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 12, color: colors.slate[500] },
  title: { ...typography.cardTitle, fontSize: 15.5, lineHeight: 21, color: colors.offWhite },
  summary: { ...typography.bodySmall, fontSize: 12.5, lineHeight: 18, color: colors.slate[300] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', paddingTop: 4 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  footerText: { ...typography.meta, fontSize: 9.5, lineHeight: 13, color: colors.slate[400], flexShrink: 1 },
});
