import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { canonicalJson } from '../lib/reportProtocol.ts';
import { createReceiver } from './receiver.mjs';

const hash = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex');

test('receiver persists one matching receipt and rejects conflicts and invalid reports', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'astra-receiver-'));
  const filename = join(directory, 'reports.db');
  let receiver = await createReceiver(filename);
  const payload = {
    reportId: 'a'.repeat(64),
    version: 1, synthetic: true, localReportId: 'ASTRA-0001',
    confirmedAt: '2026-11-15T00:00:00Z', snapshot: { readings: { heartRate: 92 } },
  };
  const post = (body, payloadHash = hash(body)) => receiver.inject({
    method: 'POST', url: '/api/v1/reports', payload: { payload: body, payloadHash },
  });

  try {
    assert.equal((await post({ ...payload, synthetic: false })).statusCode, 422);
    assert.equal((await post(payload, 'invalid')).statusCode, 422);
    assert.match((await receiver.inject({ url: '/mission' })).body, /No reports received/);
    const created = await post(payload);
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().payloadHash, hash(payload));
    const duplicate = await post(payload);
    assert.equal(duplicate.statusCode, 200);
    assert.deepEqual(duplicate.json(), created.json());
    assert.equal((await post({ ...payload, snapshot: {} })).statusCode, 409);

    await receiver.close();
    receiver = await createReceiver(filename);
    const restored = await receiver.inject({ url: '/api/v1/reports/' + payload.reportId + '/receipt' });
    assert.deepEqual(restored.json(), created.json());
    const timeline = (await receiver.inject({ url: '/mission' })).body;
    assert.equal(timeline.match(/ASTRA-0001/g)?.length, 1);
    assert.ok(timeline.includes(created.json().receiverReference));
    assert.equal((await receiver.inject({ url: '/api/v1/reports/missing/receipt' })).statusCode, 404);
  } finally {
    await receiver.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
