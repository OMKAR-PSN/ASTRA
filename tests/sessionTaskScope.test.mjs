import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionTaskScope } from '../lib/sessionTaskScope.ts';

test('pending save cannot publish into a switched session', async () => {
  const scope = createSessionTaskScope();
  scope.activate();
  const current = scope.capture();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let shown = 'new session';
  const saving = pending.then(() => { if (current()) shown = 'old health data'; });
  scope.invalidate();
  release();
  await saving;
  assert.equal(shown, 'new session');
});

test('restoration retry never revives an earlier operation', () => {
  const scope = createSessionTaskScope();
  scope.activate();
  const old = scope.capture();
  scope.invalidate();
  scope.activate();
  assert.equal(old(), false);
  assert.equal(scope.capture()(), true);
});

test('independent repositories have independent operation scopes', () => {
  const first = createSessionTaskScope();
  const second = createSessionTaskScope();
  first.activate(); second.activate();
  const pending = second.capture();
  first.invalidate();
  assert.equal(pending(), true);
});
