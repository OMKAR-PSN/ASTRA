import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssessment } from '../lib/assessment.ts';
import { compareToBaseline } from '../lib/comparison.ts';
import { syntheticBaseline } from '../fixtures/crew.ts';
import { buildReplayTimeline } from '../lib/replay.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';
import { knowledgeCards } from '../lib/knowledge/index.ts';
import {
  DEFAULT_VOICE_PREFERENCES,
  VOICE_NO_START_MESSAGE,
  VOICE_UNAVAILABLE_MESSAGE,
} from '../lib/voice/types.ts';
import {
  VOICE_PREFERENCES_STORAGE_KEY,
  parseVoicePreferences,
  serializeVoicePreferences,
} from '../lib/voice/preferences.ts';
import {
  DEFAULT_SPEECH_CHUNK_CHARS,
  normalizeSpeechText,
  splitSpeechText,
} from '../lib/voice/text.ts';
import {
  BODY_MAP_SPEECH,
  buildAssessmentOverviewRequest,
  buildBodyMapRequest,
  buildCalculationRequest,
  buildFindingExplanationRequest,
  buildGuidedStepRequest,
  buildKnowledgeRequest,
  buildReplaySummaryRequest,
} from '../lib/voice/builders.ts';
import { createVoiceController } from '../lib/voice/controller.ts';

const NOW = Date.parse('2026-11-17T09:00:00.000Z');

const checkIn = (overrides = {}) => ({
  id: 'CHK-VOICE-1',
  recordedAt: '2026-11-17T08:00:00.000Z',
  readings: {
    heartRateBpm: 81,
    systolicMmHg: 116,
    diastolicMmHg: 74,
    temperatureC: 36.7,
    sleepHours: 7.5,
    mood: 4,
    stress: 2,
    ...overrides,
  },
  symptoms: [],
  activityNote: '',
});

const assess = (record = checkIn()) =>
  buildAssessment(createReportSnapshot(record), { source: 'demo', now: NOW });

const finding = (assessment, label) => assessment.findings.find((item) => item.label === label);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createMockEngine({ supported = true } = {}) {
  const calls = [];
  let stopCount = 0;
  const engine = {
    isSupported: () => supported,
    speak: (text, options, callbacks) => {
      calls.push({ text, options, callbacks });
    },
    stop: async () => {
      stopCount += 1;
    },
    getVoices: async () => [{ id: 'voice-test', name: 'Test Voice', language: 'en-US', local: true }],
  };
  return {
    engine,
    calls,
    stops: () => stopCount,
    last: () => calls[calls.length - 1],
  };
}

const speakRequest = (text = 'One short sentence.', sourceId = 'source-1') => ({
  sourceId,
  label: 'Test source',
  text,
});

test('01 speech text is normalized and split at sentence boundaries', () => {
  assert.equal(normalizeSpeechText('  Hello \n  crew.  '), 'Hello crew.');
  assert.deepEqual(splitSpeechText('   '), []);

  const shortSource = 'First sentence with several extra words. Second sentence with more of them? Third sentence ends it.';
  const chunks = splitSpeechText(shortSource, 80);
  assert.equal(chunks.join(' '), shortSource);
  assert.ok(chunks.length >= 2, 'short chunk limit forces a split');
  for (const chunk of chunks) assert.ok(chunk.length <= 80);

  const longSentence = `${'word '.repeat(200)}end.`;
  const longChunks = splitSpeechText(longSentence, DEFAULT_SPEECH_CHUNK_CHARS);
  assert.ok(longChunks.length > 1);
  for (const chunk of longChunks) assert.ok(chunk.length <= DEFAULT_SPEECH_CHUNK_CHARS);
});

test('02 guided prompts reuse existing titles and add units without inventing values', () => {
  const wellbeing = buildGuidedStepRequest('wellbeing');
  assert.match(wellbeing.text, /How are you feeling\?/);
  assert.match(wellbeing.text, /one to five scale/);
  assert.equal(wellbeing.sourceId, 'guided-wellbeing');

  const sleep = buildGuidedStepRequest('sleep');
  assert.match(sleep.text, /hours control/);
  assert.match(sleep.text, /Leave it blank if you did not measure it/);

  const vitals = buildGuidedStepRequest('vitals');
  for (const phrase of ['beats per minute', 'millimeters of mercury', 'degrees Celsius']) {
    assert.ok(vitals.text.includes(phrase), `vitals prompt mentions ${phrase}`);
  }
  assert.doesNotMatch(vitals.text, /\b81\b|\b72\b/, 'no measurement values are prefilled');

  const symptoms = buildGuidedStepRequest('symptoms');
  assert.match(symptoms.text, /word list/);
  assert.match(symptoms.text, /Private notes are never read aloud/);

  const review = buildGuidedStepRequest('review');
  assert.match(review.text, /Nothing is saved until you press Save check-in/);
});

test('03 assessment explanation speaks real units and the non-diagnostic note', () => {
  const assessment = assess();
  const heartRate = finding(assessment, 'Heart rate');
  const request = buildFindingExplanationRequest(heartRate, assessment.nextSteps[0]);

  assert.match(request.text, /The recorded heart rate is 81 beats per minute\./);
  assert.match(request.text, /The fictional personal baseline is 72 beats per minute\./);
  assert.match(request.text, /not a diagnosis/);
  assert.ok(request.text.includes(assessment.nextSteps[0]));
  assert.doesNotMatch(request.text, /81\s*bpm/);
  assert.doesNotMatch(request.text, /\bdiagnosed\b/i);

  const temperature = buildFindingExplanationRequest(finding(assessment, 'Body temperature'));
  assert.match(temperature.text, /degrees Celsius/);
  assert.doesNotMatch(temperature.text, /°C/);

  const mood = buildFindingExplanationRequest(finding(assessment, 'Mood'));
  assert.match(mood.text, /one to five scale/);
  assert.match(mood.text, /out of 5/);

  const overview = buildAssessmentOverviewRequest(assessment);
  assert.ok(overview.text.includes(assessment.summaryTitle));
  assert.match(overview.text, /10 percent rule/);
  assert.doesNotMatch(overview.text, /10%/);
  assert.match(overview.text, /not a medical diagnosis/);
});

test('04 percentage narration avoids symbols and keeps the prototype threshold explicit', () => {
  const assessment = assess();
  const heartRate = finding(assessment, 'Heart rate');
  const request = buildCalculationRequest(heartRate, assessment.thresholdPercent);

  assert.match(request.text, /The difference is 9 beats per minute, above the baseline\./);
  assert.match(request.text, /percentage difference of 12\.5 percent/);
  assert.match(request.text, /prototype review rule is 10 percent/);
  assert.doesNotMatch(request.text, /12\.5%|10%|÷|×|−/);

  const closer = assess(checkIn({ heartRateBpm: 60 }));
  const lower = buildCalculationRequest(finding(closer, 'Heart rate'), closer.thresholdPercent);
  assert.match(lower.text, /below the baseline/);
  assert.match(lower.text, /percentage difference of 16\.67 percent/);
});

test('05 empty or zero values never become invented numbers', () => {
  const missing = assess(checkIn({ heartRateBpm: null }));
  const missingFinding = finding(missing, 'Heart rate');
  const missingRequest = buildCalculationRequest(missingFinding, missing.thresholdPercent);
  assert.match(missingRequest.text, /No current observation was recorded for heart rate\./);
  assert.match(missingRequest.text, /no difference or percentage is calculated/);
  assert.doesNotMatch(missingRequest.text, /is 0 beats per minute/);

  const snapshot = createReportSnapshot(checkIn());
  snapshot.baseline = { ...syntheticBaseline, heartRateBpm: 0 };
  snapshot.comparisons = compareToBaseline(snapshot.checkIn.readings, snapshot.baseline);
  const zero = buildAssessment(snapshot, { source: 'local', now: NOW });
  const zeroRequest = buildCalculationRequest(finding(zero, 'Heart rate'), zero.thresholdPercent);
  assert.match(zeroRequest.text, /The baseline is zero, so a percentage difference is undefined\./);
  assert.doesNotMatch(zeroRequest.text, /percent above the baseline/);

  const selfReported = buildCalculationRequest(finding(missing, 'Mood'), missing.thresholdPercent);
  assert.match(selfReported.text, /no personal baseline/);

  const noTimestampRecord = createReportSnapshot({
    ...checkIn(),
    recordedAt: 'not-a-date',
  });
  const noTimestampAssessment = buildAssessment(noTimestampRecord, { source: 'local', now: NOW });
  const noTimeRequest = buildCalculationRequest(
    finding(noTimestampAssessment, 'Heart rate'),
    noTimestampAssessment.thresholdPercent,
  );
  assert.match(noTimeRequest.text, /The recorded time is unavailable\./);
});

test('06 knowledge narration reuses bundled card text and never speaks URLs', () => {
  const card = knowledgeCards.find((item) => item.id === 'personal-baseline');
  assert.ok(card);

  const quick = buildKnowledgeRequest(card, 'quick');
  assert.ok(quick.text.includes(card.summary));
  assert.ok(quick.text.startsWith(card.title));

  const simple = buildKnowledgeRequest(card, 'simple');
  assert.ok(simple.text.includes(card.plainLanguageBody));
  assert.ok(simple.text.includes(card.example));

  const expanded = buildKnowledgeRequest(card, 'expanded');
  assert.ok(expanded.text.includes(card.extendedExplanation));
  assert.match(expanded.text, /educational context/);

  for (const section of ['quick', 'simple', 'expanded']) {
    const request = buildKnowledgeRequest(card, section);
    assert.doesNotMatch(request.text, /https?:\/\//);
    assert.doesNotMatch(request.text, /www\./);
  }

  const updated = { ...card, plainLanguageBody: 'Updated local explanation text.' };
  assert.ok(buildKnowledgeRequest(updated, 'simple').text.includes('Updated local explanation text.'));
});

test('07 playback moves through preparing, speaking and completed states', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 500 });

  assert.equal(controller.speak(speakRequest('Hello crew.'), 'scope-a'), true);
  assert.equal(controller.getSnapshot().status, 'preparing');
  assert.equal(controller.getSnapshot().activeSourceId, 'source-1');

  await flush();
  assert.equal(mock.calls.length, 1);
  mock.last().callbacks.onStart();
  assert.equal(controller.getSnapshot().status, 'speaking');

  mock.last().callbacks.onDone();
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.status, 'completed');
  assert.equal(snapshot.activeSourceId, null);
  assert.equal(snapshot.lastSourceId, 'source-1');
  assert.equal(snapshot.lastLabel, 'Test source');
  controller.dispose();
});

test('08 stop cancels playback and late callbacks cannot revive it', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 500 });
  controller.speak(speakRequest(), 'scope-a');
  await flush();
  mock.last().callbacks.onStart();
  assert.equal(controller.getSnapshot().status, 'speaking');

  const stoppable = mock.last().callbacks;
  await controller.stop();
  assert.equal(controller.getSnapshot().status, 'stopped');
  assert.ok(mock.stops() >= 1);

  stoppable.onDone();
  assert.equal(controller.getSnapshot().status, 'stopped');
  stoppable.onStopped();
  assert.equal(controller.getSnapshot().status, 'stopped');
  controller.dispose();
});

test('09 starting another utterance stops the first and ignores its callbacks', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 500 });
  controller.speak(speakRequest('First utterance.', 'source-a'), 'scope-a');
  await flush();
  const first = mock.last().callbacks;
  first.onStart();
  assert.equal(controller.getSnapshot().status, 'speaking');

  controller.speak(speakRequest('Second utterance.', 'source-b'), 'scope-a');
  await flush();
  assert.equal(mock.calls.length, 2);
  assert.ok(mock.stops() >= 2, 'the previous utterance is stopped before the new one');

  first.onDone();
  assert.equal(controller.getSnapshot().activeSourceId, 'source-b');
  assert.equal(controller.getSnapshot().status, 'preparing');

  mock.last().callbacks.onStart();
  assert.equal(controller.getSnapshot().status, 'speaking');
  assert.equal(controller.getSnapshot().activeLabel, 'Test source');
  controller.dispose();
});

test('10 dispose stops the engine and blocks further playback', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 500 });
  controller.speak(speakRequest(), 'scope-a');
  await flush();
  const callbacks = mock.last().callbacks;
  callbacks.onStart();
  const before = JSON.stringify(controller.getSnapshot());

  controller.dispose();
  assert.ok(mock.stops() >= 1);
  callbacks.onDone();
  assert.equal(JSON.stringify(controller.getSnapshot()), before);
  assert.equal(controller.speak(speakRequest('After dispose.'), 'scope-a'), false);
});

test('11 an outdated utterance that never starts reports the fallback without hanging', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 20 });
  controller.speak(speakRequest('Slow engine.'), 'scope-a');
  await flush();
  assert.equal(controller.getSnapshot().status, 'preparing');

  await new Promise((resolve) => setTimeout(resolve, 50));
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.status, 'error');
  assert.equal(snapshot.error, VOICE_NO_START_MESSAGE);
  assert.equal(snapshot.activeSourceId, null);
  assert.ok(mock.stops() >= 1);
  controller.dispose();
});

test('12 unsupported platforms fall back without throwing or speaking', () => {
  const mock = createMockEngine({ supported: false });
  const controller = createVoiceController({ engine: mock.engine });
  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.supported, false);
  assert.equal(snapshot.status, 'unavailable');
  assert.equal(snapshot.unavailableReason, VOICE_UNAVAILABLE_MESSAGE);
  assert.equal(controller.speak(speakRequest(), 'scope-a'), false);
  assert.equal(mock.calls.length, 0);
  controller.dispose();
});

test('13 empty text is rejected before reaching the speech engine', () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine });
  assert.equal(controller.speak(speakRequest('   \n  '), 'scope-a'), false);
  assert.equal(mock.calls.length, 0);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.replay('scope-a'), false);
  controller.dispose();
});

test('14 long text is queued chunk by chunk and completes only after the last chunk', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, chunkChars: 80, watchdogMs: 500 });
  const longText = `${'Long sentence number one with several words. '.repeat(3)}${'Final sentence here. '.repeat(3)}`;
  const expected = splitSpeechText(longText, 80);
  assert.ok(expected.length > 2);

  controller.speak({ sourceId: 'long', label: 'Long text', text: longText }, 'scope-a');
  await flush();
  assert.equal(mock.calls.length, 1);

  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(mock.calls[index].text, expected[index]);
    assert.ok(mock.calls[index].text.length <= 80);
    mock.calls[index].callbacks.onStart();
    mock.calls[index].callbacks.onDone();
  }
  assert.equal(mock.calls.length, expected.length);
  assert.equal(controller.getSnapshot().status, 'completed');
  controller.dispose();
});

test('15 voice preferences round-trip and reject malformed stored values', () => {
  assert.equal(VOICE_PREFERENCES_STORAGE_KEY, 'astra-care.voice-preferences.v1');

  const preferences = { enabled: false, rate: 'fast', voiceId: 'voice-test' };
  assert.deepEqual(parseVoicePreferences(serializeVoicePreferences(preferences)), preferences);

  assert.deepEqual(parseVoicePreferences(null), DEFAULT_VOICE_PREFERENCES);
  assert.deepEqual(parseVoicePreferences('not json'), DEFAULT_VOICE_PREFERENCES);
  assert.deepEqual(
    parseVoicePreferences(JSON.stringify({ enabled: 'yes', rate: 'warp', voiceId: 42 })),
    DEFAULT_VOICE_PREFERENCES,
  );
  assert.deepEqual(
    parseVoicePreferences(JSON.stringify({ enabled: false, rate: 'slow', voiceId: '  ' })),
    { ...DEFAULT_VOICE_PREFERENCES, enabled: false, rate: 'slow', voiceId: null },
  );
});

test('16 disabling voice stops active playback and rejects new speech', async () => {
  const mock = createMockEngine();
  const controller = createVoiceController({ engine: mock.engine, watchdogMs: 500 });
  controller.speak(speakRequest(), 'scope-a');
  await flush();
  mock.last().callbacks.onStart();

  controller.setPreferences({ ...DEFAULT_VOICE_PREFERENCES, enabled: false });
  assert.equal(controller.getSnapshot().status, 'stopped');
  assert.equal(controller.speak(speakRequest('Should not play.'), 'scope-a'), false);
  assert.equal(mock.calls.length, 1);
  controller.dispose();
});

test('17 body map and replay narration never include private notes', () => {
  for (const text of Object.values(BODY_MAP_SPEECH)) {
    assert.doesNotMatch(text, /My private note|dull headache behind my eyes/);
  }
  assert.match(buildBodyMapRequest('region').text, /not a diagnosis/);
  assert.match(buildBodyMapRequest('symptom').text, /not read aloud/);
  assert.match(buildBodyMapRequest('intensity').text, /does not classify severity/);

  const timeline = buildReplayTimeline({
    checkIns: [{ ...checkIn(), activityNote: 'Private activity note that must not be spoken.' }],
    reports: [],
    source: 'local',
    missionDay: null,
  });
  const request = buildReplaySummaryRequest(timeline.frames[0]);
  assert.match(request.text, /Historical observation from/);
  assert.match(request.text, /beats per minute/);
  assert.match(request.text, /not live telemetry/);
  assert.match(request.text, /synthetic|Synthetic/);
  assert.doesNotMatch(request.text, /Private activity note/);
});

test('18 narration reads stored records without mutating them', () => {
  const assessment = assess();
  const heartRate = finding(assessment, 'Heart rate');
  const assessmentBefore = JSON.stringify(assessment);
  const timeline = buildReplayTimeline({ checkIns: [checkIn()], reports: [], source: 'demo', missionDay: 42 });
  const timelineBefore = JSON.stringify(timeline);

  buildAssessmentOverviewRequest(assessment);
  buildFindingExplanationRequest(heartRate, assessment.nextSteps[0]);
  buildCalculationRequest(heartRate, assessment.thresholdPercent);
  buildReplaySummaryRequest(timeline.frames[0]);

  assert.equal(JSON.stringify(assessment), assessmentBefore);
  assert.equal(JSON.stringify(timeline), timelineBefore);
});
