import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  EDUCATIONAL_NOTICE,
  KNOWLEDGE_HUB_PATH,
  cardReferences,
  featuredKnowledgeCards,
  filterKnowledgeCards,
  getKnowledgeCard,
  getKnowledgeCategory,
  knowledgeCardPath,
  knowledgeCards,
  knowledgeCatalogSummary,
  knowledgeCategories,
  knowledgeSources,
  relatedKnowledgeCards,
  resolveKnowledgeSources,
  searchKnowledgeCards,
} from '../lib/knowledge/index.ts';
import { MILESTONES, evaluateMilestones } from '../lib/engagement.ts';
import { DIFFERENCE_THRESHOLD_PERCENT, compareToBaseline } from '../lib/comparison.ts';
import { buildAssessment } from '../lib/assessment.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';
import { encodeCrewQrPayload, parseCrewQrPayload } from '../lib/crewIdentity.ts';
import { REPLAY_PLAYBACK_MS, clampReplayIndex, replayStep } from '../lib/replay.ts';
import { syntheticBaseline } from '../fixtures/crew.ts';

const NOW = Date.parse('2026-11-17T09:00:00.000Z');
const APPROVED_CLASSIFICATIONS = ['App explanation', 'General health education', 'Spaceflight research context'];
const APPROVED_CATEGORIES = ['observations', 'measurement', 'astra-care', 'spaceflight'];

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const knowledgeSourceFiles = () => [
  ...readdirSync(new URL('../lib/knowledge', import.meta.url))
    .filter((name) => name.endsWith('.ts'))
    .map((name) => read(`lib/knowledge/${name}`)),
  read('app/knowledge.tsx'),
  read('app/knowledge/[cardId].tsx'),
];

const tsxFiles = (relativeDir) =>
  readdirSync(new URL(`../${relativeDir}`, import.meta.url), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) return tsxFiles(relativePath);
    return entry.name.endsWith('.tsx') ? [relativePath] : [];
  });

const cardText = (card) =>
  [card.title, card.summary, card.plainLanguageBody, card.example ?? '', card.extendedExplanation].join('\n');

const checkIn = () => ({
  id: 'CHK-KNOWLEDGE-1',
  recordedAt: '2026-11-17T08:00:00.000Z',
  readings: {
    heartRateBpm: 81,
    systolicMmHg: 116,
    diastolicMmHg: 74,
    temperatureC: 36.7,
    sleepHours: 7.5,
    mood: 4,
    stress: 2,
  },
  symptoms: [],
  activityNote: '',
});

test('01 catalog is complete and every card has all three learning levels', () => {
  assert.equal(knowledgeCards.length, 21);
  assert.deepEqual(knowledgeCatalogSummary(), { cardCount: 21, categoryCount: 4, sourceCount: 26 });
  assert.ok(featuredKnowledgeCards().length >= 1);

  for (const card of knowledgeCards) {
    assert.ok(card.title.trim(), `${card.id} title`);
    assert.ok(card.summary.trim(), `${card.id} quick answer`);
    assert.ok(card.plainLanguageBody.trim(), `${card.id} simple explanation`);
    assert.ok(card.extendedExplanation.trim(), `${card.id} learn more`);
    assert.ok(card.keywords.length > 0, `${card.id} keywords`);
    assert.ok(Array.isArray(card.relatedMetricTypes), `${card.id} metrics`);
    assert.ok(card.relatedAppFeatures.length > 0, `${card.id} app features`);
    assert.ok(APPROVED_CLASSIFICATIONS.includes(card.contentClassification), `${card.id} classification`);
    assert.match(card.version, /^\d+\.\d+\.\d+$/);
    assert.match(card.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('02 card IDs are unique and URL-safe', () => {
  const ids = knowledgeCards.map((card) => card.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  for (const id of ['personal-baseline', 'percentage-difference', 'offline-report-queue', 'five-hazards']) {
    assert.ok(ids.includes(id), `expected card ${id}`);
  }
});

test('03 every card uses a declared category and every category is represented', () => {
  const categoryIds = knowledgeCategories.map((category) => category.id);
  assert.deepEqual(categoryIds, APPROVED_CATEGORIES);
  assert.equal(new Set(categoryIds).size, categoryIds.length);
  for (const card of knowledgeCards) {
    assert.ok(categoryIds.includes(card.category), `${card.id} category`);
    assert.ok(getKnowledgeCategory(card.category), `${card.id} category lookup`);
  }
  for (const id of categoryIds) {
    assert.ok(knowledgeCards.some((card) => card.category === id), `${id} has cards`);
  }
});

test('04 search matches titles and summaries case-insensitively', () => {
  const lower = searchKnowledgeCards('baseline').map((card) => card.id);
  assert.equal(lower[0], 'personal-baseline');
  assert.deepEqual(searchKnowledgeCards('BASELINE').map((card) => card.id), lower);
  assert.deepEqual(searchKnowledgeCards('  baseline  ').map((card) => card.id), lower);

  const bloodPressure = searchKnowledgeCards('blood pressure').map((card) => card.id);
  assert.equal(bloodPressure[0], 'blood-pressure');
  assert.ok(bloodPressure.every((id) => searchKnowledgeCards('blood pressure').some((card) => card.id === id)));
  assert.deepEqual(searchKnowledgeCards('no-such-topic-in-catalog'), []);
});

test('05 keyword-only searches reach the right card', () => {
  assert.equal(searchKnowledgeCards('queue')[0].id, 'offline-report-queue');
  assert.equal(searchKnowledgeCards('radiation')[0].id, 'five-hazards');
  assert.equal(searchKnowledgeCards('timezone')[0].id, 'timestamps');
  assert.equal(searchKnowledgeCards('fictional')[0].id, 'synthetic-demo-data');
  assert.equal(searchKnowledgeCards('mmhg')[0].id, 'blood-pressure');
});

test('06 empty search returns the catalog in stable order', () => {
  assert.deepEqual(searchKnowledgeCards(''), knowledgeCards);
  assert.deepEqual(searchKnowledgeCards('   '), knowledgeCards);
  assert.deepEqual(filterKnowledgeCards('all', ''), knowledgeCards);
  assert.equal(filterKnowledgeCards('observations', '').length, 5);
  assert.ok(filterKnowledgeCards('astra-care', '').every((card) => card.category === 'astra-care'));
});

test('07 card routing is stable and derived only from the card ID', () => {
  assert.equal(KNOWLEDGE_HUB_PATH, '/knowledge');
  for (const card of knowledgeCards) {
    const path = knowledgeCardPath(card.id);
    assert.equal(path, `/knowledge/${card.id}`);
    assert.ok(!path.includes('?') && !path.includes('=') && !path.includes(' '));
    assert.equal(getKnowledgeCard(card.id)?.id, card.id);
  }
  assert.equal(knowledgeCardPath('unknown card'), '/knowledge/unknown%20card');
});

test('08 missing cards resolve safely instead of generating a substitute', () => {
  assert.equal(getKnowledgeCard('missing-card'), undefined);
  assert.equal(getKnowledgeCard(''), undefined);
  assert.equal(getKnowledgeCard(null), undefined);
  assert.equal(getKnowledgeCard(undefined), undefined);
  const detailSource = read('app/knowledge/[cardId].tsx');
  assert.match(detailSource, /That card is not in the offline library/);
  assert.match(detailSource, /Open Crew Knowledge Hub/);
  assert.match(detailSource, /getKnowledgeCard/);

  const contextualLinks = [...tsxFiles('app'), ...tsxFiles('components')].flatMap((file) =>
    [...read(file).matchAll(/<KnowledgeLink\b[^>]*\bcardId="([^"]+)"/g)].map((match) => ({ id: match[1], file })),
  );
  assert.ok(contextualLinks.length >= 10, 'contextual knowledge links are present');
  for (const link of contextualLinks) {
    assert.ok(getKnowledgeCard(link.id), `${link.file} links to missing card ${link.id}`);
  }
});

test('09 all content is bundled and no knowledge module fetches at runtime', () => {
  for (const card of knowledgeCards) {
    assert.ok(!/lorem ipsum/i.test(cardText(card)));
  }
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/\bfetch\s*\(/.test(source), 'no fetch call');
    assert.ok(!/\bXMLHttpRequest\b/.test(source), 'no XHR');
    assert.ok(!/\baxios\b/.test(source), 'no axios');
    assert.ok(!/\bsupabase\b/i.test(source), 'no Supabase client');
    assert.ok(!/WebSocket/.test(source), 'no WebSocket');
    assert.ok(!/AsyncStorage|localStorage|indexedDB/.test(source), 'no device storage read');
  }
});

test('10 every cited source resolves with complete, reviewed metadata', () => {
  assert.equal(Object.keys(knowledgeSources).length, 26);
  for (const [id, source] of Object.entries(knowledgeSources)) {
    assert.equal(source.id, id);
    assert.ok(source.title.trim(), `${id} title`);
    assert.ok(source.publisher.trim(), `${id} publisher`);
    assert.match(source.url, /^https:\/\//, `${id} https url`);
    assert.ok(source.publishedAt === null || source.publishedAt.trim().length >= 4, `${id} publishedAt`);
    assert.match(source.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${id} reviewedAt`);
    assert.ok(source.topic.trim(), `${id} topic`);
    assert.match(source.contentVersion, /^\d+\.\d+(?:\.\d+)?$/, `${id} version`);
  }

  for (const card of knowledgeCards) {
    const resolved = cardReferences(card);
    assert.equal(resolved.length, card.references.length, `${card.id} unresolved reference`);
    assert.equal(resolved.length, resolveKnowledgeSources(card.references).length);
    for (const reference of card.references) assert.ok(knowledgeSources[reference], `${card.id} -> ${reference}`);
  }
  assert.deepEqual(resolveKnowledgeSources(['S01', 'NOT-A-SOURCE']).map((source) => source.id), ['S01']);
});

test('11 content versioning is explicit on cards and sources', () => {
  for (const card of knowledgeCards) {
    assert.equal(card.version, '1.0.0', `${card.id} version`);
    assert.equal(card.lastReviewedAt, '2026-11-17', `${card.id} review date`);
  }
  for (const source of Object.values(knowledgeSources)) {
    assert.equal(source.contentVersion, '1.0');
    assert.equal(source.reviewedAt, '2026-11-17');
  }
  const docs = read('docs/KNOWLEDGE_CONTENT_SOURCES.md');
  assert.match(docs, /Content version/i);
  assert.match(docs, /Reviewed/i);
  for (const id of Object.keys(knowledgeSources)) assert.match(docs, new RegExp(`\\b${id}\\b`), `docs list ${id}`);
});

test('12 approved catalog contains no diagnosis, dosage, or emergency instructions', () => {
  const forbidden = [
    /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|iu)\b/i,
    /\b(?:take|administer|prescribe|inject)\s+\d/i,
    /\b(?:increase|decrease|stop|start)\s+(?:your\s+)?(?:dose|dosage|medication)\b/i,
    /\bcall\s+(?:911|emergency|the doctor)\b/i,
    /\bseek\s+(?:immediate|emergency)\s+(?:care|treatment)\b/i,
    /\byou\s+(?:likely\s+)?have\s+(?:a|an)\s+(?:condition|infection|disease)\b/i,
    /\bthis\s+(?:means|indicates)\s+you\s+have\b/i,
    /\bnormal\s+(?:range|value|reading)s?\s+(?:is|are)\b/i,
    /\bclinical\s+(?:range|threshold)s?\s+(?:is|are)\b/i,
    /\b(?:bpm|mmhg|°c|celsius)\s+(?:is|means)\s+(?:normal|dangerous|safe|unsafe)\b/i,
  ];
  for (const card of knowledgeCards) {
    const text = cardText(card);
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(text), `${card.id} matches ${pattern}`);
    }
  }
  for (const required of ['personal-baseline', 'heart-rate', 'blood-pressure', 'body-temperature', 'sleep-duration', 'symptom-reporting']) {
    assert.ok(getKnowledgeCard(required));
  }
  assert.match(EDUCATIONAL_NOTICE, /^Educational information only\./);
});

test('13 routing never carries private observation values', () => {
  const values = ['81', '116', '74', '36.7', '7.5', 'Avery'];
  for (const card of knowledgeCards) {
    const path = knowledgeCardPath(card.id);
    for (const value of values) assert.ok(!path.includes(value), `${card.id} leaks ${value}`);
  }
  const link = read('components/KnowledgeLink.tsx');
  assert.match(link, /card\.id/);
  assert.ok(!/latestCheckIn|checkIns|readings|syntheticBaseline/.test(link));
  const detail = read('app/knowledge/[cardId].tsx');
  assert.match(detail, /cardId/);
  assert.ok(!/latestCheckIn|checkIns|readings/.test(detail));
});

test('14 knowledge import leaves the assessment engine unchanged', () => {
  assert.equal(DIFFERENCE_THRESHOLD_PERCENT, 10);
  const heartRate = compareToBaseline(checkIn().readings, syntheticBaseline)
    .find((comparison) => comparison.key === 'heartRateBpm');
  assert.equal(heartRate.change, 9);
  assert.equal(heartRate.percentChange, 12.5);

  const assessment = buildAssessment(createReportSnapshot(checkIn()), { source: 'local', now: NOW });
  assert.equal(assessment.overallStatus, 'review');
  assert.equal(assessment.findings.find((finding) => finding.label === 'Heart rate').calculation.relative, '+12.50%');
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/from '@\/lib\/assessment'|from '\.\/assessment'/.test(source));
  }
});

test('15 knowledge import leaves the report queue unchanged', () => {
  const snapshot = createReportSnapshot(checkIn());
  assert.equal(snapshot.checkIn.readings.heartRateBpm, 81);
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/sessionRepository|presentationRepository|buildAssessment|submitReport/.test(source));
    assert.ok(!/from '@\/state\//.test(source));
  }
});

test('16 knowledge import leaves crew identity unchanged', () => {
  const raw = encodeCrewQrPayload('ASTRA-01');
  assert.deepEqual(parseCrewQrPayload(raw, ['ASTRA-01']), { ok: true, crewId: 'ASTRA-01' });
  assert.deepEqual(parseCrewQrPayload(raw, ['OTHER-01']), { ok: false, reason: 'unknown_crew' });
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/crewIdentity|parseCrewQrPayload|encodeCrewQrPayload|crewProfile/.test(source));
  }
});

test('17 knowledge import leaves replay behavior unchanged', () => {
  assert.equal(REPLAY_PLAYBACK_MS, 1800);
  assert.equal(clampReplayIndex(4, 3), 2);
  assert.equal(clampReplayIndex(-1, 3), 0);
  assert.equal(replayStep(0, 3, 'next'), 1);
  assert.equal(replayStep(2, 3, 'next'), 2);
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/replayStep|buildReplayTimeline|REPLAY_MAX_GAP_DAYS/.test(source));
  }
});

test('18 knowledge does not add a milestone or second gamification path', () => {
  assert.equal(MILESTONES.length, 6);
  assert.ok(MILESTONES.every((milestone) => !/knowledge|library|competenc/i.test(milestone.title)));
  assert.ok(MILESTONES.every((milestone) => milestone.id !== 'knowledge-explorer'));
  const engagementSource = read('lib/engagement.ts');
  assert.ok(!/knowledge/i.test(engagementSource));
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/lib\/engagement|MILESTONES|recordEngagement/.test(source));
  }
});

test('19 knowledge content is independent of the synthetic demo session', () => {
  assert.equal(getKnowledgeCard('synthetic-demo-data').contentClassification, 'App explanation');
  assert.equal(searchKnowledgeCards('fictional').length > 0, true);
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/useSession|PresentationSession|presentationRepository|crewDemoRepository/.test(source));
    assert.ok(!/syntheticBaseline|fixtures\/crew/.test(source));
  }
});

test('20 knowledge content is independent of the local stored session', () => {
  for (const source of knowledgeSourceFiles()) {
    assert.ok(!/sessionRepository|localStorage|indexedDB|AsyncStorage|useSession/.test(source));
  }
  const before = knowledgeCards.map((card) => card.id);
  searchKnowledgeCards('report');
  filterKnowledgeCards('spaceflight', 'hazard');
  relatedKnowledgeCards(getKnowledgeCard('heart-rate'));
  assert.deepEqual(knowledgeCards.map((card) => card.id), before);
  assert.ok(knowledgeCards.every((card) => !/CHK-|RPT-/.test(cardText(card))));
  assert.equal(evaluateMilestones([], { journeyVisible: false, events: [] }).length, MILESTONES.length);
});
