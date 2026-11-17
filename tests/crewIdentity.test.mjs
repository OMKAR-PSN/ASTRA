import test from 'node:test';
import assert from 'node:assert/strict';

import { CREW_QR_TYPE, encodeCrewQrPayload, parseCrewQrPayload } from '../lib/crewIdentity.ts';
import {
  DEMO_CREW_ID,
  demoCrewQrPayload,
  buildDemoCheckIns,
  demoCrewIdentity,
  demoCrewRecordCount,
  validateDemoCheckIns,
} from '../fixtures/demoCrew.ts';
import { DIFFERENCE_THRESHOLD_PERCENT, compareToBaseline } from '../lib/comparison.ts';
import { createCrewDemoRepository } from '../lib/crewDemoRepository.ts';

test('demo QR payload carries only version, type, and crew id', () => {
  const payload = JSON.parse(demoCrewQrPayload);
  assert.deepEqual(Object.keys(payload).sort(), ['crewId', 'type', 'version']);
  assert.equal(payload.version, 1);
  assert.equal(payload.type, CREW_QR_TYPE);
  assert.equal(payload.crewId, DEMO_CREW_ID);
  assert.equal(encodeCrewQrPayload(DEMO_CREW_ID), demoCrewQrPayload);
  assert.deepEqual(parseCrewQrPayload(demoCrewQrPayload, [DEMO_CREW_ID]), { ok: true, crewId: DEMO_CREW_ID });
});

test('QR parser rejects malformed, foreign, and unknown crew codes', () => {
  const cases = [
    ['', 'empty'],
    ['not-json', 'malformed'],
    ['[]', 'malformed'],
    ['{}', 'wrong_type'],
    [JSON.stringify({ version: 1, type: 'ASTRA_CARE_REAL_CREW', crewId: DEMO_CREW_ID }), 'wrong_type'],
    [JSON.stringify({ version: 2, type: CREW_QR_TYPE, crewId: DEMO_CREW_ID }), 'unsupported_version'],
    [JSON.stringify({ version: 1, type: CREW_QR_TYPE, crewId: 'avery-001' }), 'invalid_crew_id'],
    [JSON.stringify({ version: 1, type: CREW_QR_TYPE, crewId: 'UNKNOWN-999' }), 'unknown_crew'],
    ['x'.repeat(257), 'too_long'],
  ];
  for (const [raw, reason] of cases) {
    assert.deepEqual(parseCrewQrPayload(raw, [DEMO_CREW_ID]), { ok: false, reason }, raw);
  }
});

test('demo fixture is deterministic and returns isolated copies', () => {
  const first = buildDemoCheckIns();
  const second = buildDemoCheckIns();
  assert.deepEqual(first, second);
  assert.equal(first.length, demoCrewRecordCount);
  assert.equal(new Set(first.map((checkIn) => checkIn.id)).size, first.length);

  first[0].readings.heartRateBpm = 999;
  first[0].symptoms.push('Headache');
  assert.notEqual(second[0].readings.heartRateBpm, 999);
  assert.deepEqual(second[0].symptoms, []);
});

test('demo fixture passes existing reading limits and justifies a 10% review', () => {
  assert.deepEqual(validateDemoCheckIns(), { ok: true, issues: [] });
  assert.equal(DIFFERENCE_THRESHOLD_PERCENT, 10);

  const latest = buildDemoCheckIns().at(-1);
  assert.ok(latest);
  const comparisons = compareToBaseline(latest.readings, demoCrewIdentity.baseline);
  const flagged = comparisons.filter(
    (item) => item.percentChange !== null && Math.abs(item.percentChange) >= DIFFERENCE_THRESHOLD_PERCENT,
  );
  assert.ok(flagged.length >= 1);
  assert.ok(flagged.some((item) => item.label === 'Heart rate'));
});

test('every demo activation loads the same fixture without duplication', async () => {
  const repository = createCrewDemoRepository();
  const first = await repository.load();
  const second = await repository.load();
  assert.deepEqual(first, second);
  assert.equal(first.checkIns.length, demoCrewRecordCount);
  assert.equal(first.reports.length, 0);

  const reidentified = createCrewDemoRepository();
  assert.deepEqual(await reidentified.load(), first);
});

test('a manual demo check-in is session-only and resets on re-identification', async () => {
  const repository = createCrewDemoRepository();
  await repository.saveCheckIn({
    readings: { heartRateBpm: 73, systolicMmHg: 117, diastolicMmHg: 75, temperatureC: 36.7, sleepHours: 7.4, mood: 4, stress: 2 },
    symptoms: [],
    activityNote: 'Manual entry inside the fictional demo session.',
  }, '2026-11-16T09:00:00.000Z');

  const after = await repository.load();
  assert.equal(after.checkIns.length, demoCrewRecordCount + 1);
  assert.equal(after.checkIns.at(-1).id, `CHK-${String(demoCrewRecordCount + 1).padStart(3, '0')}`);

  const reidentified = createCrewDemoRepository();
  assert.equal((await reidentified.load()).checkIns.length, demoCrewRecordCount);
});

test('confirming a demo report queues it without a receiver receipt', async () => {
  const repository = createCrewDemoRepository();
  const latest = (await repository.load()).checkIns.at(-1);
  assert.ok(latest);
  const report = await repository.confirmReport(latest.id, '2026-11-15T08:00:00.000Z');
  assert.equal(report.status, 'queued');
  assert.equal(report.receipt, null);
  assert.equal(report.snapshot.checkIn.id, latest.id);
  assert.equal(report.snapshot.comparisons.length, 5);
});
