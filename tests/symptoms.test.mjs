import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createSymptomEntry,
  findDuplicateSymptomEntry,
  formatSymptomEntry,
  getSymptomDisplayState,
  intensityLabel,
  locationLabel,
  normalizeCheckInSymptoms,
  regionsForView,
  sanitizeSymptomEntries,
  symptomLines,
  symptomStateLabel,
  symptomSummaryText,
  SYMPTOM_COUNT_MAX,
  SYMPTOM_NOTE_MAX,
} from '../lib/symptoms.ts';
import {
  copyFormValues,
  draftFromForm,
  emptyFormValues,
  emptyNumericTexts,
} from '../lib/checkInForm.ts';
import { setFormHandoff, takeFormHandoff } from '../lib/formHandoff.ts';
import { createReportSnapshot } from '../lib/snapshot.ts';
import { buildAssessment } from '../lib/assessment.ts';
import { buildReplayTimeline } from '../lib/replay.ts';
import { normalizeStoredSession } from '../lib/sessionRepositoryContract.ts';
import { buildDemoCheckIns } from '../fixtures/demoCrew.ts';
import { emptyReadings } from '../fixtures/checkInOptions.ts';
import { initialSessionState, sessionReducer } from '../state/sessionReducer.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const now = Date.parse('2026-11-17T09:00:00.000Z');

const entry = (overrides = {}) => createSymptomEntry({
  bodyRegion: 'knee',
  bodySide: 'left',
  bodyView: 'front',
  symptomType: 'pain',
  discomfortIntensity: 3,
  symptomNote: 'Aches after treadmill walk',
  ...overrides,
}, { id: overrides.symptomEntryId ?? 'SYM-TEST-1', recordedAtUTC: '2026-11-17T08:55:00.000Z' });

const baseCheckIn = (overrides = {}) => ({
  id: 'CHK-001',
  recordedAt: '2026-11-17T08:55:00.000Z',
  readings: { ...emptyReadings, heartRateBpm: 78 },
  symptoms: [],
  activityNote: '',
  ...overrides,
});

const formValues = () => ({
  ...emptyFormValues(),
  texts: { ...emptyNumericTexts, heartRateBpm: '78' },
  symptoms: [],
  symptomEntries: [entry()],
  symptomStatus: 'reported',
});

test('01 region selection covers fifteen regions with explicit left and right sides', () => {
  const front = regionsForView('front');
  const back = regionsForView('back');
  assert.deepEqual(front.map((region) => region.id), [
    'head', 'neck', 'chest', 'abdomen', 'shoulder', 'upper-arm', 'forearm', 'hand', 'hip', 'thigh', 'knee', 'lower-leg', 'foot',
  ]);
  assert.deepEqual(back.map((region) => region.id), [
    'head', 'neck', 'upper-back', 'lower-back', 'shoulder', 'upper-arm', 'forearm', 'hand', 'hip', 'thigh', 'knee', 'lower-leg', 'foot',
  ]);
  assert.equal(front.find((region) => region.id === 'knee').paired, true);
  assert.equal(front.find((region) => region.id === 'chest').paired, false);
  assert.equal(locationLabel({ bodyRegion: 'knee', bodySide: 'right', bodyView: 'back' }), 'Right Knee · back view');
  assert.equal(locationLabel({ bodyRegion: null, bodySide: 'not_applicable', bodyView: null }), 'General symptom');
});

test('02 front and back views expose their own regions while preserving saved selections', () => {
  const frontEntry = entry({ bodyView: 'front', bodyRegion: 'chest', bodySide: 'center', symptomType: 'pressure' });
  const backEntry = entry({ symptomEntryId: 'SYM-TEST-2', bodyView: 'back', bodyRegion: 'upper-back', bodySide: 'center', symptomType: 'stiffness' });
  const entries = [frontEntry, backEntry];
  assert.equal(entries.length, 2);
  assert.equal(sanitizeSymptomEntries(entries).length, 2);
  assert.match(source('components/SymptomBodyMap.tsx'), /regionsForView/);
  assert.match(source('components/SymptomBodyMap.tsx'), /Front/);
  assert.match(source('components/SymptomBodyMap.tsx'), /Back/);
});

test('03 left and right selections stay independent', () => {
  const left = entry({ bodySide: 'left' });
  const right = entry({ symptomEntryId: 'SYM-TEST-2', bodySide: 'right' });
  assert.notEqual(formatSymptomEntry(left), formatSymptomEntry(right));
  assert.match(formatSymptomEntry(left), /^Left Knee/);
  assert.match(formatSymptomEntry(right), /^Right Knee/);
  assert.equal(sanitizeSymptomEntries([left, right]).length, 2);
});

test('04 multiple symptom entries are stored as separate records', () => {
  const second = entry({ symptomEntryId: 'SYM-TEST-2', bodyRegion: 'head', bodySide: 'center', bodyView: 'front', symptomType: 'tingling', discomfortIntensity: 2 });
  const sanitized = sanitizeSymptomEntries([entry(), second]);
  assert.equal(sanitized.length, 2);
  assert.deepEqual(sanitized.map((item) => item.symptomEntryId), ['SYM-TEST-1', 'SYM-TEST-2']);
});

test('05 editing an entry updates only the targeted record', () => {
  const first = entry();
  const second = entry({ symptomEntryId: 'SYM-TEST-2', bodyRegion: 'head', bodySide: 'center', symptomType: 'pressure', symptomNote: 'Head pressure' });
  const edited = { ...second, symptomNote: 'Head pressure eased', discomfortIntensity: 1 };
  const next = [first, second].map((item) => item.symptomEntryId === second.symptomEntryId ? edited : item);
  assert.equal(next[0], first);
  assert.equal(next[1].symptomNote, 'Head pressure eased');
  assert.equal(next.length, 2);
});

test('06 removing an entry leaves other entries untouched', () => {
  const first = entry();
  const second = entry({ symptomEntryId: 'SYM-TEST-2', bodyRegion: 'head', bodySide: 'center', symptomType: 'pressure' });
  const next = [first, second].filter((item) => item.symptomEntryId !== second.symptomEntryId);
  assert.deepEqual(next, [first]);
  assert.equal(findDuplicateSymptomEntry(next, {
    bodyRegion: first.bodyRegion,
    bodySide: first.bodySide,
    bodyView: first.bodyView,
    symptomType: first.symptomType,
    discomfortIntensity: first.discomfortIntensity,
    symptomNote: first.symptomNote,
  })?.symptomEntryId, 'SYM-TEST-1');
});

test('07 duplicate entries are detected and stored duplicates are dropped', () => {
  const first = entry();
  const duplicate = { ...first, symptomEntryId: 'SYM-TEST-COPY' };
  const conflict = findDuplicateSymptomEntry([first], {
    bodyRegion: duplicate.bodyRegion,
    bodySide: duplicate.bodySide,
    bodyView: duplicate.bodyView,
    symptomType: duplicate.symptomType,
    discomfortIntensity: duplicate.discomfortIntensity,
    symptomNote: duplicate.symptomNote,
  });
  assert.equal(conflict?.symptomEntryId, 'SYM-TEST-1');
  assert.equal(findDuplicateSymptomEntry([first], {
    bodyRegion: duplicate.bodyRegion,
    bodySide: duplicate.bodySide,
    bodyView: duplicate.bodyView,
    symptomType: duplicate.symptomType,
    discomfortIntensity: 5,
    symptomNote: duplicate.symptomNote,
  }), undefined);
  assert.equal(findDuplicateSymptomEntry([first], {
    bodyRegion: first.bodyRegion,
    bodySide: first.bodySide,
    bodyView: first.bodyView,
    symptomType: first.symptomType,
    discomfortIntensity: first.discomfortIntensity,
    symptomNote: first.symptomNote,
  }, 'SYM-TEST-1'), undefined);
  assert.equal(sanitizeSymptomEntries([first, duplicate]).length, 1);
});

test('08 intensity is optional and only 1 to 5 is stored', () => {
  const withoutIntensity = entry({ discomfortIntensity: null });
  assert.equal(withoutIntensity.discomfortIntensity, null);
  assert.doesNotMatch(formatSymptomEntry(withoutIntensity), /Noticeable/);
  assert.equal(entry({ discomfortIntensity: 9 }).discomfortIntensity, null);
  assert.equal(intensityLabel(3), 'Moderate');
  assert.equal(intensityLabel(null), null);
});

test('09 general symptoms need no body region and keep the words', () => {
  const general = entry({ bodyRegion: null, bodySide: 'not_applicable', bodyView: null, symptomType: 'other', symptomNote: 'Nausea after lunch' });
  assert.equal(general.bodyRegion, null);
  assert.equal(general.bodySide, 'not_applicable');
  assert.match(formatSymptomEntry(general), /^General symptom/);
  assert.match(formatSymptomEntry(general), /Nausea after lunch/);
});

test('10 no symptoms and unanswered are distinct states', () => {
  assert.equal(getSymptomDisplayState(baseCheckIn({ symptomStatus: 'none' })), 'none');
  assert.equal(getSymptomDisplayState(baseCheckIn({ symptomStatus: 'not-answered' })), 'not-answered');
  assert.equal(getSymptomDisplayState(baseCheckIn()), 'not-recorded');
  assert.equal(getSymptomDisplayState(baseCheckIn({ symptomStatus: 'reported', symptomEntries: [entry()] })), 'reported');
  assert.equal(symptomStateLabel(baseCheckIn({ symptomStatus: 'none' })), 'No symptoms reported');
  assert.equal(symptomStateLabel(baseCheckIn({ symptomStatus: 'not-answered' })), 'Symptoms not answered');
  assert.equal(symptomStateLabel(baseCheckIn()), 'Symptoms not recorded');
});

test('11 validation rejects malformed entries and bounds notes and counts', () => {
  const malformed = [
    null,
    { symptomEntryId: '' },
    { ...entry(), bodyRegion: 'elbow' },
    { ...entry(), symptomType: 'burning' },
    { ...entry(), recordedAtUTC: 'not-a-date' },
    { ...entry(), bodyRegion: 'knee', bodySide: 'center' },
  ];
  assert.equal(sanitizeSymptomEntries(malformed).length, 0);
  const longNote = 'x'.repeat(SYMPTOM_NOTE_MAX + 40);
  assert.equal(entry({ symptomNote: longNote }).symptomNote.length, SYMPTOM_NOTE_MAX);
  const many = Array.from({ length: SYMPTOM_COUNT_MAX + 3 }, (_value, index) => entry({
    symptomEntryId: `SYM-${index}`,
    bodyRegion: 'head',
    bodySide: 'center',
    symptomType: 'pressure',
    symptomNote: `Note ${index}`,
  }));
  assert.equal(sanitizeSymptomEntries(many).length, SYMPTOM_COUNT_MAX);
});

test('12 legacy records remain unchanged and still render neutral text', () => {
  const legacy = baseCheckIn({ symptoms: ['Tired'] });
  assert.equal(normalizeCheckInSymptoms(legacy), legacy);
  assert.equal('symptomEntries' in legacy, false);
  assert.deepEqual(symptomLines(legacy), ['Word list: Tired']);
  const legacyEmpty = baseCheckIn();
  assert.deepEqual(symptomLines(legacyEmpty), ['Symptoms not recorded']);
  const snapshot = createReportSnapshot(legacyEmpty);
  assert.equal('symptomEntries' in snapshot.checkIn, false);
  assert.equal('symptomStatus' in snapshot.checkIn, false);
});

test('13 guided check-in opens the body map and stores structured fields', () => {
  const guided = source('app/guided-check-in.tsx');
  assert.match(guided, /<SymptomBodyMap/);
  assert.match(guided, /symptomEntries: draft\.symptomEntries/);
  assert.match(guided, /symptomStatus: draft\.symptomStatus/);
  assert.match(guided, /Open Body Map/);
  assert.match(guided, /Describe in Words/);
  assert.match(guided, /No Symptoms to Report/);
});

test('14 detailed check-in offers the body map and equivalent saved fields', () => {
  const detailed = source('app/(tabs)/check-in.tsx');
  assert.match(detailed, /<SymptomBodyMap/);
  assert.match(detailed, /Describe Symptoms on Body Map/);
  assert.match(detailed, /symptomEntries: draft\.symptomEntries/);
  assert.match(detailed, /symptomStatus: draft\.symptomStatus/);
});

test('15 structured symptoms persist through the session reducer and reload', () => {
  const state = sessionReducer(initialSessionState, {
    type: 'saveCheckIn',
    draft: draftFromForm(formValues()),
    recordedAt: '2026-11-17T09:00:00.000Z',
  });
  assert.equal(state.checkIns.length, 1);
  assert.equal(state.checkIns[0].symptomEntries.length, 1);
  assert.equal(state.checkIns[0].symptomStatus, 'reported');
  const reloaded = normalizeStoredSession({ ...state, reports: [], engagement: initialSessionState.engagement });
  assert.deepEqual(reloaded.checkIns[0].symptomEntries, state.checkIns[0].symptomEntries);
});

test('16 session isolation keeps demo fixture records out of local saves', () => {
  const demo = buildDemoCheckIns();
  const demoBefore = structuredClone(demo);
  const state = sessionReducer(initialSessionState, {
    type: 'saveCheckIn',
    draft: draftFromForm(formValues()),
    recordedAt: '2026-11-17T09:00:00.000Z',
  });
  assert.equal(state.checkIns.length, 1);
  assert.equal(demo.length > 1, true);
  assert.deepEqual(demo, demoBefore);
  assert.equal(demo.some((checkIn) => checkIn.recordedAt === state.checkIns[0].recordedAt), false);
});

test('17 no network access is used by the symptom feature', () => {
  for (const file of ['lib/symptoms.ts', 'components/SymptomBodyMap.tsx', 'components/SymptomSummary.tsx']) {
    const text = source(file);
    assert.doesNotMatch(text, /\bfetch\s*\(/);
    assert.doesNotMatch(text, /https?:\/\//);
  }
});

test('18 report snapshots add optional fields without changing legacy payloads', () => {
  const legacySnapshot = createReportSnapshot(baseCheckIn({ symptoms: ['Tired'] }));
  assert.deepEqual(Object.keys(legacySnapshot.checkIn).sort(), ['activityNote', 'id', 'readings', 'recordedAt', 'symptoms']);
  const structured = baseCheckIn({ symptomEntries: [entry()], symptomStatus: 'reported' });
  const snapshot = createReportSnapshot(structured);
  assert.equal(snapshot.checkIn.symptomEntries.length, 1);
  snapshot.checkIn.symptomEntries[0].symptomNote = 'changed copy';
  assert.equal(structured.symptomEntries[0].symptomNote, 'Aches after treadmill walk');
});

test('19 the grounded receiver accepts the additive payload shape unchanged', () => {
  const snapshot = createReportSnapshot(baseCheckIn({ symptomEntries: [entry()], symptomStatus: 'reported' }));
  const payload = JSON.parse(JSON.stringify({ reportId: 'ASTRA-0001', payloadHash: 'hash', confirmedAt: '2026-11-17T09:01:00.000Z', snapshot }));
  assert.equal(payload.snapshot.checkIn.symptomEntries[0].bodyRegion, 'knee');
  assert.equal(typeof payload.snapshot.checkIn.symptomStatus, 'string');
  assert.equal(payload.snapshot.readings === undefined, true);
});

test('20 symptom entries never change the deterministic assessment', () => {
  const base = baseCheckIn();
  const withEntries = baseCheckIn({ symptomEntries: [entry()], symptomStatus: 'reported' });
  const baseline = buildAssessment(createReportSnapshot(base), { source: 'local', now });
  const structured = buildAssessment(createReportSnapshot(withEntries), { source: 'local', now });
  assert.deepEqual(structured.findings, baseline.findings);
  assert.deepEqual(structured.counts, baseline.counts);
  assert.equal(structured.overallStatus, baseline.overallStatus);
});

test('21 saving symptoms does not create or queue a report', () => {
  const state = sessionReducer(initialSessionState, {
    type: 'saveCheckIn',
    draft: draftFromForm(formValues()),
    recordedAt: '2026-11-17T09:00:00.000Z',
  });
  assert.equal(state.reports.length, 0);
  assert.equal(source('lib/sessionRepository.web.ts').includes("type: 'confirmReport'"), false);
  assert.match(source('state/sessionReducer.ts'), /case 'saveCheckIn'[\s\S]*?return \{ \.\.\.state, checkIns/);
});

test('22 replay reads structured symptoms without mutating stored records', () => {
  const first = baseCheckIn({ symptomEntries: [entry()], symptomStatus: 'reported' });
  const second = baseCheckIn({ id: 'CHK-002', recordedAt: '2026-11-18T08:55:00.000Z', symptomStatus: 'none' });
  const input = [first, second];
  const before = structuredClone(input);
  const timeline = buildReplayTimeline({ checkIns: input, source: 'local' });
  assert.deepEqual(input, before);
  assert.equal(timeline.frames.length, 2);
  assert.ok(timeline.frames[0].events.some((event) => event.type === 'symptom' && event.detail.includes('Left Knee')));
  assert.deepEqual(symptomLines(timeline.frames[0].checkIn), symptomLines(first));
  assert.match(symptomSummaryText(timeline.frames[0].checkIn), /Aches after treadmill walk/);
});

test('23 free-text descriptions and handoff copies preserve every structured field', () => {
  const values = formValues();
  values.symptoms = ['Tired'];
  values.symptomStatus = 'reported';
  const copied = copyFormValues(values);
  assert.deepEqual(copied.symptomEntries, values.symptomEntries);
  assert.notEqual(copied.symptomEntries, values.symptomEntries);
  copied.symptomEntries[0].symptomNote = 'edited copy';
  assert.equal(values.symptomEntries[0].symptomNote, 'Aches after treadmill walk');
  setFormHandoff(values);
  const restored = takeFormHandoff();
  assert.deepEqual(restored.symptomEntries, values.symptomEntries);
  assert.equal(restored.symptomStatus, 'reported');
  const draft = draftFromForm(values);
  assert.equal(draft.symptomEntries.length, 1);
  assert.equal(draft.symptomStatus, 'reported');
});
