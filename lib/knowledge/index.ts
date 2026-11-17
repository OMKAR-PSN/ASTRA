import { knowledgeCards, knowledgeCategories } from './catalog';
import { knowledgeSources, resolveKnowledgeSources } from './sources';
import type { KnowledgeCard, KnowledgeCategory, KnowledgeCategoryId, KnowledgeSource } from './types';

export { knowledgeCards, knowledgeCategories } from './catalog';
export { knowledgeSources, resolveKnowledgeSources } from './sources';
export { EDUCATIONAL_NOTICE } from './types';
export type {
  KnowledgeAppFeature,
  KnowledgeCard,
  KnowledgeCategory,
  KnowledgeCategoryId,
  KnowledgeClassification,
  KnowledgeDiagram,
  KnowledgeMetricType,
  KnowledgeSource,
} from './types';

export const KNOWLEDGE_HUB_PATH = '/knowledge';

export function knowledgeCardPath(cardId: string): `/knowledge/${string}` {
  return `/knowledge/${encodeURIComponent(cardId)}`;
}

export function getKnowledgeCard(cardId: string | undefined | null): KnowledgeCard | undefined {
  if (!cardId) return undefined;
  return knowledgeCards.find((card) => card.id === cardId);
}

export function getKnowledgeCategory(categoryId: KnowledgeCategoryId): KnowledgeCategory | undefined {
  return knowledgeCategories.find((category) => category.id === categoryId);
}

export function cardReferences(card: KnowledgeCard): KnowledgeSource[] {
  return resolveKnowledgeSources(card.references);
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function searchableFields(card: KnowledgeCard): { value: string; weight: number }[] {
  const category = getKnowledgeCategory(card.category);
  return [
    { value: normalize(card.title), weight: 5 },
    { value: normalize(card.keywords.join(' ')), weight: 4 },
    { value: normalize(`${category?.label ?? ''} ${category?.shortLabel ?? ''}`), weight: 3 },
    { value: normalize(card.summary), weight: 2.5 },
    { value: normalize(card.plainLanguageBody), weight: 1 },
    { value: normalize(card.extendedExplanation), weight: 0.5 },
  ];
}

/**
 * Local, deterministic search over the bundled catalog. Every whitespace-separated
 * token must appear in at least one searchable field. No network or model call is used.
 */
export function searchKnowledgeCards(query: string, cards: KnowledgeCard[] = knowledgeCards): KnowledgeCard[] {
  const normalized = normalize(query);
  if (normalized === '') return [...cards];
  const tokens = normalized.split(' ');
  const ranked = cards.flatMap((card, order) => {
    const fields = searchableFields(card);
    let score = 0;
    for (const token of tokens) {
      const matching = fields.filter((field) => field.value.includes(token));
      if (matching.length === 0) return [];
      score += Math.max(...matching.map((field) => field.weight));
    }
    return [{ card, order, score }];
  });
  return ranked
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.card);
}

export function filterKnowledgeCards(
  category: KnowledgeCategoryId | 'all',
  query = '',
  cards: KnowledgeCard[] = knowledgeCards,
): KnowledgeCard[] {
  const inCategory = category === 'all' ? cards : cards.filter((card) => card.category === category);
  return searchKnowledgeCards(query, inCategory);
}

export function featuredKnowledgeCards(cards: KnowledgeCard[] = knowledgeCards): KnowledgeCard[] {
  return cards.filter((card) => card.featured);
}

export function relatedKnowledgeCards(card: KnowledgeCard, limit = 3): KnowledgeCard[] {
  const shared = (other: KnowledgeCard) => {
    if (other.id === card.id) return -1;
    const metrics = other.relatedMetricTypes.filter((metric) => card.relatedMetricTypes.includes(metric)).length;
    const features = other.relatedAppFeatures.filter((feature) => card.relatedAppFeatures.includes(feature)).length;
    const category = other.category === card.category ? 1 : 0;
    return metrics * 3 + features * 2 + category;
  };
  return knowledgeCards
    .map((other, order) => ({ other, order, score: shared(other) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.other);
}

/** Counts used by tests and the hub header; no private observation data is involved. */
export function knowledgeCatalogSummary() {
  return {
    cardCount: knowledgeCards.length,
    categoryCount: knowledgeCategories.length,
    sourceCount: Object.keys(knowledgeSources).length,
  };
}
