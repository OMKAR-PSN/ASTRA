import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_ENGAGEMENT,
  MILESTONES,
  addEngagementEvent,
  buildJourneySummary,
  calculateCheckInDays,
  checkInDayKey,
  deriveRoutineProgress,
  evaluateMilestones,
  formatUtcDayKey,
  getRecentParticipation,
  normalizeEngagement,
  setJourneyVisibility,
  utcDayKeyFromTime,
} from '../lib/engagement.ts';
import { normalizeStoredSession } from '../lib/sessionRepositoryContract.ts';
import { createCrewDemoRepository } from '../lib/crewDemoRepository.ts';
import { createPresentationRepository } from '../lib/presentationRepository.ts';
import { buildDemoCheckIns } from '../fixtures/demoCrew.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const engagementSource = source('lib/engagement.ts');

const readings = (overrides = {}) => ({
  heartRateBpm: 72,
  systolicMmHg: 116,
  diastolicMmHg: 74,
  temperatureC: 36.7,
  sleepHours: 7.5,
  mood: 4,
  stress: 2,
  ...overrides,
});

const record = (id, recordedAt, overrides = {}) => ({
  id,
  recordedAt,
  readings: readings(overrides),
  symptoms: [],
  activityNote: '',
});

const day = (index) => `2026-11-${String(4 + index).padStart(2, '0')}T07:00:00.000Z`;
const days = (count) => Array.from({ length: count }, (_, index) => record(`CHK-${String(index + 1).padStart(3, '0')}`, day(index)));
const summaryFor = (checkIns, engagement = { ...DEFAULT_ENGAGEMENT, events: [] }, referenceTime = Date.parse(day(Math.max(checkIns.length - 1, 0)))) =>
  buildJourneySummary({ checkIns, engagement, referenceTime });
const milestone = (summary, id) => summary.milestones.find((item) => item.id === id);
const forged = (...kinds) => ({
  ...DEFAULT_ENGAGEMENT,
  events: kinds.map((kind) => ({ kind, recordedAt: '2026-11-04T09:00:00.000Z' })),
});

test('01 a first valid check-in unlocks only First Log and completes the daily routine', () => {
  const empty = summaryFor([], DEFAULT_ENGAGEMENT, Date.parse('2026-11-04T09:00:00.000Z'));
  assert.equal(empty.distinctDays, 0);
  assert.equal(empty.routine.complete, false);
  assert.equal(empty.routine.completedSteps, 0);
  assert.deepEqual(empty.recent, []);
  assert.equal(empty.unlockedCount, 0);
  assert.equal(empty.nextAction.href, '/guided-check-in');

  const checkIns = [record('CHK-A', '2026-11-04T07:00:00.000Z')];
  const summary = summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2026-11-04T07:00:00.000Z'));
  assert.equal(summary.distinctDays, 1);
  assert.equal(summary.routine.complete, true);
  assert.equal(summary.routine.completedSteps, 4);
  assert.equal(summary.routine.recordsToday, 1);
  assert.deepEqual(summary.routine.steps.map((step) => step.complete), [true, true, true, true]);
  assert.equal(milestone(summary, 'first-log').unlocked, true);
  assert.equal(milestone(summary, 'first-log').progressText, '1 valid check-in recorded.');
  assert.equal(milestone(summary, 'routine-builder').unlocked, false);
  assert.equal(milestone(summary, 'consistent-explorer').unlocked, false);
  assert.equal(summary.unlockedCount, 1);
  assert.equal(summary.nextAction.key, 'assessment');
});

test('02 three distinct UTC days unlock Routine Builder without requiring consecutive days', () => {
  const checkIns = [
    record('CHK-A', '2026-11-04T23:59:59.000Z'),
    record('CHK-B', '2026-11-05T00:00:01.000Z'),
    record('CHK-C', '2026-11-20T12:00:00.000Z'),
  ];
  const summary = summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2026-11-20T12:00:00.000Z'));
  assert.equal(summary.distinctDays, 3);
  assert.equal(checkInDayKey('2026-11-04T23:59:59.000Z'), '2026-11-04');
  assert.equal(checkInDayKey('2026-11-05T00:00:01.000Z'), '2026-11-05');
  assert.equal(milestone(summary, 'first-log').unlocked, true);
  assert.equal(milestone(summary, 'routine-builder').unlocked, true);
  assert.equal(milestone(summary, 'routine-builder').progressText, '3 of 3 check-in days completed.');
  assert.equal(milestone(summary, 'consistent-explorer').unlocked, false);
  assert.equal(milestone(summary, 'consistent-explorer').progressText, '3 of 7 check-in days completed.');
});

test('03 seven distinct days unlock Consistent Explorer even with a long gap', () => {
  const checkIns = [
    ...days(3),
    record('CHK-GAP', '2026-12-24T07:00:00.000Z'),
    record('CHK-H', '2027-01-02T07:00:00.000Z'),
    record('CHK-I', '2027-01-11T07:00:00.000Z'),
    record('CHK-J', '2027-01-20T07:00:00.000Z'),
  ];
  const summary = summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2027-01-20T07:00:00.000Z'));
  assert.equal(summary.distinctDays, 7);
  assert.equal(milestone(summary, 'consistent-explorer').unlocked, true);
  assert.equal(milestone(summary, 'consistent-explorer').progressText, '7 of 7 check-in days completed.');
  assert.equal(summary.unlockedCount, 3);
  assert.match(summary.encouragement, /recorded|growing/i);
});

test('04 multiple check-ins on one day count as one day and are never double credited', () => {
  const checkIns = [
    record('CHK-A', '2026-11-04T06:00:00.000Z'),
    record('CHK-B', '2026-11-04T12:00:00.000Z'),
    record('CHK-C', '2026-11-04T20:00:00.000Z'),
  ];
  const { days: grouped, distinctDays } = calculateCheckInDays(checkIns);
  assert.deepEqual(grouped, [{ key: '2026-11-04', count: 3 }]);
  assert.equal(distinctDays, 1);
  const summary = summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2026-11-04T20:00:00.000Z'));
  assert.equal(milestone(summary, 'routine-builder').current, 1);
  assert.equal(milestone(summary, 'routine-builder').unlocked, false);
  assert.equal(summary.routine.recordsToday, 3);
  assert.equal(summary.routine.completedSteps, 4);
});

test('05 duplicate record ids are deduplicated before days and activity are derived', () => {
  const checkIns = [
    record('CHK-A', '2026-11-04T07:00:00.000Z'),
    record('CHK-A', '2026-11-05T07:00:00.000Z'),
    record('CHK-B', '2026-11-06T07:00:00.000Z'),
  ];
  const { days: grouped, distinctDays } = calculateCheckInDays(checkIns);
  assert.equal(distinctDays, 2);
  assert.deepEqual(grouped.map((entry) => entry.key), ['2026-11-04', '2026-11-06']);
  assert.deepEqual(getRecentParticipation(checkIns).map((entry) => entry.id), ['CHK-B', 'CHK-A']);
  assert.equal(summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2026-11-06T07:00:00.000Z')).milestones.find((item) => item.id === 'routine-builder').current, 2);
});

test('06 invalid timestamps are excluded instead of fabricating or shifting a day', () => {
  const checkIns = [
    record('CHK-BAD-1', 'not-a-date'),
    record('CHK-GOOD', '2026-11-07T07:00:00.000Z'),
    record('CHK-BAD-2', ''),
  ];
  assert.equal(checkInDayKey('not-a-date'), null);
  assert.equal(checkInDayKey(''), null);
  const { days: grouped, distinctDays } = calculateCheckInDays(checkIns);
  assert.deepEqual(grouped, [{ key: '2026-11-07', count: 1 }]);
  assert.equal(distinctDays, 1);
  assert.deepEqual(getRecentParticipation(checkIns).map((entry) => entry.id), ['CHK-GOOD']);
  const summary = summaryFor(checkIns, DEFAULT_ENGAGEMENT, Date.parse('2026-11-07T07:00:00.000Z'));
  assert.equal(summary.routine.recordsToday, 1);
  assert.equal(milestone(summary, 'first-log').unlocked, true);
});

test('07 empty history produces no fabricated milestones, days, participation, or routine credit', () => {
  const summary = summaryFor([], DEFAULT_ENGAGEMENT, Date.parse('2026-11-04T09:00:00.000Z'));
  assert.deepEqual(summary.days, []);
  assert.equal(summary.distinctDays, 0);
  assert.deepEqual(summary.recent, []);
  assert.equal(summary.unlockedCount, 0);
  assert.equal(summary.routine.recordsToday, 0);
  assert.deepEqual(summary.routine.steps.map((step) => step.label), ['Start check-in', 'Record observations', 'Review your entries', 'Save check-in']);
  assert.equal(summary.milestones.some((item) => item.unlocked), false);
  assert.match(summary.encouragement, /first check-in starts/i);
  assert.equal(summary.nextAction.key, 'check-in');
});

test('08 the synthetic demo fixture unlocks participation from its own records only', () => {
  const fixture = buildDemoCheckIns();
  const summary = summaryFor(fixture, DEFAULT_ENGAGEMENT, Date.parse('2026-11-15T07:40:00.000Z'));
  assert.equal(fixture.length, 12);
  assert.equal(summary.distinctDays, 12);
  assert.equal(milestone(summary, 'first-log').unlocked, true);
  assert.equal(milestone(summary, 'routine-builder').unlocked, true);
  assert.equal(milestone(summary, 'consistent-explorer').unlocked, true);
  assert.equal(milestone(summary, 'record-explorer').unlocked, false);
  assert.equal(milestone(summary, 'data-explorer').unlocked, false);
  assert.equal(milestone(summary, 'report-explorer').unlocked, false);
  assert.equal(summary.unlockedCount, 3);
  assert.deepEqual(summary.recent.map((entry) => entry.id), ['CHK-012', 'CHK-011', 'CHK-010', 'CHK-009']);
});

test('09 persistent local history keeps check-in days and interaction events across a stored reload', () => {
  const checkIns = days(3);
  const engagement = { journeyVisible: true, events: [{ kind: 'replay-explored', recordedAt: '2026-11-06T08:00:00.000Z' }] };
  const before = summaryFor(checkIns, engagement, Date.parse(day(2)));
  const stored = JSON.parse(JSON.stringify({ checkIns, reports: [], engagement }));
  const reloaded = normalizeStoredSession(stored);
  const after = summaryFor(reloaded.checkIns, reloaded.engagement, Date.parse(day(2)));
  assert.deepEqual(after, before);
  assert.equal(after.distinctDays, 3);
  assert.equal(milestone(after, 'record-explorer').unlocked, true);
  assert.equal(milestone(after, 'record-explorer').progressText, 'Explored on 6 Nov 2026.');
});

test('10 separate identities and demo sessions never share engagement progress', async () => {
  const crewA = createCrewDemoRepository();
  const crewB = createCrewDemoRepository();
  await crewA.recordEngagement('calculation-opened', '2026-11-16T09:00:00.000Z');
  const loadedB = await crewB.load();
  assert.deepEqual(loadedB.engagement.events, []);
  assert.equal((await crewA.load()).engagement.events.length, 1);

  const presentation = createPresentationRepository();
  assert.deepEqual((await presentation.load()).engagement.events, []);
  const local = [
    record('CHK-LOCAL', '2026-11-04T07:00:00.000Z'),
  ];
  const localSummary = summaryFor(local, DEFAULT_ENGAGEMENT, Date.parse('2026-11-04T07:00:00.000Z'));
  const demoSummary = summaryFor(buildDemoCheckIns(), DEFAULT_ENGAGEMENT, Date.parse('2026-11-15T07:40:00.000Z'));
  assert.equal(localSummary.recent.some((entry) => entry.id === 'CHK-012'), false);
  assert.equal(demoSummary.recent.some((entry) => entry.id === 'CHK-LOCAL'), false);
});

test('11 repeated calculation-detail openings grant one learning milestone', () => {
  const checkIns = days(1);
  let engagement = DEFAULT_ENGAGEMENT;
  engagement = addEngagementEvent(engagement, 'calculation-opened', '2026-11-04T09:00:00.000Z');
  const once = engagement;
  engagement = addEngagementEvent(engagement, 'calculation-opened', '2026-11-04T10:00:00.000Z');
  assert.equal(engagement, once);
  assert.equal(engagement.events.length, 1);
  const summary = summaryFor(checkIns, engagement, Date.parse(day(0)));
  assert.equal(milestone(summary, 'data-explorer').unlocked, true);
  assert.equal(milestone(summary, 'data-explorer').progressText, 'Explored on 4 Nov 2026.');
  assert.equal(milestone(summary, 'report-explorer').unlocked, false);
});

test('12 repeated replay explorations grant one learning milestone and never alter records', () => {
  const checkIns = days(2);
  const before = JSON.parse(JSON.stringify(checkIns));
  let engagement = DEFAULT_ENGAGEMENT;
  engagement = addEngagementEvent(engagement, 'replay-explored', '2026-11-05T08:00:00.000Z');
  engagement = addEngagementEvent(engagement, 'replay-explored', '2026-11-05T09:00:00.000Z');
  const summary = summaryFor(checkIns, engagement, Date.parse(day(1)));
  assert.equal(engagement.events.length, 1);
  assert.equal(milestone(summary, 'record-explorer').unlocked, true);
  assert.equal(summary.unlockedCount, 2);
  assert.deepEqual(checkIns, before);
  assert.match(milestone(summary, 'record-explorer').description, /recorded health history/i);
});

test('13 stored engagement events are idempotent and normalized after reload', () => {
  const duplicated = {
    journeyVisible: true,
    events: [
      { kind: 'report-explained', recordedAt: '2026-11-04T09:00:00.000Z' },
      { kind: 'report-explained', recordedAt: '2026-11-05T09:00:00.000Z' },
      { kind: 'unknown-kind', recordedAt: '2026-11-05T09:00:00.000Z' },
      { kind: 'replay-explored', recordedAt: 'not-a-date' },
    ],
  };
  const normalized = normalizeEngagement(duplicated);
  assert.deepEqual(normalized.events, [{ kind: 'report-explained', recordedAt: '2026-11-04T09:00:00.000Z' }]);
  assert.equal(normalizeEngagement(null).journeyVisible, true);
  assert.deepEqual(normalizeEngagement({ journeyVisible: 'yes', events: 'nope' }).events, []);
  const summary = summaryFor(days(1), normalized, Date.parse(day(0)));
  assert.equal(summary.unlockedCount, 2);
  assert.equal(milestone(summary, 'report-explorer').unlocked, true);
});

test('14 hiding gamification stops new events without changing check-ins, routine, or earned milestones', () => {
  const checkIns = days(7);
  const visible = forged('replay-explored');
  const hidden = setJourneyVisibility(visible, false);
  assert.equal(hidden.journeyVisible, false);
  assert.equal(addEngagementEvent(hidden, 'calculation-opened', '2026-11-06T09:00:00.000Z'), hidden);
  assert.deepEqual(hidden.events, visible.events);

  const hiddenSummary = summaryFor(checkIns, hidden, Date.parse(day(6)));
  const visibleSummary = summaryFor(checkIns, visible, Date.parse(day(6)));
  assert.equal(hiddenSummary.distinctDays, 7);
  assert.equal(hiddenSummary.routine.complete, true);
  assert.deepEqual(hiddenSummary.days, visibleSummary.days);
  assert.equal(milestone(hiddenSummary, 'consistent-explorer').unlocked, true);
  assert.equal(milestone(hiddenSummary, 'record-explorer').unlocked, true);
  assert.equal(milestone(hiddenSummary, 'data-explorer').unlocked, false);

  const shown = setJourneyVisibility(hidden, true);
  assert.equal(shown.journeyVisible, true);
  assert.deepEqual(shown.events, visible.events);
  assert.equal(normalizeStoredSession({ checkIns, reports: [], engagement: shown }).engagement.journeyVisible, true);
});

test('15 rewards depend on participation days and interactions, never on health values', () => {
  const dates = [day(0), day(1), day(2)];
  const low = dates.map((recordedAt, index) => record(`CHK-${index}`, recordedAt, { heartRateBpm: 58, stress: 1, sleepHours: 9 }));
  const high = dates.map((recordedAt, index) => record(`CHK-${index}`, recordedAt, { heartRateBpm: 118, stress: 5, sleepHours: 3 }));
  const lowSummary = summaryFor(low, DEFAULT_ENGAGEMENT, Date.parse(day(2)));
  const highSummary = summaryFor(high, DEFAULT_ENGAGEMENT, Date.parse(day(2)));
  assert.deepEqual(lowSummary.milestones, highSummary.milestones);
  assert.deepEqual(lowSummary.days, highSummary.days);
  assert.deepEqual(lowSummary.routine, highSummary.routine);
  assert.deepEqual(lowSummary.recent, highSummary.recent);
  assert.equal(lowSummary.encouragement, highSummary.encouragement);
  assert.doesNotMatch(engagementSource, /heartRateBpm|systolicMmHg|diastolicMmHg|temperatureC|sleepHours|mood|stress/);
});

test('16 engagement evaluation never changes the assessment result', () => {
  const checkIn = record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: 96, sleepHours: 5 });
  const snapshot = createReportSnapshot(checkIn);
  const before = JSON.parse(JSON.stringify(snapshot));
  const summary = summaryFor([checkIn], forged('calculation-opened', 'replay-explored'), Date.parse(day(0)));
  assert.deepEqual(snapshot, before);
  assert.equal(snapshot.comparisons.length > 0, true);
  assert.equal(summary.unlockedCount >= 1, true);
  assert.doesNotMatch(engagementSource, /from '@\/lib\/(comparison|assessment|snapshot)'/);
  assert.doesNotMatch(engagementSource, /DIFFERENCE_THRESHOLD_PERCENT/);
});

test('17 the engagement model creates no reports and never touches the report record', () => {
  assert.doesNotMatch(engagementSource, /createReportSnapshot|confirmReport|updateDelivery/);
  assert.doesNotMatch(engagementSource, /ReportRecord|reports\s*:/);
  const checkIns = days(1);
  const before = JSON.parse(JSON.stringify(checkIns));
  summaryFor(checkIns, forged('report-explained'), Date.parse(day(0)));
  assert.deepEqual(checkIns, before);
  assert.doesNotMatch(engagementSource, /saveCheckIn/);
});

test('18 engagement never transmits data to the simulated receiver', () => {
  assert.doesNotMatch(engagementSource, /fetch\(|XMLHttpRequest|WebSocket|receiver|submitReport|fastify/i);
  assert.doesNotMatch(engagementSource, /@\/lib\/receiver/);
  assert.doesNotMatch(engagementSource, /https?:\/\//);
});

test('19 engagement never mutates the outbox or delivery state', async () => {
  assert.doesNotMatch(engagementSource, /outbox\s*:|updateDelivery|status: 'acknowledged'/);
  const repository = createCrewDemoRepository();
  const before = await repository.load();
  await repository.recordEngagement('report-explained', '2026-11-16T09:00:00.000Z');
  const after = await repository.load();
  assert.deepEqual(after.reports, before.reports);
  assert.deepEqual(after.checkIns, before.checkIns);
});

test('20 every journey calculation is local, deterministic, and offline', () => {
  assert.doesNotMatch(engagementSource, /fetch\(|XMLHttpRequest|WebSocket|indexedDB|localStorage|AsyncStorage/);
  assert.doesNotMatch(engagementSource, /sessionRepository|crewDemoRepository|receiver/);
  assert.doesNotMatch(engagementSource, /Date\.now|Math\.random/);
  const checkIns = days(3);
  const referenceTime = Date.parse(day(2));
  const first = summaryFor(checkIns, DEFAULT_ENGAGEMENT, referenceTime);
  const second = summaryFor(JSON.parse(JSON.stringify(checkIns)), DEFAULT_ENGAGEMENT, referenceTime);
  assert.deepEqual(first, second);
  assert.equal(utcDayKeyFromTime(referenceTime), '2026-11-06');
  assert.equal(formatUtcDayKey('2026-11-06'), '6 Nov 2026');
});

test('21 no cross-session engagement leakage through repository reloads', async () => {
  const crewA = createCrewDemoRepository();
  const crewB = createCrewDemoRepository();
  await crewA.recordEngagement('replay-explored', '2026-11-16T08:00:00.000Z');
  await crewA.recordEngagement('calculation-opened', '2026-11-16T08:05:00.000Z');
  await crewB.setJourneyVisible(false);
  const loadedA = await crewA.load();
  const loadedB = await crewB.load();
  assert.deepEqual(loadedA.engagement.events.map((event) => event.kind), ['replay-explored', 'calculation-opened']);
  assert.deepEqual(loadedB.engagement.events, []);
  assert.equal(loadedB.engagement.journeyVisible, false);
  assert.notEqual(loadedA.checkIns[0].id, undefined);
  assert.deepEqual(loadedA.checkIns.map((item) => item.id), loadedB.checkIns.map((item) => item.id));
});

test('22 progress, preferences, and milestones stay stable after repeated reloads', async () => {
  const repository = createCrewDemoRepository();
  await repository.recordEngagement('report-explained', '2026-11-16T09:00:00.000Z');
  await repository.recordEngagement('report-explained', '2026-11-16T09:05:00.000Z');
  await repository.setJourneyVisible(false);
  const first = await repository.load();
  const second = await repository.load();
  assert.deepEqual(first, second);
  assert.equal(first.engagement.events.length, 1);
  assert.equal(first.engagement.journeyVisible, false);
  await repository.setJourneyVisible(true);
  const third = await repository.load();
  assert.equal(third.engagement.journeyVisible, true);
  assert.deepEqual(third.engagement.events, first.engagement.events);
  const summary = summaryFor(third.checkIns, third.engagement, Date.parse('2026-11-15T07:40:00.000Z'));
  assert.equal(milestone(summary, 'report-explorer').unlocked, true);
  assert.equal(summary.unlockedCount, 4);
  assert.equal(MILESTONES.length, 6);
  assert.equal(MILESTONES.filter((item) => item.category === 'participation').length, 3);
  assert.equal(MILESTONES.filter((item) => item.category === 'learning').length, 3);
});
