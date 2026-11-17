import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildAssessment, formatRecordAge, STALE_AFTER_HOURS } from '../lib/assessment.ts';
import { compareToBaseline, DIFFERENCE_THRESHOLD_PERCENT } from '../lib/comparison.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';
import { syntheticBaseline } from '../fixtures/crew.ts';
import { buildDemoCheckIns } from '../fixtures/demoCrew.ts';
import { draftFromForm, emptyFormValues, emptyNumericTexts } from '../lib/checkInForm.ts';
import { createCrewDemoRepository } from '../lib/crewDemoRepository.ts';
import { validateDraft } from '../lib/validation.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const NOW = Date.parse('2026-11-16T09:00:00.000Z');

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

const checkIn = (overrides = {}, meta = {}) => ({
  id: 'CHK-900',
  recordedAt: '2026-11-16T08:00:00.000Z',
  readings: readings(overrides),
  symptoms: [],
  activityNote: '',
  ...meta,
});

const assess = (record, source = 'local', now = NOW) =>
  buildAssessment(createReportSnapshot(record), { source, now });

const finding = (assessment, label) => assessment.findings.find((item) => item.label === label);

test('01 overview reports the exact number of review findings', () => {
  const assessment = assess(checkIn({ heartRateBpm: 92, sleepHours: 5.2 }));
  assert.equal(assessment.counts.review, 2);
  assert.equal(assessment.summaryTitle, '2 observations flagged for review');
  assert.equal(assessment.overallStatus, 'review');
  assert.match(assessment.summaryBody, /not diagnoses/);
  assert.deepEqual(assessment.nextSteps[0], 'Review the observation details and measurement context for heart rate, sleep duration.');
});

test('02 above-baseline heart rate gets the plain-language comparison and exact numbers', () => {
  const assessment = assess(checkIn({ heartRateBpm: 81 }));
  const heartRate = finding(assessment, 'Heart rate');
  assert.equal(heartRate.status, 'review');
  assert.equal(heartRate.statusLabel, 'Review suggested');
  assert.equal(heartRate.headline, 'Your recorded heart rate is higher than your fictional personal baseline.');
  assert.equal(heartRate.note, 'This is a comparison finding, not a diagnosis.');
  assert.equal(heartRate.calculation.observed, '81 bpm');
  assert.equal(heartRate.calculation.baseline, '72 bpm');
  assert.equal(heartRate.calculation.difference, '+9 bpm');
  assert.equal(heartRate.calculation.relative, '+12.50%');
  assert.equal(heartRate.calculation.threshold, `${DIFFERENCE_THRESHOLD_PERCENT}% prototype rule`);
  assert.equal(heartRate.calculation.formula, '(81 − 72) ÷ 72 × 100 = +12.50%');
});

test('03 below-baseline values keep negative signs and lower-than wording', () => {
  const heartRate = finding(assess(checkIn({ heartRateBpm: 63 })), 'Heart rate');
  assert.equal(heartRate.status, 'review');
  assert.equal(heartRate.change, -9);
  assert.equal(heartRate.percentChange, -12.5);
  assert.equal(heartRate.headline, 'Your recorded heart rate is lower than your fictional personal baseline.');
  assert.equal(heartRate.calculation.difference, '-9 bpm');
  assert.equal(heartRate.calculation.relative, '-12.50%');
  assert.equal(heartRate.calculation.formula, '(63 − 72) ÷ 72 × 100 = -12.50%');
});

test('04 equal values use match wording and stay inside the demo rule', () => {
  const heartRate = finding(assess(checkIn()), 'Heart rate');
  assert.equal(heartRate.status, 'within-range');
  assert.equal(heartRate.change, 0);
  assert.equal(heartRate.percentChange, 0);
  assert.equal(heartRate.headline, 'Your recorded heart rate matches your fictional personal baseline exactly.');
  assert.match(heartRate.note, /does not establish/);
});

test('05 observations inside the threshold use neutral threshold wording', () => {
  const heartRate = finding(assess(checkIn({ heartRateBpm: 79.1 })), 'Heart rate');
  assert.equal(heartRate.status, 'within-range');
  assert.equal(heartRate.headline, "This observation did not exceed the prototype's configured comparison threshold.");
  assert.equal(heartRate.percentChange, 9.86);
});

test('06 exactly the 10 percent boundary is flagged for review', () => {
  const heartRate = finding(assess(checkIn({ heartRateBpm: 79.2 })), 'Heart rate');
  assert.equal(heartRate.percentChange, 10);
  assert.equal(heartRate.status, 'review');
});

test('07 missing measurements explain the absence instead of inventing a value', () => {
  const assessment = assess(checkIn({ heartRateBpm: null }));
  const heartRate = finding(assessment, 'Heart rate');
  assert.equal(heartRate.status, 'missing');
  assert.equal(heartRate.statusLabel, 'Not measured');
  assert.equal(heartRate.observedValue, 'Not measured');
  assert.equal(heartRate.headline, 'Heart rate was not recorded for this check-in, so no comparison can be made.');
  assert.equal(heartRate.calculation.observed, 'Not measured');
  assert.equal(heartRate.calculation.difference, 'Not calculated');
  assert.equal(heartRate.calculation.relative, 'Not calculated');
  assert.equal(heartRate.calculation.formula, 'No percentage is calculated without a recorded observation.');
  assert.equal(assessment.counts.missing, 1);
  assert.equal(assessment.counts.compared, 4);
});

test('08 a zero baseline never divides by zero or manufactures a percentage', () => {
  const snapshot = createReportSnapshot(checkIn({ heartRateBpm: 5 }));
  snapshot.baseline = { ...syntheticBaseline, heartRateBpm: 0 };
  snapshot.comparisons = compareToBaseline(snapshot.checkIn.readings, snapshot.baseline);
  const assessment = buildAssessment(snapshot, { source: 'local', now: NOW });
  const heartRate = finding(assessment, 'Heart rate');
  assert.equal(heartRate.percentChange, null);
  assert.equal(heartRate.status, 'no-baseline');
  assert.equal(heartRate.statusLabel, 'Comparison unavailable');
  assert.equal(heartRate.baselineText, '0 bpm');
  assert.equal(heartRate.calculation.relative, 'Not calculated');
  assert.match(heartRate.calculation.formula, /division by a zero baseline is undefined/i);
  assert.equal(heartRate.hasBar, true);
});

test('09 an unusable baseline explains why the percentage is unavailable', () => {
  const snapshot = createReportSnapshot(checkIn({ heartRateBpm: 81 }));
  snapshot.baseline = { ...syntheticBaseline, heartRateBpm: Number.NaN };
  snapshot.comparisons = compareToBaseline(snapshot.checkIn.readings, snapshot.baseline);
  const assessment = buildAssessment(snapshot, { source: 'demo', now: NOW });
  const heartRate = finding(assessment, 'Heart rate');
  assert.equal(heartRate.status, 'no-baseline');
  assert.equal(heartRate.baselineText, 'Not available');
  assert.equal(heartRate.calculation.formula, 'No percentage is calculated because the baseline is unavailable.');
  assert.doesNotMatch(JSON.stringify(assessment), /NaN/);
});

test('10 self-reported mood and stress never invent a baseline comparison', () => {
  const assessment = assess(checkIn({ mood: 3, stress: 5 }));
  const mood = finding(assessment, 'Mood');
  const stress = finding(assessment, 'Stress');
  for (const item of [mood, stress]) {
    assert.equal(item.status, 'no-baseline');
    assert.equal(item.statusLabel, 'No baseline comparison');
    assert.equal(item.baseline, null);
    assert.equal(item.calculation.baseline, 'No baseline');
    assert.equal(item.calculation.relative, 'Not calculated');
    assert.equal(item.hasBar, false);
    assert.match(item.headline, /self-reported entry on a 1–5 scale/);
  }
  assert.equal(mood.observedValue, '3');
  assert.equal(mood.unit, 'of 5');
  assert.equal(assessment.counts.noBaseline, 2);
  assert.equal(assessment.counts.compared, 5);
});

test('11 missing self-reported values use the missing template', () => {
  const mood = finding(assess(checkIn({ mood: null })), 'Mood');
  assert.equal(mood.status, 'missing');
  assert.equal(mood.observedValue, 'Not measured');
  assert.match(mood.headline, /Mood was not recorded for this check-in/);
  assert.match(mood.headline, /no personal baseline for mood/);
});

test('12 stale records carry the earlier-check-in template', () => {
  const assessment = assess(checkIn({}, { recordedAt: '2026-11-14T07:00:00.000Z' }));
  assert.equal(assessment.stale, true);
  assert.equal(assessment.ageText, 'Recorded 2 days ago');
  assert.equal(
    finding(assessment, 'Heart rate').staleNote,
    'This reading is from an earlier check-in. It should not be treated as a current measurement.',
  );
});

test('13 fresh records have no stale note', () => {
  const assessment = assess(checkIn({}, { recordedAt: '2026-11-16T08:30:00.000Z' }));
  assert.equal(assessment.stale, false);
  assert.equal(assessment.ageText, 'Recorded 30 min ago');
  assert.equal(finding(assessment, 'Heart rate').staleNote, null);
  assert.equal(STALE_AFTER_HOURS, 24);
});

test('14 unreadable timestamps degrade without NaN or crashes', () => {
  const assessment = assess(checkIn({}, { recordedAt: 'not-a-date' }));
  assert.equal(assessment.recordedAtText, 'Recorded time unavailable');
  assert.equal(assessment.ageText, 'Recorded time unavailable');
  assert.equal(assessment.stale, false);
  assert.equal(finding(assessment, 'Heart rate').calculation.recordedAt, 'Recorded time unavailable');
  assert.doesNotMatch(JSON.stringify(assessment), /NaN|undefined/);
});

test('15 temperature and sleep keep their units and one decimal place', () => {
  const assessment = assess(checkIn({ temperatureC: 37.2, sleepHours: 6 }));
  const temperature = finding(assessment, 'Body temperature');
  const sleep = finding(assessment, 'Sleep duration');
  assert.equal(temperature.observedText, '37.2 °C');
  assert.equal(temperature.baselineText, '36.7 °C');
  assert.equal(temperature.calculation.difference, '+0.5 °C');
  assert.equal(temperature.calculation.relative, '+1.36%');
  assert.equal(sleep.observedValue, '6.0');
  assert.equal(sleep.observedText, '6.0 hours');
  assert.equal(sleep.calculation.difference, '-1.5 hours');
  assert.equal(sleep.calculation.relative, '-20.00%');
  assert.equal(sleep.status, 'review');
});

test('16 provenance distinguishes local records from fictional fixtures', () => {
  const local = assess(checkIn({ heartRateBpm: 81 }));
  const demo = assess(checkIn({ heartRateBpm: 81 }), 'demo');
  assert.equal(local.sourceText, 'Local manual entry · stored on this device');
  assert.equal(demo.sourceText, 'Fictional crew fixture · session only');
  assert.equal(local.synthetic, true);
  assert.match(finding(local, 'Heart rate').calculation.source, /CHK-900 · Local manual entry/);
  assert.match(finding(demo, 'Heart rate').calculation.source, /CHK-900 · Fictional crew fixture/);
  assert.match(finding(local, 'Heart rate').calculation.baselineSource, /fixture v1/);
  assert.equal(finding(local, 'Heart rate').recordedAtText, '16 Nov 2026, 08:00 UTC');
});

test('17 explanations are deterministic for identical inputs', () => {
  const record = checkIn({ heartRateBpm: 92, sleepHours: 5.2, mood: null });
  assert.deepEqual(assess(record), assess(record));
});

test('18 the latest demo fixture record is assessed and flagged as stale', () => {
  const demoRecords = buildDemoCheckIns();
  const assessment = assess(demoRecords.at(-1), 'demo');
  assert.equal(assessment.checkInId, 'CHK-012');
  assert.equal(assessment.stale, true);
  assert.equal(assessment.counts.review, 2);
  assert.equal(assessment.counts.noBaseline, 2);
});

test('19 every demo record produces complete strings with no NaN or undefined', () => {
  for (const record of buildDemoCheckIns()) {
    const serialized = JSON.stringify(assess(record, 'demo'));
    assert.doesNotMatch(serialized, /NaN|undefined/);
    assert.match(serialized, /"statusLabel"/);
  }
});

test('20 self-reported-only check-ins explain why no comparison exists', () => {
  const assessment = assess(checkIn({
    heartRateBpm: null,
    systolicMmHg: null,
    diastolicMmHg: null,
    temperatureC: null,
    sleepHours: null,
    mood: 3,
    stress: 2,
  }));
  assert.equal(assessment.counts.compared, 0);
  assert.equal(assessment.counts.noBaseline, 2);
  assert.equal(assessment.counts.missing, 5);
  assert.equal(assessment.overallStatus, 'insufficient');
  assert.equal(assessment.summaryTitle, 'No baseline comparisons available');
  assert.match(assessment.summaryBody, /only self-reported entries/);
  assert.match(assessment.nextSteps[0], /Record at least one measurement/);
});

test('21 templates avoid diagnostic claims and keep emergency guidance bounded', () => {
  const assessment = assess(checkIn({
    heartRateBpm: 92,
    sleepHours: 5.2,
    temperatureC: 37.4,
    symptoms: ['Tired'],
  }));
  const narrative = [
    assessment.summaryTitle,
    assessment.summaryBody,
    assessment.emergencyNote,
    ...assessment.nextSteps,
    ...assessment.findings.flatMap((item) => [item.headline, item.note, item.calculation.formula, item.calculation.note]),
  ].join(' ');
  assert.match(narrative, /not a diagnosis/);
  assert.match(narrative, /mission-approved medical procedures/);
  assert.match(narrative, /does not determine urgency/);
  assert.doesNotMatch(narrative, /you are (healthy|safe)/i);
  assert.doesNotMatch(narrative, /\b(prescribe|medication|dose|oxygen|fluids)\b/i);
  assert.doesNotMatch(narrative, /\b(disease|infection|disorder)\b/i);
  assert.doesNotMatch(narrative, /this (means|indicates) (you|an)/i);
});

test('22 guided and detailed check-in both lead to the same assessment screen', () => {
  const guided = source('app/guided-check-in.tsx');
  assert.match(guided, /label="View Assessment"/);
  assert.match(guided, /finishAt\('\/assessment'\)/);

  const detailed = source('app/(tabs)/check-in.tsx');
  assert.match(detailed, /label="View assessment"/);
  assert.match(detailed, /router\.navigate\('\/assessment'\)/);

  const assessmentScreen = source('app/(tabs)/assessment.tsx');
  assert.match(assessmentScreen, /useSession\(\)/);
  assert.match(assessmentScreen, /latestCheckIn/);
});

test('23 a just-saved record is the observation assessed in a demo session', async () => {
  const repository = createCrewDemoRepository();
  const values = {
    ...emptyFormValues(),
    texts: { ...emptyNumericTexts, heartRateBpm: '92', systolicMmHg: '118', diastolicMmHg: '76', temperatureC: '36.8', sleepHours: '5.2' },
    subjective: { mood: 3, stress: 3 },
    symptoms: ['Tired'],
    activityNote: 'Fixture save for assessment scope.',
  };
  const result = validateDraft(draftFromForm(values), values.texts);
  assert.equal(result.ok, true);
  const saved = await repository.saveCheckIn(
    { ...draftFromForm(values), readings: result.readings },
    '2026-11-16T08:00:00.000Z',
  );
  const latest = (await repository.load()).checkIns.at(-1);
  const assessment = buildAssessment(createReportSnapshot(latest), { source: 'demo', now: NOW });

  assert.equal(assessment.checkInId, saved.id);
  assert.equal(assessment.source, 'demo');
  assert.match(assessment.sourceText, /session only/);
  assert.deepEqual(latest.symptoms, ['Tired']);
  assert.equal(assessment.findings.find((item) => item.label === 'Heart rate').status, 'review');
});

test('24 the screen reuses the existing engine and never queues, sends, or diagnoses', () => {
  const screen = source('app/(tabs)/assessment.tsx');
  assert.match(screen, /createReportSnapshot/);
  assert.match(screen, /buildAssessment/);
  assert.match(screen, /No connected device, wearable import, or live sensor feed/);
  assert.match(screen, /Synthetic data/);
  assert.match(screen, /thresholdPercent/);
  assert.doesNotMatch(screen, /\b10\s*%/);
  assert.doesNotMatch(screen, /confirmReport|submitReport|fetch\(|XMLHttpRequest|axios/);
  assert.doesNotMatch(screen, /HealthKit|Health Connect|\bBLE\b|\bNFC\b|bluetooth/i);
  assert.doesNotMatch(screen, /within normal range|you are healthy|you are safe/i);
  assert.match(screen, /does not diagnose conditions, prescribe treatment/);
  assert.doesNotMatch(screen, /you should (take|use|apply)/i);
});

test('25 threshold and baseline provenance are exposed from the engine contract', () => {
  const assessment = assess(checkIn());
  assert.equal(assessment.thresholdPercent, DIFFERENCE_THRESHOLD_PERCENT);
  assert.equal(assessment.thresholdPercent, 10);
  assert.match(assessment.baselineSource, /fixture v1/);
  assert.match(assessment.baselineSource, /synthetic/i);
  const heartRate = finding(assessment, 'Heart rate');
  assert.equal(heartRate.calculation.threshold, '10% prototype rule');
  assert.match(heartRate.calculation.formula, /× 100/);
});
