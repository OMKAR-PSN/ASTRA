import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  REPLAY_MAX_GAP_DAYS,
  REPLAY_PLAYBACK_MS,
  buildDemoStory,
  buildReplayTimeline,
  clampReplayIndex,
  replayStep,
} from '../lib/replay.ts';
import { buildDemoCheckIns } from '../fixtures/demoCrew.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

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

const record = (id, recordedAt, overrides = {}, meta = {}) => ({
  id,
  recordedAt,
  readings: readings(overrides),
  symptoms: [],
  activityNote: '',
  ...meta,
});

const localTimeline = (checkIns, options = {}) => buildReplayTimeline({ checkIns, source: 'local', ...options });
const demo = (missionDay = 183) => buildReplayTimeline({ checkIns: buildDemoCheckIns(), source: 'demo', missionDay });

test('01 observations are ordered chronologically regardless of storage order', () => {
  const timeline = localTimeline([
    record('CHK-C', '2026-11-06T07:00:00.000Z'),
    record('CHK-A', '2026-11-04T07:00:00.000Z'),
    record('CHK-B', '2026-11-05T07:00:00.000Z'),
  ]);
  assert.deepEqual(timeline.frames.map((frame) => frame.id), ['CHK-A', 'CHK-B', 'CHK-C']);
  assert.deepEqual(timeline.frames.map((frame) => frame.index), [0, 1, 2]);
  assert.equal(timeline.firstId, 'CHK-A');
  assert.equal(timeline.latestId, 'CHK-C');
});

test('02 records sharing a timestamp keep a stable input order', () => {
  const timeline = localTimeline([
    record('CHK-X', '2026-11-04T07:40:00.000Z', { heartRateBpm: 75 }),
    record('CHK-Y', '2026-11-04T07:40:00.000Z', { heartRateBpm: 80 }),
    record('CHK-Z', '2026-11-04T07:40:00.000Z', { heartRateBpm: 85 }),
  ]);
  assert.deepEqual(timeline.frames.map((frame) => frame.id), ['CHK-X', 'CHK-Y', 'CHK-Z']);
  assert.equal(timeline.days.length, 1);
  assert.equal(timeline.days[0].recordCount, 3);
  assert.deepEqual(timeline.frames[2].eligibleCheckIns.map((item) => item.id), ['CHK-X', 'CHK-Y', 'CHK-Z']);
});

test('03 mission days are grouped and derived from the fictional fixture', () => {
  const timeline = demo();
  assert.equal(timeline.frames.length, 12);
  assert.equal(timeline.days.length, 12);
  assert.equal(timeline.days[0].dateText, '4 Nov 2026');
  assert.equal(timeline.days.at(-1).dateText, '15 Nov 2026');
  assert.equal(timeline.days[0].flightDay, 172);
  assert.equal(timeline.days.at(-1).flightDay, 183);
  const reviewDay = timeline.days.find((day) => day.frameIds.includes('CHK-005'));
  assert.equal(reviewDay.flightDay, 176);
  assert.equal(reviewDay.review, true);
  const local = localTimeline([record('CHK-A', '2026-11-04T07:00:00.000Z')]);
  assert.equal(local.days[0].flightDay, null);
  assert.match(local.missionDayNote, /not stored/i);
});

test('04 missing calendar days are explicit and very long gaps are omitted', () => {
  const timeline = localTimeline([
    record('CHK-A', '2026-11-04T07:00:00.000Z'),
    record('CHK-B', '2026-11-07T07:00:00.000Z'),
  ]);
  assert.deepEqual(timeline.days.map((day) => day.dateKey), ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(timeline.days.map((day) => day.empty), [false, true, true, false]);
  assert.equal(timeline.days[1].recordCount, 0);
  assert.equal(timeline.gapsOmitted, false);

  const farApart = localTimeline([
    record('CHK-A', '2026-01-01T07:00:00.000Z'),
    record('CHK-B', '2026-12-01T07:00:00.000Z'),
  ]);
  assert.equal(farApart.days.length, 2);
  assert.equal(farApart.gapsOmitted, true);
  assert.equal(REPLAY_MAX_GAP_DAYS < 300, true);
});

test('05 empty history is represented without fabricated frames', () => {
  const timeline = localTimeline([]);
  assert.equal(timeline.empty, true);
  assert.equal(timeline.total, 0);
  assert.deepEqual(timeline.frames, []);
  assert.deepEqual(timeline.days, []);
  assert.equal(timeline.firstId, null);
  assert.equal(timeline.latestId, null);
  assert.deepEqual(buildDemoStory(timeline), []);
});

test('06 a single observation is its own first and latest frame', () => {
  const timeline = localTimeline([record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: 92 })]);
  assert.equal(timeline.total, 1);
  assert.equal(timeline.frames[0].isLatest, true);
  assert.equal(timeline.frames[0].excludedCount, 0);
  assert.equal(timeline.frames[0].eligibleCheckIns.length, 1);
  assert.equal(timeline.frames[0].metrics.find((metric) => metric.key === 'heartRateBpm').state, 'observed');
  assert.match(timeline.frames[0].cutoffNote, /No later records exist/);
});

test('07 multiple observations expose cumulative eligibility counts', () => {
  const timeline = demo();
  assert.deepEqual(timeline.frames.map((frame) => frame.eligibleCheckIns.length), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(timeline.frames.map((frame) => frame.excludedCount), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.equal(timeline.frames.at(-1).isLatest, true);
});

test('08 the same records and selection produce an identical frame', () => {
  const records = buildDemoCheckIns();
  const first = buildReplayTimeline({ checkIns: records, source: 'demo', missionDay: 183 });
  const second = buildReplayTimeline({ checkIns: buildDemoCheckIns(), source: 'demo', missionDay: 183 });
  assert.deepEqual(first.frames[4], second.frames[4]);
  assert.deepEqual(first.days, second.days);
  assert.equal(first.frames[4].assessment.recordedAt, records[4].recordedAt);
});

test('09 the historical cutoff excludes every later observation', () => {
  const timeline = demo();
  const frame = timeline.frames[4];
  assert.equal(frame.id, 'CHK-005');
  assert.deepEqual(frame.eligibleCheckIns.map((item) => item.id), ['CHK-001', 'CHK-002', 'CHK-003', 'CHK-004', 'CHK-005']);
  assert.equal(frame.eligibleCheckIns.some((item) => item.id === 'CHK-006'), false);
  assert.match(frame.cutoffNote, /7 later observations excluded/);
  assert.match(frame.baselineNote, /applied retrospectively/);
});

test('10 earlier frames never borrow a future measurement', () => {
  const timeline = localTimeline([
    record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: null }),
    record('CHK-B', '2026-11-05T07:00:00.000Z', { heartRateBpm: 101 }),
  ]);
  const first = timeline.frames[0];
  const metric = first.metrics.find((item) => item.key === 'heartRateBpm');
  assert.equal(metric.state, 'missing');
  assert.equal(metric.value, null);
  assert.equal(metric.valueText, 'Not recorded');
  assert.equal(first.assessment.findings.find((item) => item.key === 'heartRateBpm').status, 'missing');
  assert.doesNotMatch(JSON.stringify(first), /101/);

  const carry = localTimeline([
    record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: 90 }),
    record('CHK-B', '2026-11-05T07:00:00.000Z', { heartRateBpm: null }),
  ]).frames[1];
  const carried = carry.metrics.find((item) => item.key === 'heartRateBpm');
  assert.equal(carried.state, 'last-available');
  assert.equal(carried.value, 90);
  assert.match(carried.stateLabel, /not part of this observation/);
  assert.match(carried.stateLabel, /4 Nov 2026/);
});

test('11 the existing 10 percent rule is unchanged at the boundary', () => {
  const atBoundary = localTimeline([record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: 79.2 })]);
  const justInside = localTimeline([record('CHK-B', '2026-11-04T07:00:00.000Z', { heartRateBpm: 79.1 })]);
  assert.equal(atBoundary.frames[0].assessment.thresholdPercent, 10);
  assert.equal(atBoundary.frames[0].assessment.findings.find((item) => item.key === 'heartRateBpm').status, 'review');
  assert.equal(justInside.frames[0].assessment.findings.find((item) => item.key === 'heartRateBpm').status, 'within-range');
  assert.match(atBoundary.frames[0].metrics[0].stateLabel, /Recorded in this observation/);
});

test('12 missing readings and self-reported metrics never fabricate a baseline', () => {
  const timeline = localTimeline([record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: null, mood: null })]);
  const frame = timeline.frames[0];
  const heartRate = frame.metrics.find((item) => item.key === 'heartRateBpm');
  const mood = frame.metrics.find((item) => item.key === 'mood');
  assert.equal(heartRate.state, 'missing');
  assert.equal(heartRate.value, null);
  assert.equal(mood.state, 'missing');
  assert.equal(mood.baseline, null);
  assert.equal(mood.baselineText, null);
  assert.equal(frame.assessment.findings.find((item) => item.key === 'mood').status, 'missing');
  assert.doesNotMatch(JSON.stringify(frame), /NaN|undefined/);
});

test('13 the synthetic fixture is deterministic and never accumulates mutations', () => {
  const first = buildDemoCheckIns();
  const second = buildDemoCheckIns();
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
  first[0].readings.heartRateBpm = 200;
  first[0].symptoms.push('Mutated');
  assert.equal(buildDemoCheckIns()[0].readings.heartRateBpm, 71);
  assert.deepEqual(buildDemoCheckIns()[0].symptoms, []);
  const timeline = demo();
  const story = buildDemoStory(timeline);
  assert.equal(story[0].frameId, 'CHK-001');
  assert.equal(story.at(-1).action, 'overview');
  assert.equal(story.some((step) => step.id === 'review'), true);
});

test('14 the replay module is a read-only projection with no repository writes', () => {
  const replaySource = source('lib/replay.ts');
  assert.doesNotMatch(replaySource, /saveCheckIn|confirmReport|updateDelivery/);
  assert.doesNotMatch(replaySource, /sessionRepository|crewDemoRepository|localStorage|indexedDB|fetch\(/);
  const records = [record('CHK-A', '2026-11-04T07:00:00.000Z', {}, { symptoms: ['Tired'] })];
  const before = JSON.parse(JSON.stringify(records));
  const timeline = localTimeline(records);
  assert.deepEqual(records, before);
  timeline.frames[0].checkIn.symptoms.push('Mutated');
  assert.deepEqual(records, before);
});

test('15 no reports are created and existing outbox events are only read', () => {
  const checkIn = record('CHK-A', '2026-11-04T07:00:00.000Z');
  const report = {
    id: 'RPT-1',
    checkInId: 'CHK-A',
    createdAt: '2026-11-04T09:00:00.000Z',
    status: 'queued',
    snapshot: createReportSnapshot(checkIn),
    receipt: null,
    retryNote: null,
  };
  const timeline = localTimeline([checkIn, record('CHK-B', '2026-11-05T07:00:00.000Z')], { reports: [report] });
  assert.equal(timeline.frames[0].events.filter((event) => event.type === 'report').length, 1);
  assert.equal(timeline.frames[0].events.filter((event) => event.type === 'receipt').length, 0);
  assert.equal(timeline.frames[1].events.filter((event) => event.type === 'report').length, 0);
  assert.equal(timeline.total, 2);
});

test('16 duplicate report and receipt states are preserved unchanged', () => {
  const checkIn = record('CHK-A', '2026-11-04T07:00:00.000Z');
  const baseReport = {
    checkInId: 'CHK-A',
    createdAt: '2026-11-04T09:00:00.000Z',
    snapshot: createReportSnapshot(checkIn),
    retryNote: null,
  };
  const reports = [
    { ...baseReport, id: 'RPT-1', status: 'failed', receipt: null },
    { ...baseReport, id: 'RPT-2', status: 'acknowledged', receipt: { receivedAt: '2026-11-04T10:00:00.000Z', receiverReference: 'RX-42' } },
  ];
  const before = JSON.parse(JSON.stringify(reports));
  const timeline = localTimeline([checkIn], { reports });
  const frame = timeline.frames[0];
  assert.equal(frame.events.some((event) => event.type === 'report'), true);
  assert.equal(frame.events.some((event) => event.type === 'receipt'), true);
  assert.match(frame.events.find((event) => event.type === 'receipt').detail, /RX-42/);
  assert.deepEqual(reports, before);
});

test('17 local and demo sessions stay isolated', () => {
  const local = localTimeline([record('CHK-LOCAL', '2026-11-04T07:00:00.000Z')]);
  const demoHistory = demo();
  assert.equal(local.source, 'local');
  assert.equal(demoHistory.source, 'demo');
  assert.equal(local.frames[0].provenance.source, 'local');
  assert.equal(demoHistory.frames[0].provenance.source, 'demo');
  assert.equal(demoHistory.frames.some((frame) => frame.id === 'CHK-LOCAL'), false);
  assert.doesNotMatch(local.frames[0].provenance.sourceText, /fixture|session only/i);
  assert.match(demoHistory.frames[0].provenance.sourceText, /Fictional crew fixture/);
  assert.notEqual(local.sourceNote, demoHistory.sourceNote);
});

test('18 playback boundaries clamp at the first and last frame', () => {
  assert.equal(clampReplayIndex(-5, 12), 0);
  assert.equal(clampReplayIndex(99, 12), 11);
  assert.equal(clampReplayIndex(Number.NaN, 12), 0);
  assert.equal(replayStep(0, 12, 'previous'), 0);
  assert.equal(replayStep(0, 12, 'next'), 1);
  assert.equal(replayStep(11, 12, 'next'), 11);
  assert.equal(replayStep(11, 12, 'previous'), 10);
  assert.equal(replayStep(5, 12, 'first'), 0);
  assert.equal(replayStep(5, 12, 'latest'), 11);
  assert.equal(replayStep(0, 0, 'next'), 0);
});

test('19 playback timing is safe and the screen cleans up timers', () => {
  assert.equal(REPLAY_PLAYBACK_MS >= 1000 && REPLAY_PLAYBACK_MS <= 2000, true);
  const screen = source('app/replay.tsx');
  assert.match(screen, /clearTimeout|clearInterval/);
  assert.match(screen, /setPlaying\(false\)/);
  assert.match(screen, /useFocusEffect/);
  assert.doesNotMatch(screen, /setTimeout\([^)]*0\)/);
});

test('20 replay wording stays non-diagnostic and avoids invented causes', () => {
  const timelines = [demo(), localTimeline([
    record('CHK-A', '2026-11-04T07:00:00.000Z', { heartRateBpm: 96, sleepHours: 5 }, { symptoms: ['Tired'] }),
  ])];
  const story = buildDemoStory(timelines[0]);
  const corpus = [
    ...timelines.flatMap((timeline) => timeline.frames.flatMap((frame) => [
      frame.cutoffNote,
      frame.baselineNote,
      frame.assessment.summaryBody,
      ...frame.assessment.findings.flatMap((finding) => [finding.headline, finding.note]),
      ...frame.events.map((event) => `${event.label} ${event.detail}`),
    ])),
    ...story.flatMap((step) => [step.title, step.body]),
  ].join(' ');
  assert.doesNotMatch(corpus, /you (are|have|should|must)\b/i);
  assert.doesNotMatch(corpus, /medication|oxygen|fluids|evacuat/i);
  assert.doesNotMatch(corpus, /because of|caused by|deteriorat/i);
  const reviewEvent = demo().frames.flatMap((frame) => frame.events).find((event) => event.type === 'review');
  assert.match(reviewEvent.detail, /not a diagnosis/);
  assert.match(reviewEvent.detail, /does not establish a cause/);
});
