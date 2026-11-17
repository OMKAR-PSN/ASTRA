import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { demoCrewIdentity } from '../fixtures/demoCrew.ts';
import {
  PERSONAL_HEALTH_LINKS,
  PRIVACY_DEMO_BANNER,
  PRIVACY_SHIELD_BODY,
  PRIVACY_SHIELD_LIMIT,
  PRIVACY_SHIELD_TITLE,
  buildCrewOperationalSummary,
  buildPersonalHealthView,
  describePrivacySession,
} from '../lib/privacy.ts';

const source = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const local = () => describePrivacySession({ active: false, activeCrewId: null });
const demo = (crewId = demoCrewIdentity.crewId) => describePrivacySession({ active: true, activeCrewId: crewId });
const now = '2026-11-17T12:00:00.000Z';

const checkIn = (id, recordedAt, extra = {}) => ({
  id,
  recordedAt,
  readings: { heartRateBpm: 188, systolicMmHg: 199, diastolicMmHg: 121, temperatureC: 41.2, sleepHours: 1.1, mood: 1, stress: 5 },
  symptoms: ['SECRET-SYMPTOM'],
  symptomEntries: [],
  symptomStatus: 'reported',
  activityNote: 'SECRET-NOTE',
  ...extra,
});

const report = (id, status, receivedAt, extra = {}) => ({
  id,
  checkInId: `CHK-${id.slice(-3)}`,
  createdAt: now,
  status,
  snapshot: { marker: 'SECRET-SNAPSHOT' },
  receipt: receivedAt ? { receivedAt, receiver: 'demo' } : null,
  retryNote: null,
  ...extra,
});

const forbiddenKeys = new Set([
  'readings', 'symptoms', 'symptomEntries', 'symptomStatus', 'activityNote', 'adaptiveResponses',
  'snapshot', 'assessment', 'notes', 'heartRateBpm', 'systolicMmHg', 'diastolicMmHg',
  'temperatureC', 'sleepHours', 'mood', 'stress',
]);

const collectKeys = (value, keys = new Set()) => {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, keys));
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => { keys.add(key); collectKeys(item, keys); });
  }
  return keys;
};

test('local session is described without a verified owner', () => {
  const session = local();
  assert.equal(session.kind, 'local');
  assert.equal(session.crewId, null);
  assert.equal(session.crewName, null);
  assert.equal(session.verifiedOwner, false);
  assert.equal(session.storageScope, 'persistent');
  assert.equal(session.survivesRefresh, true);
  assert.match(session.ownerLabel, /No verified crew owner/);
});

test('demo session is session-only and explicitly not authenticated', () => {
  const session = demo();
  assert.equal(session.kind, 'demo');
  assert.equal(session.crewId, demoCrewIdentity.crewId);
  assert.equal(session.crewName, demoCrewIdentity.name);
  assert.equal(session.verifiedOwner, false);
  assert.equal(session.storageScope, 'session-only');
  assert.equal(session.survivesRefresh, false);
  assert.match(session.ownerLabel, /not authentication/);
});

test('presentation session uses its own label without inventing a crew record', () => {
  const session = demo('PRESENTATION');
  assert.equal(session.kind, 'presentation');
  assert.equal(session.label, 'Presentation demo session');
  assert.equal(session.synthetic, true);
});

test('personal view reports record and report counts for the active session', () => {
  const view = buildPersonalHealthView({
    session: demo(),
    checkIns: [checkIn('CHK-001', '2026-11-16T08:00:00.000Z'), checkIn('CHK-002', '2026-11-17T09:30:00.000Z')],
    reports: [{ id: 'ASTRA-0001' }],
    storageDescription: 'Demo crew session: session-only fixture records.',
  });
  assert.equal(view.recordCount, 2);
  assert.equal(view.reportCount, 1);
  assert.equal(view.hasRecords, true);
  assert.equal(view.latestCheckInId, 'CHK-002');
  assert.equal(view.lastRecordedAtUTC, '2026-11-17T09:30:00.000Z');
  assert.equal(view.lastRecordedAtText, '17 Nov 2026, 09:30 UTC');
  assert.match(view.storageDescription, /session-only/);
});

test('personal view handles an empty session without fabricating a record', () => {
  const view = buildPersonalHealthView({ session: local(), checkIns: [], reports: [], storageDescription: 'Local store' });
  assert.equal(view.recordCount, 0);
  assert.equal(view.hasRecords, false);
  assert.equal(view.latestCheckInId, null);
  assert.equal(view.lastRecordedAtText, null);
});

test('personal view ignores invalid timestamps instead of guessing', () => {
  const view = buildPersonalHealthView({
    session: demo(),
    checkIns: [checkIn('CHK-001', 'not-a-date'), checkIn('CHK-002', '2026-11-15T07:00:00.000Z')],
    reports: [],
    storageDescription: 'Demo',
  });
  assert.equal(view.recordCount, 2);
  assert.equal(view.latestCheckInId, 'CHK-002');
  assert.equal(view.lastRecordedAtUTC, '2026-11-15T07:00:00.000Z');
});

test('personal view returns a copy of the session description', () => {
  const session = demo();
  const view = buildPersonalHealthView({ session, checkIns: [], reports: [], storageDescription: 'Demo' });
  view.session.verifiedOwner = true;
  assert.equal(session.verifiedOwner, false);
});

test('personal view exposes only the five existing workspace links', () => {
  assert.equal(PERSONAL_HEALTH_LINKS.length, 5);
  assert.deepEqual(PERSONAL_HEALTH_LINKS.map((link) => link.href), ['/', '/dashboard', '/assessment', '/replay', '/delivery']);
  const view = buildPersonalHealthView({ session: local(), checkIns: [], reports: [], storageDescription: 'Local' });
  assert.deepEqual(view.links, PERSONAL_HEALTH_LINKS);
});

test('crew summary for an empty local session reports no records and no queue', () => {
  const summary = buildCrewOperationalSummary({ session: local(), checkIns: [], reports: [], now });
  assert.equal(summary.crew.id, null);
  assert.equal(summary.crew.displayName, 'Unassigned local records');
  assert.equal(summary.checkIns.count, 0);
  assert.equal(summary.checkIns.lastRecordedAtText, null);
  assert.equal(summary.checkIns.recordedOnGeneratedDate, null);
  assert.equal(summary.reports.total, 0);
  assert.equal(summary.reports.statusText, 'No reports queued');
  assert.equal(summary.reports.lastAcknowledgedAtText, null);
});

test('crew summary counts records, delivery states and acknowledgements', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [checkIn('CHK-001', '2026-11-17T08:00:00.000Z'), checkIn('CHK-002', '2026-11-17T10:15:00.000Z')],
    reports: [
      report('ASTRA-0001', 'acknowledged', '2026-11-17T09:00:00.000Z'),
      report('ASTRA-0002', 'acknowledged', '2026-11-17T11:00:00.000Z'),
      report('ASTRA-0003', 'queued', null),
      report('ASTRA-0004', 'failed', null),
    ],
    now,
  });
  assert.equal(summary.checkIns.count, 2);
  assert.equal(summary.checkIns.lastRecordedAtUTC, '2026-11-17T10:15:00.000Z');
  assert.equal(summary.checkIns.recordedOnGeneratedDate, true);
  assert.equal(summary.reports.total, 4);
  assert.equal(summary.reports.queued, 1);
  assert.equal(summary.reports.failed, 1);
  assert.equal(summary.reports.acknowledged, 2);
  assert.equal(summary.reports.statusText, '1 queued · 1 failed · 2 acknowledged');
  assert.equal(summary.reports.lastAcknowledgedAtUTC, '2026-11-17T11:00:00.000Z');
});

test('crew summary marks a record from an earlier UTC day', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [checkIn('CHK-001', '2026-11-16T23:00:00.000Z')],
    reports: [],
    now,
  });
  assert.equal(summary.checkIns.recordedOnGeneratedDate, false);
});

test('crew summary ignores acknowledgements without a valid receipt timestamp', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [],
    reports: [
      report('ASTRA-0001', 'acknowledged', null),
      report('ASTRA-0002', 'acknowledged', 'not-a-date'),
    ],
    now,
  });
  assert.equal(summary.reports.acknowledged, 2);
  assert.equal(summary.reports.lastAcknowledgedAtUTC, null);
});

test('crew summary never contains health values, symptoms, notes or payloads', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [checkIn('CHK-001', '2026-11-17T08:00:00.000Z')],
    reports: [report('ASTRA-0001', 'queued', null)],
    now,
  });
  const keys = collectKeys(summary);
  forbiddenKeys.forEach((key) => assert.equal(keys.has(key), false, `unexpected field ${key}`));
  const serialized = JSON.stringify(summary);
  ['SECRET-SYMPTOM', 'SECRET-NOTE', 'SECRET-SNAPSHOT', '188', '199', '41.2', '1.1'].forEach((marker) => {
    assert.equal(serialized.includes(marker), false, `summary leaked ${marker}`);
  });
});

test('crew summary drops extra input fields instead of forwarding them', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [checkIn('CHK-001', '2026-11-17T08:00:00.000Z')],
    reports: [report('ASTRA-0001', 'queued', null)],
    now,
  });
  const keys = collectKeys(summary);
  ['checkInId', 'createdAt', 'retryNote', 'receiver'].forEach((key) => assert.equal(keys.has(key), false));
});

test('crew summary does not mutate its inputs', () => {
  const checks = [checkIn('CHK-001', '2026-11-17T08:00:00.000Z')];
  const reports = [report('ASTRA-0001', 'acknowledged', '2026-11-17T09:00:00.000Z')];
  const snapshot = JSON.stringify({ checks, reports });
  buildCrewOperationalSummary({ session: demo(), checkIns: checks, reports, now });
  assert.equal(JSON.stringify({ checks, reports }), snapshot);
});

test('crew summary is independent of the order check-ins arrive in', () => {
  const summary = buildCrewOperationalSummary({
    session: demo(),
    checkIns: [checkIn('CHK-002', '2026-11-17T10:00:00.000Z'), checkIn('CHK-001', '2026-11-17T08:00:00.000Z')],
    reports: [],
    now,
  });
  assert.equal(summary.checkIns.lastRecordedAtUTC, '2026-11-17T10:00:00.000Z');
});

test('crew summary falls back to a fixed generation time for invalid input', () => {
  const summary = buildCrewOperationalSummary({ session: local(), checkIns: [], reports: [], now: 'invalid' });
  assert.equal(summary.generatedAtUTC, new Date(0).toISOString());
});

test('privacy copy is labelled exactly as a demonstration boundary', () => {
  assert.equal(PRIVACY_DEMO_BANNER, 'Demonstration View — Not an Authenticated Access-Control System');
  assert.match(PRIVACY_SHIELD_LIMIT, /not a lock, sign-in, encryption, or access-control system/);
  assert.equal(PRIVACY_SHIELD_TITLE, 'Privacy Shield Active');
  assert.match(PRIVACY_SHIELD_BODY, /hidden from view/);
});

test('privacy models stay independent of storage and browser APIs', () => {
  const privacySource = source('lib/privacy.ts');
  ['sessionRepository', 'localStorage', 'indexedDB', 'document.', 'window.'].forEach((api) => {
    assert.equal(privacySource.includes(api), false, `privacy model references ${api}`);
  });
});

test('crew summary screen projects only permitted fields', () => {
  const screen = source('app/crew-summary.tsx');
  assert.match(screen, /checkIns\.map\(\(\{ id, recordedAt \}\) => \(\{ id, recordedAt \}\)\)/);
  assert.match(screen, /reports\.map\(\(\{ id, status, receipt \}\) => \(\{ id, status, receipt \}\)\)/);
  assert.equal(/\.snapshot\b|snapshot:/.test(screen), false);
  assert.match(screen, /Limited workflow information for the demonstration\./);
  assert.match(screen, /no readiness score, percentage, compliance mark, or health classification/i);
});

test('privacy center, personal view and crew summary carry the demonstration banner', () => {
  ['app/privacy.tsx', 'app/personal.tsx', 'app/crew-summary.tsx'].forEach((path) => {
    assert.match(source(path), /PRIVACY_DEMO_BANNER/);
  });
});

test('privacy center routes are not added to the bottom navigation', () => {
  const navigation = source('constants/navigation.ts');
  assert.equal((navigation.match(/\{ href: '/g) ?? []).length, 5);
  assert.equal(navigation.includes('privacy'), false);
  const tabs = source('app/(tabs)/_layout.tsx');
  assert.equal(tabs.includes('privacy'), false);
  assert.equal(tabs.includes('personal'), false);
  assert.equal(tabs.includes('crew-summary'), false);
});

test('privacy shield is an opaque surface, not translucent glass', () => {
  const shield = source('components/PrivacyShield.tsx');
  assert.match(shield, /backgroundColor: colors\.navy\[950\]/);
  assert.equal(shield.includes('expo-blur'), false);
  assert.equal(shield.includes('BlurView'), false);
  assert.equal(shield.includes('variant="glass"'), false);
  assert.match(shield, /accessibilityViewIsModal/);
});

test('privacy shield stops voice and hides the app shell from assistive technology', () => {
  const provider = source('state/PrivacyShieldProvider.tsx');
  assert.match(provider, /void stop\(\)/);
  const layout = source('app/_layout.tsx');
  assert.match(layout, /setAttribute\('inert'/);
  assert.match(layout, /aria-hidden=/);
  assert.match(layout, /importantForAccessibility/);
});

test('switching sessions clears the shared form handoff', () => {
  assert.match(source('state/PresentationSession.tsx'), /clearFormHandoff\(\)/);
  assert.match(source('lib/formHandoff.ts'), /export function clearFormHandoff/);
});

test('unsaved drafts are registered and cleared by both check-in flows', () => {
  ['app/(tabs)/check-in.tsx', 'app/guided-check-in.tsx'].forEach((path) => {
    const screen = source(path);
    assert.match(screen, /setUnsavedDraft\(/);
    assert.match(screen, /useSessionReset/);
  });
});

test('transient session state resets on crew change', () => {
  ['app/replay.tsx', 'app/(tabs)/assessment.tsx'].forEach((path) => {
    assert.match(source(path), /sessionVersion|useSessionReset/);
  });
});

test('the Knowledge Hub stays session-independent', () => {
  const hub = source('app/knowledge.tsx');
  assert.equal(/useSession|PresentationSession|sessionRepository|localStorage|indexedDB/.test(hub), false);
});
