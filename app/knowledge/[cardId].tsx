import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, ExternalLink, Info, ShieldCheck } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { KnowledgeCardTile } from '@/components/KnowledgeCardTile';
import { KnowledgeDiagram } from '@/components/KnowledgeDiagram';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import {
  cardReferences,
  EDUCATIONAL_NOTICE,
  getKnowledgeCard,
  getKnowledgeCategory,
  KNOWLEDGE_HUB_PATH,
  relatedKnowledgeCards,
} from '@/lib/knowledge';

export default function KnowledgeCardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const params = useLocalSearchParams<{ cardId?: string | string[] }>();
  const rawId = Array.isArray(params.cardId) ? params.cardId[0] : params.cardId;
  const card = getKnowledgeCard(rawId);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [focusedToggle, setFocusedToggle] = useState(false);

  const goHub = () => router.navigate(KNOWLEDGE_HUB_PATH);

  if (!card) {
    return (
      <ScreenContainer title="Crew Knowledge Hub" hideHeading>
        <BackLink onPress={goHub} />
        <Surface variant="glass" tone="panel" style={styles.fallbackPanel}>
          <EmptyState
            title="That card is not in the offline library"
            body="The link may refer to a card that was retired or renamed. No substitute content is generated. Open the hub to browse the bundled cards that are available."
            action={<PrimaryButton label="Open Crew Knowledge Hub" onPress={goHub} />}
          />
        </Surface>
      </ScreenContainer>
    );
  }

  const category = getKnowledgeCategory(card.category);
  const sources = cardReferences(card);
  const related = relatedKnowledgeCards(card, 3);

  return (
    <ScreenContainer title={card.title} hideHeading scrollToTopKey={card.id}>
      <BackLink onPress={goHub} />

      <View style={[styles.layout, desktop && styles.layoutDesktop]}>
        <View style={styles.article}>
          <View style={styles.hero}>
            <View style={styles.chipRow}>
              <View style={styles.categoryChip}><Text style={styles.categoryChipText}>{category?.shortLabel ?? card.category}</Text></View>
              <View style={styles.classificationChip}><Text style={styles.classificationText}>{card.contentClassification}</Text></View>
              <View style={styles.offlineChip}><BookOpen size={11} color={colors.primary[300]} strokeWidth={2.1} /><Text style={styles.offlineText}>OFFLINE CARD</Text></View>
            </View>
            <Text accessibilityRole="header" style={[styles.title, !desktop && styles.titleMobile]}>{card.title}</Text>
            <Text style={styles.meta}>Content v{card.version} · reviewed {card.lastReviewedAt} · 30–60 sec read</Text>
          </View>

          <Surface variant="glass" tone="panel" style={styles.quickAnswer}>
            <Text style={styles.quickLabel}>QUICK ANSWER</Text>
            <Text style={styles.quickText}>{card.summary}</Text>
          </Surface>

          {card.diagram ? <KnowledgeDiagram variant={card.diagram} /> : null}

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Simple explanation</Text>
            <Text style={styles.body}>{card.plainLanguageBody}</Text>
            {card.example ? (
              <View style={styles.example}>
                <Text style={styles.exampleLabel}>EVERYDAY EXAMPLE</Text>
                <Text style={styles.exampleText}>{card.example}</Text>
              </View>
            ) : null}
          </View>

          <Surface variant="glass" tone="panel" style={styles.learnPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={learnMoreOpen ? 'Hide learn more' : 'Learn more'}
              accessibilityHint="Shows optional detail and limitations for this card."
              accessibilityState={{ expanded: learnMoreOpen }}
              onPress={() => setLearnMoreOpen((current) => !current)}
              onFocus={() => setFocusedToggle(true)}
              onBlur={() => setFocusedToggle(false)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.learnToggle, (hovered || pressed) && styles.learnHover, focusedToggle && styles.focused]}
            >
              <View style={styles.learnTitleRow}>
                <Info size={15} color={colors.primary[300]} strokeWidth={2.1} />
                <Text style={styles.learnTitle}>Learn more</Text>
              </View>
              {learnMoreOpen ? <ChevronUp size={17} color={colors.primary[300]} strokeWidth={2.2} /> : <ChevronDown size={17} color={colors.primary[300]} strokeWidth={2.2} />}
            </Pressable>
            {learnMoreOpen ? (
              <View style={styles.learnBody}>
                <Text style={styles.body}>{card.extendedExplanation}</Text>
                <Text style={styles.limitation}>This card is educational context. It does not establish a cause, a diagnosis or an individual medical decision.</Text>
              </View>
            ) : (
              <Text style={styles.learnHint}>Optional detail, limitations and how ASTRA CARE uses the concept.</Text>
            )}
          </Surface>

          <View style={styles.safety}>
            <ShieldCheck size={16} color={colors.accent[400]} strokeWidth={2.1} />
            <Text style={styles.safetyText}>{EDUCATIONAL_NOTICE}</Text>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Sources</Text>
            {sources.length === 0 ? (
              <Text style={styles.body}>This card explains ASTRA CARE’s own behavior. No external source is required for its content.</Text>
            ) : (
              <View style={styles.sourceList}>
                {sources.map((source) => (
                  <Pressable
                    key={source.id}
                    accessibilityRole="link"
                    accessibilityLabel={`${source.title}, ${source.publisher}. Opens an external source in the browser.`}
                    accessibilityHint="External source. Requires internet access."
                    onPress={() => { void Linking.openURL(source.url).catch(() => undefined); }}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.sourceRow, (hovered || pressed) && styles.sourceHover]}
                  >
                    <View style={styles.sourceHead}>
                      <Text style={styles.sourceTitle}>{source.title}</Text>
                      <ExternalLink size={13} color={colors.primary[300]} strokeWidth={2.1} />
                    </View>
                    <Text style={styles.sourceMeta}>{source.publisher} · {source.publishedAt ?? 'Date not stated'} · reviewed {source.reviewedAt}</Text>
                    <Text selectable style={[styles.sourceUrl, Platform.OS === 'web' && ({ wordBreak: 'break-all' } as unknown as TextStyle)]}>{source.url}</Text>
                    <Text style={styles.sourceExternal}>External link · requires internet</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.sourceNote}>Citations are bundled with the app. Opening a source URL needs internet access.</Text>
          </View>

          {!desktop ? (
            <RelatedSection related={related} onOpen={(cardId) => router.push({ pathname: '/knowledge/[cardId]', params: { cardId } })} />
          ) : null}

          <View style={styles.articleFooter}>
            <PrimaryButton variant="secondary" label="Back to Crew Knowledge Hub" Icon={ArrowLeft} onPress={goHub} />
          </View>
        </View>

        {desktop ? (
          <View style={styles.aside}>
            <Surface variant="glass" tone="panel" style={styles.asidePanel}>
              <Text style={styles.asideLabel}>CARD DETAILS</Text>
              <DetailRow label="Category" value={category?.label ?? card.category} />
              <DetailRow label="Classification" value={card.contentClassification} />
              <DetailRow label="Content version" value={card.version} />
              <DetailRow label="Last reviewed" value={card.lastReviewedAt} />
              <DetailRow label="Sources" value={sources.length === 0 ? 'App behavior' : `${sources.length} external`} />
            </Surface>
            <RelatedSection related={related} onOpen={(cardId) => router.push({ pathname: '/knowledge/[cardId]', params: { cardId } })} />
            <Text style={styles.asideFootnote}>Available without internet. External sources are the only network links.</Text>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Back to Crew Knowledge Hub"
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.backLink, (hovered || pressed) && styles.backHover]}
    >
      <ArrowLeft size={15} color={colors.primary[300]} strokeWidth={2.2} />
      <Text style={styles.backText}>Crew Knowledge Hub</Text>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function RelatedSection({ related, onOpen }: { related: ReturnType<typeof relatedKnowledgeCards>; onOpen: (cardId: string) => void }) {
  if (related.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Related cards</Text>
      <View style={styles.relatedList}>
        {related.map((item) => (
          <KnowledgeCardTile key={item.id} card={item} onPress={() => onOpen(item.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 9, marginLeft: -9, borderRadius: 8 },
  backHover: { backgroundColor: 'rgba(0, 214, 198, 0.08)' },
  backText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },

  layout: { gap: 18 },
  layoutDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 22 },
  article: { flex: 1, minWidth: 0, gap: 18, maxWidth: 820 },
  aside: { width: 286, flexShrink: 0, gap: 12 },
  hero: { gap: 9 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.3)', backgroundColor: stitch.cyanMuted },
  categoryChipText: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.primary[300] },
  classificationChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  classificationText: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.3, color: colors.slate[300] },
  offlineChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, backgroundColor: stitch.greenMuted, borderWidth: 1, borderColor: 'rgba(134, 227, 180, 0.24)' },
  offlineText: { fontFamily: fonts.mono, fontSize: 7.5, lineHeight: 11, letterSpacing: 0.5, color: colors.success[400] },
  title: { ...typography.hero, fontSize: 38, lineHeight: 46, letterSpacing: -0.8, color: colors.offWhite },
  titleMobile: typography.heroMobile,
  meta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[500] },

  quickAnswer: { padding: 18, gap: 7, borderColor: 'rgba(0, 214, 198, 0.28)', backgroundColor: stitch.cyanMuted },
  quickLabel: { ...typography.labelWide, fontSize: 9, color: colors.primary[300] },
  quickText: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 28, letterSpacing: -0.2, color: colors.offWhite },

  section: { gap: 9 },
  sectionTitle: { ...typography.section, fontSize: 19, lineHeight: 25, color: colors.offWhite },
  body: { ...typography.body, fontSize: 15.5, lineHeight: 25, color: colors.slate[200], maxWidth: 780 },
  example: { gap: 5, padding: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: stitch.glassInset },
  exampleLabel: { ...typography.label, fontSize: 8.5, color: colors.slate[400] },
  exampleText: { ...typography.bodySmall, fontSize: 13, lineHeight: 20, color: colors.slate[200] },

  learnPanel: { padding: 14, gap: 9 },
  learnToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, borderRadius: 8 },
  learnHover: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  learnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  learnTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.offWhite },
  learnHint: { ...typography.meta, fontSize: 11, lineHeight: 16, color: colors.slate[500], paddingHorizontal: 4 },
  learnBody: { gap: 10, paddingHorizontal: 4, paddingBottom: 2 },
  limitation: { ...typography.meta, fontSize: 11, lineHeight: 16, color: colors.slate[400], borderLeftWidth: 2, borderLeftColor: 'rgba(0, 214, 198, 0.4)', paddingLeft: 9 },

  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(242, 192, 120, 0.28)', backgroundColor: stitch.amberMuted },
  safetyText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 19, color: colors.accent[400] },

  sourceList: { gap: 8 },
  sourceRow: { gap: 4, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.5)' },
  sourceHover: { borderColor: 'rgba(0, 214, 198, 0.32)', backgroundColor: 'rgba(6, 24, 39, 0.66)' },
  sourceHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sourceTitle: { ...typography.bodySmall, fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: colors.offWhite, flexShrink: 1 },
  sourceMeta: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[400] },
  sourceUrl: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.primary[300] },
  sourceExternal: { ...typography.meta, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
  sourceNote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },

  relatedList: { gap: 9 },
  articleFooter: { paddingTop: 4 },

  asidePanel: { padding: 14, gap: 9 },
  asideLabel: { ...typography.label, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[400] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.07)', paddingTop: 7 },
  detailLabel: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500], flexShrink: 0 },
  detailValue: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[200], textAlign: 'right', flexShrink: 1 },
  asideFootnote: { ...typography.meta, fontSize: 9.5, lineHeight: 14, color: colors.slate[500], paddingHorizontal: 2 },

  fallbackPanel: { padding: 20 },
  focused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
});
