import { BookOpen, CloudOff, Library, Search, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle,
} from 'react-native';

import { KnowledgeCardTile } from '@/components/KnowledgeCardTile';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Surface } from '@/components/Surface';
import { colors, fonts, layout, radius, stitch, type as typography } from '@/constants/theme';
import {
  filterKnowledgeCards,
  featuredKnowledgeCards,
  getKnowledgeCategory,
  knowledgeCards,
  knowledgeCategories,
  knowledgeCatalogSummary,
  type KnowledgeCategoryId,
} from '@/lib/knowledge';

type CategoryFilter = KnowledgeCategoryId | 'all';

let lastHubState: { query: string; category: CategoryFilter } = { query: '', category: 'all' };

export default function KnowledgeHubScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= layout.desktopBreakpoint;
  const [query, setQueryState] = useState(lastHubState.query);
  const [category, setCategoryState] = useState<CategoryFilter>(lastHubState.category);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    router.prefetch({ pathname: '/knowledge/[cardId]', params: { cardId: 'personal-baseline' } });
  }, [router]);

  const updateQuery = (value: string) => {
    lastHubState = { ...lastHubState, query: value };
    setQueryState(value);
  };
  const updateCategory = (value: CategoryFilter) => {
    lastHubState = { ...lastHubState, category: value };
    setCategoryState(value);
  };

  const summary = knowledgeCatalogSummary();
  const results = useMemo(() => filterKnowledgeCards(category, query), [category, query]);
  const summaryFeatured = useMemo(() => featuredKnowledgeCards(), []);
  const browsing = query.trim() === '' && category === 'all';
  const listed = browsing ? results.filter((card) => !card.featured) : results;
  const activeCategory = category === 'all' ? null : getKnowledgeCategory(category);
  const heading = query.trim() !== ''
    ? `Results · ${results.length}`
    : activeCategory
      ? `${activeCategory.label} · ${results.length}`
      : 'More topics';

  const openCard = (cardId: string) => router.push({ pathname: '/knowledge/[cardId]', params: { cardId } });
  const reset = () => { updateQuery(''); updateCategory('all'); };

  return (
    <ScreenContainer title="Crew Knowledge Hub" subtitle="Clear explanations for your health records, available offline.">
      <View style={styles.heroRow}>
        <View style={styles.offlineChip}>
          <CloudOff size={13} color={colors.primary[300]} strokeWidth={2.1} />
          <Text style={styles.offlineChipText}>OFFLINE LIBRARY · BUNDLED WITH THE APP</Text>
        </View>
        <Text style={styles.heroMeta}>{summary.cardCount} cards · {summary.categoryCount} categories · reviewed {knowledgeCards[0]?.lastReviewedAt}</Text>
      </View>

      <Surface variant="glass" tone="panel" style={styles.searchPanel}>
        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <Search size={18} color={colors.slate[400]} strokeWidth={2.1} />
          <TextInput
            accessibilityLabel="Search the knowledge library"
            accessibilityHint="Searches card titles, keywords, categories and summaries on this device."
            value={query}
            onChangeText={updateQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search baseline, sleep, offline…"
            placeholderTextColor={colors.slate[500]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => updateQuery('')}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            >
              <X size={16} color={colors.slate[300]} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.searchHint}>Case-insensitive local search. No query leaves this device.</Text>

        {!desktop ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
            <CategoryChip label="All" count={knowledgeCards.length} active={category === 'all'} onPress={() => updateCategory('all')} />
            {knowledgeCategories.map((item) => (
              <CategoryChip
                key={item.id}
                label={item.shortLabel}
                count={knowledgeCards.filter((card) => card.category === item.id).length}
                active={category === item.id}
                onPress={() => updateCategory(item.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </Surface>

      <View style={[styles.columns, desktop && styles.columnsDesktop]}>
        {desktop ? (
          <View style={styles.leftCol}>
            <Surface variant="glass" tone="panel" style={styles.sidePanel}>
              <Text style={styles.sideLabel}>CATEGORIES</Text>
              <View style={styles.sideList}>
                <SideCategory label="All cards" count={knowledgeCards.length} active={category === 'all'} onPress={() => updateCategory('all')} />
                {knowledgeCategories.map((item) => (
                  <SideCategory
                    key={item.id}
                    label={item.label}
                    count={knowledgeCards.filter((card) => card.category === item.id).length}
                    active={category === item.id}
                    onPress={() => updateCategory(item.id)}
                  />
                ))}
              </View>
            </Surface>
            <Surface variant="glass" tone="panel" style={styles.sidePanel}>
              <View style={styles.sideHead}><CloudOff size={14} color={colors.primary[300]} strokeWidth={2.1} /><Text style={styles.sideLabel}>AVAILABLE OFFLINE</Text></View>
              <Text style={styles.sideBody}>Every card, citation and category is bundled with the app. Opening an external source needs internet.</Text>
            </Surface>
          </View>
        ) : null}

        <View style={styles.centerCol}>
          {browsing ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles size={15} color={colors.primary[300]} strokeWidth={2.1} />
                  <Text accessibilityRole="header" style={styles.sectionTitle}>Start here</Text>
                </View>
                <Text style={styles.sectionMeta}>FEATURED</Text>
              </View>
              <View style={styles.featuredGrid}>
                {summaryFeatured.map((card) => (
                  <KnowledgeCardTile
                    key={card.id}
                    card={card}
                    onPress={() => openCard(card.id)}
                    style={desktop ? styles.featuredDesktop : styles.featuredMobile}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionTitleRow}>
                <Library size={15} color={colors.primary[300]} strokeWidth={2.1} />
                <Text accessibilityRole="header" style={styles.sectionTitle}>{heading}</Text>
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.sectionMeta}>{listed.length} {listed.length === 1 ? 'CARD' : 'CARDS'}</Text>
            </View>

            {listed.length === 0 ? (
              <Surface variant="glass" tone="panel" style={styles.emptyPanel}>
                <Search size={22} color={colors.slate[400]} strokeWidth={2} />
                <Text style={styles.emptyTitle}>No cards match your search</Text>
                <Text style={styles.emptyBody}>Try a shorter phrase such as “baseline”, “sleep”, “offline” or “blood pressure”. The library only searches its bundled catalog.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and filters"
                  onPress={reset}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.resetButton, (hovered || pressed) && styles.resetHover]}
                >
                  <Text style={styles.resetText}>Clear search and filters</Text>
                </Pressable>
              </Surface>
            ) : (
              <View style={styles.cardList}>
                {listed.map((card) => (
                  <KnowledgeCardTile key={card.id} card={card} onPress={() => openCard(card.id)} />
                ))}
              </View>
            )}
          </View>
        </View>

        {desktop ? (
          <View style={styles.rightCol}>
            <Surface variant="glass" tone="panel" style={styles.sidePanel}>
              <View style={styles.sideHead}><BookOpen size={14} color={colors.primary[300]} strokeWidth={2.1} /><Text style={styles.sideLabel}>READING GUIDE</Text></View>
              <GuideStep number="1" title="Quick answer" body="One or two sentences that answer the question immediately." />
              <GuideStep number="2" title="Simple explanation" body="A short paragraph and an everyday example." />
              <GuideStep number="3" title="Learn more" body="Optional detail, limitations and the source register." />
            </Surface>
            <Surface variant="glass" tone="panel" style={[styles.sidePanel, styles.safetyPanel]}>
              <View style={styles.sideHead}><ShieldCheck size={14} color={colors.accent[400]} strokeWidth={2.1} /><Text style={styles.sideLabel}>MEDICAL SAFETY</Text></View>
              <Text style={styles.sideBody}>These cards explain concepts. They do not diagnose, prescribe or replace approved mission medical procedures.</Text>
            </Surface>
            <Text style={styles.sideFootnote}>Content version {knowledgeCards[0]?.version} · reviewed {knowledgeCards[0]?.lastReviewedAt}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.pageFootnote}>
        Educational information only. Follow approved mission medical procedures for operational decisions. ASTRA CARE is not a NASA-approved flight medical system.
      </Text>
    </ScreenContainer>
  );
}

function CategoryChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} cards`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.chip,
        active && styles.chipActive,
        (hovered || pressed) && !active && styles.chipHover,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Text style={[styles.chipCount, active && styles.chipTextActive]}>{count}</Text>
    </Pressable>
  );
}

function SideCategory({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} cards`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.sideItem,
        active && styles.sideItemActive,
        (hovered || pressed) && !active && styles.sideItemHover,
        focused && styles.focused,
      ]}
    >
      <Text style={[styles.sideItemText, active && styles.sideItemTextActive]}>{label}</Text>
      <Text style={[styles.sideItemCount, active && styles.sideItemTextActive]}>{count}</Text>
    </Pressable>
  );
}

function GuideStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.guideRow}>
      <View style={styles.guideNumber}><Text style={styles.guideNumberText}>{number}</Text></View>
      <View style={styles.guideCopy}>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 214, 198, 0.28)',
    backgroundColor: stitch.cyanMuted,
  },
  offlineChipText: { fontFamily: fonts.semibold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.8, color: colors.primary[300] },
  heroMeta: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 14, color: colors.slate[400] },

  searchPanel: { padding: 14, gap: 9 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(3, 12, 22, 0.72)',
  },
  searchBoxFocused: { borderColor: colors.primary[300], backgroundColor: 'rgba(3, 16, 28, 0.9)' },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.offWhite,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 10,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchHint: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500] },
  chipRow: { gap: 7, paddingTop: 2, paddingBottom: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: stitch.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  chipActive: { backgroundColor: colors.primary[400], borderColor: colors.primary[300] },
  chipHover: { borderColor: 'rgba(0, 214, 198, 0.34)', backgroundColor: 'rgba(0, 214, 198, 0.08)' },
  chipText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, color: colors.slate[200] },
  chipCount: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[400] },
  chipTextActive: { color: colors.primary.ink },

  columns: { gap: 18 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  leftCol: { width: 224, gap: 12, flexShrink: 0 },
  centerCol: { flex: 1, minWidth: 0, gap: 22 },
  rightCol: { width: 268, gap: 12, flexShrink: 0 },
  sidePanel: { padding: 14, gap: 10 },
  sideHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sideLabel: { ...typography.label, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, color: colors.slate[300] },
  sideList: { gap: 3 },
  sideItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 42, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: 'transparent' },
  sideItemActive: { backgroundColor: colors.primary[400], borderColor: colors.primary[300] },
  sideItemHover: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.08)' },
  sideItemText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.slate[300], flexShrink: 1 },
  sideItemTextActive: { fontFamily: fonts.semibold, color: colors.primary.ink },
  sideItemCount: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 13, color: colors.slate[500] },
  sideBody: { ...typography.bodySmall, fontSize: 11.5, lineHeight: 17, color: colors.slate[300] },
  safetyPanel: { borderColor: 'rgba(242, 192, 120, 0.26)', backgroundColor: stitch.amberMuted },
  sideFootnote: { ...typography.meta, fontSize: 9.5, lineHeight: 14, color: colors.slate[500], paddingHorizontal: 2 },

  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  sectionTitle: { ...typography.section, fontSize: 19, lineHeight: 25, color: colors.offWhite, flexShrink: 1 },
  sectionMeta: { fontFamily: fonts.mono, fontSize: 8.5, lineHeight: 13, letterSpacing: 0.5, color: colors.slate[500] },
  featuredGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featuredDesktop: { flexBasis: '47%' },
  featuredMobile: { flexBasis: '100%' },
  cardList: { gap: 10 },
  emptyPanel: { padding: 22, gap: 10, alignItems: 'flex-start' },
  emptyTitle: { ...typography.cardTitle, color: colors.offWhite },
  emptyBody: { ...typography.bodySmall, color: colors.slate[300], maxWidth: 560 },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.3)', backgroundColor: stitch.cyanMuted },
  resetHover: { backgroundColor: 'rgba(0, 214, 198, 0.2)' },
  resetText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: colors.primary[300] },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  guideNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: stitch.cyanMuted, borderWidth: 1, borderColor: 'rgba(0, 214, 198, 0.3)' },
  guideNumberText: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 13, color: colors.primary[300] },
  guideCopy: { flex: 1, minWidth: 0, gap: 1 },
  guideTitle: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 16, color: colors.offWhite },
  guideBody: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.slate[400] },
  focused: Platform.OS === 'web'
    ? ({ outlineStyle: 'solid', outlineColor: colors.primary[300], outlineWidth: 2, outlineOffset: 2 } as ViewStyle)
    : { borderColor: colors.primary[300] },
  pressed: { opacity: 0.85 },
  pageFootnote: { ...typography.meta, fontSize: 10, lineHeight: 15, color: colors.slate[500], maxWidth: 900 },
});
