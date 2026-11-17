import { BookOpen, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { getKnowledgeCard } from '@/lib/knowledge';

type Props = {
  cardId: string;
  label?: string;
  hint?: string;
  variant?: 'inline' | 'button';
  style?: ViewStyle;
};

/** Contextual link to a stable card ID. Renders nothing if the card is unavailable. */
export function KnowledgeLink({ cardId, label, hint, variant = 'inline', style }: Props) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const card = getKnowledgeCard(cardId);
  if (!card) return null;
  const text = label ?? card.title;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={text}
      accessibilityHint={hint ?? `Opens the knowledge card “${card.title}”. Available offline.`}
      onPress={() => router.push({ pathname: '/knowledge/[cardId]', params: { cardId: card.id } })}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        variant === 'button' ? styles.button : styles.inline,
        hovered && variant === 'inline' && styles.inlineHover,
        pressed && styles.pressed,
        focused && styles.focused,
        style,
      ]}
    >
      <View style={styles.content}>
        <BookOpen size={14} color={colors.primary[300]} strokeWidth={2.1} />
        <Text style={[styles.label, variant === 'button' && styles.labelButton]}>{text}</Text>
        <ChevronRight size={14} color={colors.primary[300]} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginLeft: -10,
    borderRadius: 8,
  },
  inlineHover: { backgroundColor: 'rgba(0, 214, 198, 0.08)' },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.24)',
    backgroundColor: 'rgba(30, 50, 71, 0.45)',
  },
  pressed: { opacity: 0.85 },
  focused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  content: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300], flexShrink: 1 },
  labelButton: { fontSize: 12.5, lineHeight: 18, color: colors.offWhite },
});
