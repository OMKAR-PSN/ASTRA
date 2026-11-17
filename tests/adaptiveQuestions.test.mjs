import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ADAPTIVE_NOTE_MAX,
  ADAPTIVE_QUESTION_LIMIT,
  ADAPTIVE_RESPONSE_MAX,
  activeAdaptiveQuestionIds,
  adaptiveContextLines,
  answerLabelFor,
  buildAdaptiveContext,
  createAdaptiveResponse,
  describeAdaptiveResponse,
  evaluateAdaptiveQuestions,
  findInactiveAdaptiveResponses,
  isNotSureAnswer,
  normalizeCheckInAdaptive,
  questionForResponse,
  sanitizeAdaptiveResponses,
  validateAdaptiveAnswer,
} from '../lib/adaptiveQuestions.ts';
import { buildAssessment } from '../lib/assessment.ts';
import {
  copyFormValues,
  draftFromForm,
  emptyFormValues,
  emptyNumericTexts,
} from '../lib/checkInForm.ts';
import { getKnowledgeCard } from '../lib/knowledge/index.ts';
import { canonicalJson } from '../lib/reportProtocol.ts';
import { buildReplayTimeline } from '../lib/replay.ts';
import { normalizeStoredSession } from '../lib/sessionRepositoryContract.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';
import { createSymptomEntry } from '../lib/symptoms.ts';
import { buildAdaptiveQuestionRequest } from '../lib/voice/builders.ts';
import { initialSessionState, sessionReducer } from '../state/sessionReducer.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const answeredAt = '2026-11-17T09:00:00.000Z';
const now = Date.parse('2026-11-17T09:00:00.000Z');

const filledTexts = {
  heartRateBpm: '72',
  systolicMmHg: '116',
  diastolicMmHg: '74',
  temperatureC: '36.7',
  sleepHours: '7.5',
};

const form = (overrides = {}) => ({
  ...emptyFormValues(),
  texts: { ...filledTexts },
  ...overrides,
});

const allQuestions = (values) => evaluateAdaptiveQuestions(
  buildAdaptiveContext(values),
  { limit: Number.POSITIVE_INFINITY },
);

const question = (values, id) => {
  const found = allQuestions(values).questions.find((item) => item.id === id);
  assert.ok(found, `expected question ${id}`);
  return found;
};

const kneeEntry = createSymptomEntry({
  bodyRegion: 'knee',
  bodySide: 'left',
  bodyView: 'front',
  symptomType: 'pain',
  discomfortIntensity: 3,
  symptomNote: 'Aches after treadmill walk',
}, { id: 'SYM-ADAPTIVE-1', recordedAtUTC: '2026-11-17T08:55:00.000Z' });

const headEntry = createSymptomEntry({
  bodyRegion: 'head',
  bodySide: 'not_applicable',
  bodyView: 'front',
  symptomType: 'pressure',
  discomfortIntensity: 2,
  symptomNote: '',
}, { id: 'SYM-ADAPTIVE-2', recordedAtUTC: '2026-11-17T08:55:00.000Z' });

const responseFor = (values, id, answer, contextLabel = null) => {
  const created = createAdaptiveResponse(question(values, id), answer, 'guided', answeredAt, contextLabel);
  assert.ok(created, `expected a valid response for ${id}`);
  return created;
};

const fatigueValues = form({ symptoms: ['Tired'] });
const fatigueOnset = responseFor(fatigueValues, 'fatigue-onset', { optionIds: ['earlier-today'], text: null });
const fatigueChangeNo = responseFor(fatigueValues, 'fatigue-change', { optionIds: ['no'], text: null });

const checkInWith = (overrides = {}) => ({
  id: 'CHK-201',
  recordedAt: answeredAt,
  readings: { heartRateBpm: 78, systolicMmHg: 120, diastolicMmHg: 78, temperatureC: 36.8, sleepHours: 6.5, mood: null, stress: null },
  symptoms: ['Tired'],
  activityNote: 'Light walk',
  symptomStatus: 'reported',
  adaptiveResponses: [fatigueOnset, fatigueChangeNo],
  ...overrides,
});

test('01 fatigue questions require explicit tiredness and are never inferred from short sleep', () => {
  const tired = allQuestions(fatigueValues);
  assert.deepEqual(tired.evaluations.find((item) => item.ruleId === 'fatigue').questionIds, [
    'fatigue-onset', 'fatigue-change', 'fatigue-context',
  ]);
  assert.equal(tired.evaluations.find((item) => item.ruleId === 'fatigue').applicable, true);

  const shortSleep = allQuestions(form({ texts: { ...filledTexts, sleepHours: '4.5' } }));
  assert.equal(shortSleep.evaluations.find((item) => item.ruleId === 'fatigue').applicable, false);
  assert.equal(shortSleep.totalAvailable, 0);
});

test('02 head questions accept an explicit headache word or a head body-map entry', () => {
  const word = allQuestions(form({ symptoms: ['Headache'] }));
  assert.deepEqual(word.evaluations.find((item) => item.ruleId === 'head').questionIds, [
    'head-onset', 'head-location', 'head-sensation',
  ]);
  const entry = allQuestions(form({ symptomEntries: [headEntry] }));
  assert.deepEqual(entry.evaluations.find((item) => item.ruleId === 'head').questionIds, ['head-onset']);
  assert.equal(entry.evaluations.find((item) => item.ruleId === 'body').applicable, false);
});

test('03 sleep questions appear only for an explicitly reported sleep difficulty', () => {
  const reported = allQuestions(form({ symptoms: ['Trouble sleeping'] }));
  assert.deepEqual(reported.evaluations.find((item) => item.ruleId === 'sleep').questionIds, [
    'sleep-interruptions', 'sleep-factors',
  ]);
  assert.equal(allQuestions(form({ texts: { ...filledTexts, sleepHours: '5' } })).totalAvailable, 0);
});

test('04 dizziness and nausea reports produce a bounded three-question group', () => {
  for (const symptom of ['Dizziness', 'Nausea']) {
    const result = allQuestions(form({ symptoms: [symptom] }));
    assert.deepEqual(result.evaluations.find((item) => item.ruleId === 'dizziness').questionIds, [
      'dizziness-onset', 'dizziness-ongoing', 'dizziness-context',
    ]);
  }
  assert.equal(allQuestions(form({ symptoms: ['Trouble concentrating'] })).evaluations.find((item) => item.ruleId === 'dizziness').applicable, false);
});

test('05 body-map follow-ups reuse the recorded region and never re-ask location', () => {
  const result = allQuestions(form({ symptomEntries: [kneeEntry] }));
  const body = result.evaluations.find((item) => item.ruleId === 'body');
  assert.deepEqual(body.questionIds, ['body-onset', 'body-change']);
  assert.equal(result.allQuestionIds.includes('body-location'), false);
  assert.match(question(form({ symptomEntries: [kneeEntry] }), 'body-onset').prompt, /Left Knee · front view/);
  assert.match(question(form({ symptomEntries: [kneeEntry] }), 'body-onset').helper, /reuses your body-map entry|do not need to re-enter/i);
});

test('06 blank measurements ask why without adding a value or inventing a reading', () => {
  const values = form({
    texts: { ...emptyNumericTexts, heartRateBpm: '72' },
    symptoms: ['Tired'],
  });
  const measurement = allQuestions(values).questions.find((item) => item.id === 'measurement-reason');
  assert.ok(measurement);
  assert.deepEqual(measurement.options.map((option) => option.id), [
    'measurement-not-available', 'device-unavailable', 'prefer-not-to-say', 'other',
  ]);
  assert.match(measurement.prompt, /systolic pressure, diastolic pressure, body temperature, sleep duration/);
  assert.deepEqual(measurement.requiresTextForOptionIds, ['other']);
  assert.match(measurement.helper, /does not add a measurement/i);
  const empty = allQuestions(emptyFormValues());
  assert.equal(empty.totalAvailable, 0, 'an empty form never prompts for measurement context');
});

test('07 Not sure is distinct from No and skipped answers are never recorded as answers', () => {
  const notSure = responseFor(fatigueValues, 'fatigue-change', { optionIds: ['not-sure'], text: null });
  assert.equal(isNotSureAnswer(notSure), true);
  assert.equal(answerLabelFor(question(fatigueValues, 'fatigue-change'), notSure.answer), 'Not sure');
  assert.equal(isNotSureAnswer(fatigueChangeNo), false);
  const draft = draftFromForm(form({ symptoms: ['Tired'], adaptiveResponses: [], adaptiveSkipped: ['fatigue-onset', 'fatigue-change'] }));
  assert.equal('adaptiveResponses' in draft, false);
  assert.equal(JSON.stringify(draft).includes('fatigue-onset'), false);
  assert.equal(JSON.stringify(draft).includes('not-sure'), false);
});

test('08 the default result is capped at three unique questions with a visible hidden count', () => {
  const values = form({ symptoms: ['Tired', 'Trouble sleeping', 'Dizziness'] });
  const limited = evaluateAdaptiveQuestions(buildAdaptiveContext(values));
  assert.equal(limited.limit, ADAPTIVE_QUESTION_LIMIT);
  assert.equal(limited.questions.length, 3);
  assert.equal(limited.totalAvailable, 8);
  assert.equal(limited.hiddenCount, 5);
  assert.equal(new Set(limited.allQuestionIds).size, limited.allQuestionIds.length);
  assert.equal(evaluateAdaptiveQuestions(buildAdaptiveContext(values), { limit: 0 }).questions.length, 0);
  assert.equal(evaluateAdaptiveQuestions(buildAdaptiveContext(values), { limit: 5 }).questions.length, 5);
});

test('09 ordering is deterministic, interleaved across groups, and stable across calls', () => {
  const values = form({ symptoms: ['Tired', 'Trouble sleeping', 'Dizziness'] });
  const first = allQuestions(values);
  const second = allQuestions(values);
  assert.deepEqual(first.allQuestionIds, second.allQuestionIds);
  assert.deepEqual(first.allQuestionIds, [
    'fatigue-onset', 'sleep-interruptions', 'dizziness-onset',
    'fatigue-change', 'sleep-factors', 'dizziness-ongoing',
    'fatigue-context', 'dizziness-context',
  ]);
  assert.deepEqual(first.questions.map((item) => item.order), first.questions.map((_, index) => index));
});

test('10 question ids, reasons, and knowledge cards are stable and explainable', () => {
  const result = allQuestions(form({ symptoms: ['Tired', 'Headache'], symptomEntries: [kneeEntry], texts: { ...filledTexts, temperatureC: '' } }));
  for (const item of result.questions) {
    assert.match(item.id, /^(fatigue|head|sleep|dizziness|body|measurement)-[a-z-]+$/);
    assert.equal(item.reason, result.evaluations.find((evaluation) => evaluation.ruleId === item.ruleId).reason);
    assert.match(item.reason, /^Because you reported|^Because you added a symptom|^You left a measurement blank/);
    assert.ok(getKnowledgeCard(item.knowledgeCardId), `missing knowledge card ${item.knowledgeCardId}`);
  }
  assert.equal(question(fatigueValues, 'fatigue-onset').reason, 'Because you reported tiredness, you can add a little more context.');
});

test('11 formats stay within the five documented types and avoid clinical scales or severity ratings', () => {
  const result = allQuestions(form({
    symptoms: ['Tired', 'Headache', 'Trouble sleeping', 'Nausea'],
    symptomEntries: [kneeEntry],
    texts: { ...emptyNumericTexts },
  }));
  const types = new Set(['single-select', 'multi-select', 'short-text', 'onset', 'yes-no-not-sure']);
  for (const item of result.questions) {
    assert.equal(types.has(item.type), true, `unexpected type ${item.type}`);
    for (const option of item.options) {
      assert.doesNotMatch(option.label, /\b(mild|moderate|severe|severity|scale|rate from|1 to 5|out of 10)\b/i);
    }
    assert.doesNotMatch(item.prompt, /diagnos|urgent|emergency|triage|treat/i);
    assert.doesNotMatch(item.helper, /urgent|emergency|triage|treat/i);
    if (/diagnos/i.test(item.helper)) assert.match(item.helper, /not a diagnosis/i);
  }
  assert.equal(result.questions.find((item) => item.id === 'head-sensation').type, 'multi-select');
});

test('12 context labels describe the body region and the exact blank measurements', () => {
  const body = question(form({ symptomEntries: [kneeEntry] }), 'body-onset');
  assert.equal(body.contextLabel, 'Left Knee · front view');
  const measurement = allQuestions(form({ texts: { ...emptyNumericTexts, heartRateBpm: '72' }, symptoms: ['Tired'] }))
    .questions.find((item) => item.id === 'measurement-reason');
  assert.equal(measurement.contextLabel, 'systolic pressure, diastolic pressure, body temperature, sleep duration');
  assert.match(measurement.prompt, /why systolic pressure/);
});

test('13 validation enforces one choice for single-select and allows multiple only for multi-select', () => {
  const onset = question(fatigueValues, 'fatigue-onset');
  assert.equal(validateAdaptiveAnswer(onset, { optionIds: [], text: null }), 'Choose an option to continue, or skip this question.');
  assert.equal(validateAdaptiveAnswer(onset, { optionIds: ['earlier-today', 'previous-day'], text: null }), 'Choose one option.');
  assert.equal(validateAdaptiveAnswer(onset, { optionIds: ['earlier-today'], text: null }), null);
  assert.equal(validateAdaptiveAnswer(onset, { optionIds: ['unknown-option'], text: null }), 'Choose an option from the list.');
  const sensation = question(form({ symptoms: ['Headache'] }), 'head-sensation');
  assert.equal(validateAdaptiveAnswer(sensation, { optionIds: ['pain', 'pressure', 'tingling'], text: null }), null);
});

test('14 short-text notes are required and bounded at 160 characters', () => {
  const note = question(fatigueValues, 'fatigue-context');
  assert.equal(validateAdaptiveAnswer(note, { optionIds: [], text: '   ' }), 'Add a short note before continuing, or skip this question.');
  assert.equal(validateAdaptiveAnswer(note, { optionIds: [], text: 'x'.repeat(ADAPTIVE_NOTE_MAX) }), null);
  assert.equal(validateAdaptiveAnswer(note, { optionIds: [], text: 'x'.repeat(ADAPTIVE_NOTE_MAX + 1) }), 'Keep the note to 160 characters.');
});

test('15 Measurement not available reasons need a note only for Other', () => {
  const values = form({ texts: { ...emptyNumericTexts, heartRateBpm: '72' }, symptoms: ['Tired'] });
  const measurement = question(values, 'measurement-reason');
  assert.equal(validateAdaptiveAnswer(measurement, { optionIds: ['device-unavailable'], text: null }), null);
  assert.equal(validateAdaptiveAnswer(measurement, { optionIds: ['prefer-not-to-say'], text: null }), null);
  assert.equal(validateAdaptiveAnswer(measurement, { optionIds: ['other'], text: '' }), 'Add a short note for this option.');
  assert.equal(validateAdaptiveAnswer(measurement, { optionIds: ['other'], text: 'Sensor cable was packed away.' }), null);
});

test('16 createAdaptiveResponse normalizes options, trims and bounds text, and rejects bad timestamps', () => {
  const note = question(fatigueValues, 'fatigue-context');
  const created = createAdaptiveResponse(note, { optionIds: [], text: `  ${'x'.repeat(ADAPTIVE_NOTE_MAX + 20)}  ` }, 'detailed', answeredAt);
  assert.ok(created);
  assert.equal(created.answer.text.length, ADAPTIVE_NOTE_MAX);
  assert.equal(created.source, 'detailed');
  assert.equal(created.ruleId, 'fatigue');
  assert.equal(created.answeredAtUTC, answeredAt);
  assert.equal(created.contextLabel, null);
  assert.equal(createAdaptiveResponse(note, { optionIds: [], text: 'Woke early' }, 'guided', 'not-a-date'), null);
  const droppedOption = createAdaptiveResponse(note, { optionIds: ['fake'], text: 'Woke early' }, 'guided', answeredAt);
  assert.deepEqual(droppedOption.answer.optionIds, []);
  assert.equal(createAdaptiveResponse(question(fatigueValues, 'fatigue-onset'), { optionIds: ['fake'], text: null }, 'guided', answeredAt), null);
  const notSureDuplicates = responseFor(fatigueValues, 'fatigue-change', { optionIds: ['not-sure', 'not-sure'], text: null });
  assert.deepEqual(notSureDuplicates.answer.optionIds, ['not-sure']);
});

test('17 sanitization drops unknown, mismatched, malformed, and duplicate answers', () => {
  const cleaned = sanitizeAdaptiveResponses([
    fatigueOnset,
    { ...fatigueOnset },
    { ...fatigueChangeNo, ruleId: 'sleep' },
    { ...fatigueChangeNo, source: 'imported' },
    { questionId: 'not-a-question', ruleId: 'fatigue', answer: { optionIds: [], text: null }, source: 'guided', answeredAtUTC: answeredAt },
    { ...fatigueChangeNo, answeredAtUTC: 'invalid' },
    'not-an-object',
    null,
  ]);
  assert.deepEqual(cleaned.map((item) => item.questionId), ['fatigue-onset']);
  const sorted = sanitizeAdaptiveResponses([fatigueChangeNo, fatigueOnset]);
  assert.deepEqual(sorted.map((item) => item.questionId), ['fatigue-onset', 'fatigue-change']);
});

test('18 sanitization keeps at most fourteen valid answers and preserves known values', () => {
  const measurementValues = form({ texts: { ...emptyNumericTexts }, symptoms: ['Tired', 'Trouble sleeping', 'Headache', 'Nausea'], symptomEntries: [kneeEntry, headEntry] });
  const ids = allQuestions(measurementValues).allQuestionIds;
  const responses = ids.map((id) => {
    const item = question(measurementValues, id);
    const answer = item.type === 'short-text'
      ? { optionIds: [], text: 'A brief note' }
      : { optionIds: [item.options[0].id], text: null };
    return createAdaptiveResponse(item, answer, 'guided', answeredAt, item.contextLabel);
  });
  const cleaned = sanitizeAdaptiveResponses([...responses, ...responses]);
  assert.equal(cleaned.length, Math.min(ids.length, ADAPTIVE_RESPONSE_MAX));
  assert.deepEqual(new Set(cleaned.map((item) => item.questionId)).size, cleaned.length);
});

test('19 legacy check-ins stay untouched and empty adaptive arrays are removed', () => {
  const legacy = checkInWith({ adaptiveResponses: undefined });
  assert.equal(normalizeCheckInAdaptive(legacy), legacy);
  const empty = normalizeCheckInAdaptive(checkInWith({ adaptiveResponses: [] }));
  assert.equal('adaptiveResponses' in empty, false);
  const valid = normalizeCheckInAdaptive(checkInWith());
  assert.equal(valid.adaptiveResponses.length, 2);
});

test('20 a saved draft includes active answers only, with skipped and inactive answers excluded', () => {
  const draft = draftFromForm(form({ symptoms: ['Tired'], adaptiveResponses: [fatigueOnset], adaptiveSkipped: ['fatigue-change'] }));
  assert.deepEqual(draft.adaptiveResponses.map((item) => item.questionId), ['fatigue-onset']);
  const inactiveDraft = draftFromForm(form({ symptoms: [], adaptiveResponses: [fatigueOnset] }));
  assert.equal('adaptiveResponses' in inactiveDraft, false);
  const inactive = findInactiveAdaptiveResponses(form({ symptoms: [], adaptiveResponses: [fatigueOnset] }));
  assert.deepEqual(inactive.map((item) => item.questionId), ['fatigue-onset']);
  assert.equal(activeAdaptiveQuestionIds(buildAdaptiveContext(form({ symptoms: ['Tired'] }))).has('fatigue-onset'), true);
});

test('21 handoff copies deep-copy answers and skipped session state', () => {
  const values = form({ symptoms: ['Tired'], adaptiveResponses: [fatigueOnset], adaptiveSkipped: ['fatigue-change'] });
  const copy = copyFormValues(values);
  copy.adaptiveResponses[0].answer.optionIds.push('previous-day');
  copy.adaptiveSkipped.push('fatigue-context');
  copy.symptoms.push('Headache');
  assert.deepEqual(values.adaptiveResponses[0].answer.optionIds, ['earlier-today']);
  assert.deepEqual(values.adaptiveSkipped, ['fatigue-change']);
  assert.deepEqual(values.symptoms, ['Tired']);
});

test('22 the session reducer persists sanitized factual answers with the saved check-in', () => {
  const state = sessionReducer(initialSessionState, {
    type: 'saveCheckIn',
    recordedAt: answeredAt,
    draft: {
      readings: checkInWith().readings,
      symptoms: ['Tired'],
      activityNote: '',
      adaptiveResponses: [fatigueOnset, { ...fatigueChangeNo, source: 'imported' }],
    },
  });
  const saved = state.checkIns[0];
  assert.deepEqual(saved.adaptiveResponses.map((item) => item.questionId), ['fatigue-onset']);
  assert.equal(JSON.stringify(state).includes('adaptiveSkipped'), false);
});

test('23 stored sessions normalize adaptive data while legacy records remain readable', () => {
  const legacy = checkInWith({ id: 'CHK-OLD' });
  delete legacy.adaptiveResponses;
  const session = normalizeStoredSession({
    checkIns: [
      legacy,
      checkInWith({ id: 'CHK-NEW', adaptiveResponses: [fatigueOnset, { ...fatigueOnset }] }),
    ],
    reports: [],
  });
  assert.equal('adaptiveResponses' in session.checkIns[0], false);
  assert.equal(session.checkIns[0].symptoms[0], 'Tired');
  assert.deepEqual(session.checkIns[1].adaptiveResponses.map((item) => item.questionId), ['fatigue-onset']);
});

test('24 report snapshots carry factual context without changing comparisons or explanation', () => {
  const withContext = createReportSnapshot(checkInWith());
  const withoutContext = createReportSnapshot(checkInWith({ adaptiveResponses: undefined }));
  assert.deepEqual(withContext.comparisons, withoutContext.comparisons);
  assert.deepEqual(withContext.explanation, withoutContext.explanation);
  assert.equal(withContext.checkIn.adaptiveResponses.length, 2);
  assert.match(canonicalJson(withContext), /fatigue-onset/);
  assert.doesNotMatch(canonicalJson(withContext), /diagnos|urgent|triage/i);
  withContext.checkIn.adaptiveResponses[0].answer.optionIds.push('previous-day');
  assert.deepEqual(checkInWith().adaptiveResponses[0].answer.optionIds, ['earlier-today']);
});

test('25 adaptive answers never affect the 10% assessment threshold or overall status', () => {
  const withContext = buildAssessment(createReportSnapshot(checkInWith()), { source: 'local', now });
  const withoutContext = buildAssessment(createReportSnapshot(checkInWith({ adaptiveResponses: undefined })), { source: 'local', now });
  assert.equal(withContext.thresholdPercent, 10);
  assert.equal(withContext.overallStatus, withoutContext.overallStatus);
  assert.deepEqual(withContext.findings, withoutContext.findings);
  assert.deepEqual(withContext.counts, withoutContext.counts);
});

test('26 replay copies recorded context read-only with the original timestamp', () => {
  const checkIn = checkInWith();
  const timeline = buildReplayTimeline({ checkIns: [checkIn], reports: [], source: 'local', missionDay: null });
  const frame = timeline.frames[0];
  assert.equal(frame.checkIn.adaptiveResponses.length, 2);
  assert.equal(frame.checkIn.adaptiveResponses[0].answeredAtUTC, answeredAt);
  frame.checkIn.adaptiveResponses[0].answer.optionIds.push('previous-day');
  assert.deepEqual(checkIn.adaptiveResponses[0].answer.optionIds, ['earlier-today']);
});

test('27 context lines stay factual, labeled, and show the original check-in source and time', () => {
  const lines = adaptiveContextLines([fatigueOnset, fatigueChangeNo]);
  assert.equal(lines[0].questionLabel, 'When did the tiredness first start?');
  assert.equal(lines[0].answerLabel, 'Earlier today');
  assert.equal(lines[0].answeredAtText, '17 Nov 2026, 09:00 UTC');
  assert.equal(lines[0].sourceLabel, 'Guided check-in');
  assert.equal(lines[1].answerLabel, 'No');
  assert.deepEqual(adaptiveContextLines(undefined), []);
  assert.equal(adaptiveContextLines([fatigueOnset, { ...fatigueOnset }]).length, 1);
  const described = describeAdaptiveResponse(fatigueOnset);
  assert.equal(described.question, 'When did the tiredness first start?');
  assert.equal(questionForResponse(fatigueOnset)?.id, 'fatigue-onset');
});

test('28 voice scripts read the question, choices, and skip semantics without alarming language', () => {
  const onset = buildAdaptiveQuestionRequest(question(fatigueValues, 'fatigue-onset'));
  assert.equal(onset.sourceId, 'adaptive-fatigue-onset');
  assert.match(onset.text, /Optional question\./);
  assert.match(onset.text, /When did the tiredness first start\?/);
  assert.match(onset.text, /Earlier today\. Previous day\. More than a day ago\. Not sure\./);
  assert.match(onset.text, /You can skip this question\./);
  assert.match(onset.text, /Skipped is not recorded as No\./);
  const note = buildAdaptiveQuestionRequest(question(fatigueValues, 'fatigue-context'));
  assert.match(note.text, /Answer with a short note in your own words/);
  assert.doesNotMatch(onset.text, /diagnos|urgent|emergency|triage|treat/i);
});

test('29 the rule engine stays pure with no routing, persistence, or network dependencies', () => {
  const moduleSource = source('lib/adaptiveQuestions.ts');
  assert.doesNotMatch(moduleSource, /expo-router|useRouter|saveCheckIn|sessionRepository|fetch\(|XMLHttpRequest/);
  const values = form({ symptoms: ['Tired'], adaptiveResponses: [fatigueOnset] });
  const snapshot = JSON.stringify(values);
  evaluateAdaptiveQuestions(buildAdaptiveContext(values), { limit: 3 });
  draftFromForm(values);
  assert.equal(JSON.stringify(values), snapshot);
});
