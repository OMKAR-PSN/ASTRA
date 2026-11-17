import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  adjustSleepHours,
  guidedStepMeta,
  guidedStepOrder,
  moodChoiceForValue,
  moodChoices,
  moodValueFor,
  numericErrorsForStep,
  stepNumericFields,
  stressAnchors,
} from '../lib/guidedCheckIn.ts';
import {
  copyFormValues,
  draftFromForm,
  emptyFormValues,
  emptyNumericTexts,
  formHasInput,
  textsFrom,
} from '../lib/checkInForm.ts';
import { setFormHandoff, takeFormHandoff } from '../lib/formHandoff.ts';
import { parseNumericReadings, readingLimits, validateDraft } from '../lib/validation.ts';
import { emptyReadings, symptomOptions } from '../fixtures/checkInOptions.ts';
import { buildDemoCheckIns, demoCrewIdentity, demoCrewRecordCount } from '../fixtures/demoCrew.ts';
import { createCrewDemoRepository } from '../lib/crewDemoRepository.ts';
import { compareToBaseline, DIFFERENCE_THRESHOLD_PERCENT } from '../lib/comparison.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const validValues = () => ({
  ...emptyFormValues(),
  texts: { ...emptyNumericTexts, heartRateBpm: '74', systolicMmHg: '118', diastolicMmHg: '76', temperatureC: '36.8', sleepHours: '7.5' },
  subjective: { mood: 4, stress: 2 },
  symptoms: ['Tired'],
  activityNote: '  Post-EVA recovery, light duties.  ',
});

test('01 guided route is registered and reachable from both check-in entry points', () => {
  const screen = source('app/guided-check-in.tsx');
  assert.match(screen, /export default function GuidedCheckInScreen/);
  assert.match(source('app/_layout.tsx'), /name="guided-check-in"/);
  assert.match(source('app/(tabs)/index.tsx'), /router\.push\('\/guided-check-in'\)/);
  assert.match(source('app/(tabs)/check-in.tsx'), /router\.push\('\/guided-check-in'\)/);
});

test('02 mood choices map explicitly onto the existing 1-5 mood scale', () => {
  assert.deepEqual(
    moodChoices.map((choice) => [choice.id, choice.value]),
    [['great', 5], ['good', 4], ['okay', 3], ['not-great', 2], ['very-low', 1], ['prefer-describe', null]],
  );
  for (const value of [1, 2, 3, 4, 5]) {
    assert.equal(moodValueFor(moodChoiceForValue(value)), value);
  }
  assert.equal(moodChoiceForValue(null), null);
  assert.equal(moodValueFor('prefer-describe'), null);
});

test('03 stress scale keeps five anchored levels', () => {
  assert.equal(stressAnchors.length, 5);
  assert.deepEqual([...stressAnchors], ['Calm', 'Low', 'Moderate', 'High', 'Very high']);
  assert.match(source('app/guided-check-in.tsx'), /anchors=\{stressAnchors\}/);
  assert.match(source('app/guided-check-in.tsx'), /label="Stress"/);
  assert.match(source('app/guided-check-in.tsx'), /1 is calm, 5 is very high/);
});

test('04 sleep reuses the duration limits and a 30-minute stepper', () => {
  assert.deepEqual(readingLimits.sleepHours, { min: 0, max: 24 });
  assert.equal(adjustSleepHours('', -1), '');
  assert.equal(adjustSleepHours('', 1), '0.5');
  assert.equal(adjustSleepHours('7.5', 1), '8');
  assert.equal(adjustSleepHours('7.5', -1), '7');
  assert.equal(adjustSleepHours('0', -1), '0');
  assert.equal(adjustSleepHours('24', 1), '24');
  assert.equal(adjustSleepHours('7.25', 1), '7.8');
  assert.equal(adjustSleepHours('abc', 1), '0.5');
  assert.deepEqual(numericErrorsForStep('sleep', { ...emptyNumericTexts, sleepHours: '25' }), {
    sleepHours: 'Enter a value from 0 to 24.',
  });
  assert.deepEqual(numericErrorsForStep('sleep', { ...emptyNumericTexts, sleepHours: 'abc' }), {
    sleepHours: 'Enter a number.',
  });
  assert.deepEqual(numericErrorsForStep('sleep', emptyNumericTexts), {});
});

test('05 systolic and diastolic pressures validate independently', () => {
  const highDiastolic = numericErrorsForStep('vitals', {
    ...emptyNumericTexts, heartRateBpm: '74', systolicMmHg: '120', diastolicMmHg: '200', temperatureC: '36.8',
  });
  assert.deepEqual(Object.keys(highDiastolic), ['diastolicMmHg']);
  assert.equal(highDiastolic.diastolicMmHg, 'Enter a value from 30 to 150.');

  const lowSystolic = numericErrorsForStep('vitals', {
    ...emptyNumericTexts, heartRateBpm: '74', systolicMmHg: '50', diastolicMmHg: '80', temperatureC: '36.8',
  });
  assert.deepEqual(Object.keys(lowSystolic), ['systolicMmHg']);
  assert.equal(lowSystolic.systolicMmHg, 'Enter a value from 60 to 250.');

  const onlySystolic = validateDraft(
    { ...draftFromForm(emptyFormValues()), readings: { ...emptyReadings, systolicMmHg: 120 } },
    { ...emptyNumericTexts, systolicMmHg: '120' },
  );
  assert.equal(onlySystolic.ok, true);
});

test('06 a check-in with no measurement or self-report is blocked by the existing rule', () => {
  const result = validateDraft(draftFromForm(emptyFormValues()), emptyNumericTexts);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, { heartRateBpm: 'Enter at least one reading or load the demo readings.' });
  assert.match(source('app/guided-check-in.tsx'), /values\.subjective\.stress === null/);
  assert.match(source('app/guided-check-in.tsx'), /moodChoice === null/);
});

test('07 optional measurements stay empty instead of inventing values', () => {
  assert.deepEqual(Object.values(emptyFormValues().texts), ['', '', '', '', '']);
  const draft = draftFromForm(emptyFormValues());
  assert.deepEqual(draft.readings, emptyReadings);
  assert.equal(draft.symptoms.length, 0);
  assert.equal(draft.activityNote, '');
  assert.match(source('app/guided-check-in.tsx'), /'Not measured'/);
  assert.equal(formHasInput(emptyFormValues()), false);
});

test('08 symptoms come only from the existing model and are saved', async () => {
  assert.deepEqual([...symptomOptions], [
    'Tired', 'Headache', 'Muscle soreness', 'Trouble sleeping', 'Trouble concentrating', 'Dizziness', 'Nausea',
  ]);
  assert.ok(!symptomOptions.includes('Other'));
  assert.match(source('app/guided-check-in.tsx'), /<SymptomChecklist\s+options=\{symptomOptions\}/);

  const repository = createCrewDemoRepository();
  const values = { ...validValues(), symptoms: ['Headache', 'Nausea'] };
  const draft = draftFromForm(values);
  const saved = await repository.saveCheckIn(draft, '2026-11-16T09:00:00.000Z');
  assert.deepEqual(saved.symptoms, ['Headache', 'Nausea']);
  assert.equal((await repository.load()).checkIns.at(-1).symptoms.length, 2);
});

test('09 going back keeps every entered value, and handoff survives without saving', () => {
  const values = validValues();
  const copy = copyFormValues(values);
  copy.texts.heartRateBpm = '90';
  assert.notEqual(values.texts.heartRateBpm, '90');

  setFormHandoff(values);
  values.symptoms.push('Dizziness');
  values.texts.sleepHours = '1';
  const handoff = takeFormHandoff();
  assert.deepEqual(handoff, {
    ...validValues(),
  });
  assert.equal(takeFormHandoff(), null, 'handoff is consumed once');
});

test('10 leaving mid-flow requires an explicit discard confirmation', () => {
  const screen = source('app/guided-check-in.tsx');
  assert.match(screen, /navigation\.addListener\('beforeRemove'/);
  assert.match(screen, /event\.preventDefault\(\)/);
  assert.match(screen, /Discard this check-in\?/);
  assert.match(screen, /label="Keep editing"/);
  assert.match(screen, /Discard & exit/);
  assert.match(screen, /if \(!dirty \|\| hasSaved \|\| bypassLeave\.current\) return;/);
});

test('11 guided and detailed answers build byte-identical records', async () => {
  const values = validValues();
  const guidedDraft = draftFromForm(values);
  const detailedDraft = draftFromForm({ ...values, texts: { ...values.texts } });
  assert.deepEqual(guidedDraft, detailedDraft);
  assert.equal(guidedDraft.activityNote, 'Post-EVA recovery, light duties.');

  const guidedTexts = values.texts;
  const detailedTexts = { ...values.texts };
  const guidedResult = validateDraft(guidedDraft, guidedTexts);
  const detailedResult = validateDraft(detailedDraft, detailedTexts);
  assert.deepEqual(guidedResult, detailedResult);
  assert.equal(guidedResult.ok, true);

  const recordedAt = '2026-11-16T09:00:00.000Z';
  const guidedSaved = await createCrewDemoRepository().saveCheckIn(guidedDraft, recordedAt);
  const detailedSaved = await createCrewDemoRepository().saveCheckIn(detailedDraft, recordedAt);
  assert.deepEqual(guidedSaved, detailedSaved);
});

test('12 one save appends exactly one check-in and the screen guards concurrent saves', () => {
  const screen = source('app/guided-check-in.tsx');
  assert.match(screen, /if \(saveLock\.current \|\| savedRecord !== null\) return;/);
  assert.match(screen, /saveLock\.current = true;/);
  assert.match(screen, /setPhase\('saved'\)/);
});

test('13 saving one check-in appends one record', async () => {
  const repository = createCrewDemoRepository();
  const before = await repository.load();
  const saved = await repository.saveCheckIn(draftFromForm(validValues()), '2026-11-16T09:00:00.000Z');
  const after = await repository.load();
  assert.equal(after.checkIns.length, before.checkIns.length + 1);
  assert.equal(after.checkIns.at(-1).id, saved.id);
  assert.equal(after.reports.length, before.reports.length);
});

test('14 the 10% review threshold and baseline are untouched', () => {
  assert.equal(DIFFERENCE_THRESHOLD_PERCENT, 10);
  assert.deepEqual(demoCrewIdentity.baseline, {
    heartRateBpm: 72,
    systolicMmHg: 116,
    diastolicMmHg: 74,
    temperatureC: 36.7,
    sleepHours: 7.5,
  });
  const guidedScreen = source('app/guided-check-in.tsx');
  assert.match(guidedScreen, /DIFFERENCE_THRESHOLD_PERCENT/);
  assert.doesNotMatch(guidedScreen, /threshold\s*=\s*\d+/i);
});

test('15 the saved check-in becomes the latest observation for dashboard and trends', async () => {
  const repository = createCrewDemoRepository();
  const draft = draftFromForm(validValues());
  const saved = await repository.saveCheckIn(draft, '2026-11-16T09:00:00.000Z');
  const latest = (await repository.load()).checkIns.at(-1);
  assert.equal(latest.id, saved.id);
  assert.deepEqual(latest.readings, draft.readings);

  const snapshot = createReportSnapshot(latest);
  assert.equal(snapshot.comparisons.length, 5);
  assert.equal(snapshot.checkIn.id, latest.id);
  const heartRate = compareToBaseline(latest.readings, demoCrewIdentity.baseline)
    .find((item) => item.label === 'Heart rate');
  assert.ok(heartRate);
  assert.equal(heartRate.baseline, 72);
});

test('16 demo sessions stay isolated from the fixture and reset on re-identification', async () => {
  const seed = buildDemoCheckIns();
  const repository = createCrewDemoRepository(seed);
  await repository.saveCheckIn(draftFromForm(validValues()), '2026-11-16T09:00:00.000Z');
  assert.equal((await repository.load()).checkIns.length, demoCrewRecordCount + 1);
  assert.equal(seed.length, demoCrewRecordCount);
  assert.equal((await createCrewDemoRepository().load()).checkIns.length, demoCrewRecordCount);
});

test('17 the guided flow never fabricates a sensor reading or transmission', () => {
  const guidedScreen = source('app/guided-check-in.tsx');
  assert.match(guidedScreen, /no live sensor feed/);
  assert.match(guidedScreen, /No report was queued or sent/);
  assert.doesNotMatch(guidedScreen, /HealthKit|Health Connect|\bBLE\b|\bNFC\b|bluetooth/i);
  assert.match(guidedScreen, /accessibilityRole="header"/);
});

test('18 saved wording distinguishes demo sessions from on-device storage', () => {
  const guidedScreen = source('app/guided-check-in.tsx');
  assert.match(guidedScreen, /Saved in this demo session\./);
  assert.match(guidedScreen, /Saved on this device\./);
  assert.doesNotMatch(guidedScreen, /Saved for offline use/);
  assert.doesNotMatch(guidedScreen, /successfully transmitted|server acknowledged/i);
});

test('19 progress is text-based and covers the five guided steps', () => {
  assert.equal(guidedStepOrder.length, 5);
  assert.deepEqual(
    guidedStepOrder.map((step) => guidedStepMeta[step].progressLabel),
    ['Mood & stress', 'Sleep', 'Measurements', 'Symptoms', 'Review'],
  );
  assert.deepEqual(Object.keys(stepNumericFields).sort(), ['sleep', 'vitals']);
  const progress = source('components/StepProgress.tsx');
  assert.match(progress, /accessibilityRole="progressbar"/);
  assert.match(progress, /STEP \{current\} OF \{total\}/);
});

test('20 both flows share one draft builder, validator, and offline save path', () => {
  const detailed = source('app/(tabs)/check-in.tsx');
  const guided = source('app/guided-check-in.tsx');
  for (const screen of [detailed, guided]) {
    assert.match(screen, /draftFromForm/);
    assert.match(screen, /validateDraft/);
    assert.match(screen, /saveCheckIn/);
  }
  assert.match(detailed, /takeFormHandoff/);
  assert.match(detailed, /setFormHandoff/);

  const webRepository = source('lib/sessionRepository.web.ts');
  assert.match(webRepository, /indexedDB\.open\('astra-care-offline'/);
  assert.doesNotMatch(webRepository, /fetch\(|axios|XMLHttpRequest/);

  for (const relativePath of ['lib/checkInForm.ts', 'lib/guidedCheckIn.ts', 'lib/formHandoff.ts', 'lib/validation.ts']) {
    const file = source(relativePath);
    assert.doesNotMatch(file, /fetch\(|axios|XMLHttpRequest|supabase/i, relativePath);
  }
});

test('21 sleep and vital entries parse through the shared numeric parser', () => {
  const { readings, errors } = parseNumericReadings({
    ...emptyNumericTexts, heartRateBpm: '74', systolicMmHg: '', diastolicMmHg: '76', temperatureC: '36.8', sleepHours: '7.5',
  });
  assert.equal(errors.systolicMmHg, undefined);
  assert.deepEqual(readings, {
    heartRateBpm: 74, systolicMmHg: null, diastolicMmHg: 76, temperatureC: 36.8, sleepHours: 7.5,
  });
});
