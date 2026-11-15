import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { canonicalJson } from '../lib/reportProtocol.ts';
import { renderMissionTimeline } from './mission.mjs';

export async function createReceiver(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      reference TEXT NOT NULL,
      received_at TEXT NOT NULL
    )
  `);
  const store = db.prepare('INSERT OR IGNORE INTO reports VALUES (?, ?, ?, ?, ?)');
  const lookup = db.prepare('SELECT id AS reportId, hash AS payloadHash, reference AS receiverReference, received_at AS receivedAt FROM reports WHERE id = ?');
  const app = Fastify({ bodyLimit: 64 * 1024 });
  await app.register(cors, { origin: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, methods: ['GET', 'POST'] });
  app.addHook('onClose', async () => db.close());

  const timeline = db.prepare('SELECT payload, reference, received_at FROM reports ORDER BY received_at DESC, rowid DESC LIMIT 100');
  app.get('/mission', async (request, reply) => {
    if (request.ip !== '127.0.0.1' && request.ip !== '::1') {
      return reply.code(403).send({ error: 'Open the mission timeline on the receiver computer.' });
    }
    return reply.type('text/html').header('Cache-Control', 'no-store').send(renderMissionTimeline(timeline.all()));
  });

  app.get('/api/v1/health', async () => ({ status: 'ready' }));
  app.get('/api/v1/reports/:id/receipt', async (request, reply) =>
    lookup.get(request.params.id) ?? reply.code(404).send({ error: 'Receipt not found' }),
  );

  app.post('/api/v1/reports', async (request, reply) => {
    const { payload, payloadHash } = request.body ?? {};
    if (payload?.synthetic !== true) return reply.code(422).send({ error: 'Synthetic reports only' });
    if (payload.version !== 1 || !/^[a-f0-9]{64}$/.test(payload.reportId)
      || typeof payload.localReportId !== 'string' || !payload.localReportId
      || typeof payload.confirmedAt !== 'string' || !Number.isFinite(Date.parse(payload.confirmedAt))
      || !payload.snapshot || typeof payload.snapshot !== 'object' || Array.isArray(payload.snapshot)) {
      return reply.code(422).send({ error: 'Invalid report' });
    }

    const canonical = canonicalJson(payload);
    const hash = createHash('sha256').update(canonical).digest('hex');
    if (hash !== payloadHash) return reply.code(422).send({ error: 'Invalid report hash' });
    const inserted = store.run(payload.reportId, hash, canonical, randomUUID(), new Date().toISOString());
    const receipt = lookup.get(payload.reportId);
    if (receipt.payloadHash !== hash) return reply.code(409).send({ error: 'Report ID conflict' });
    return reply.code(inserted.changes ? 201 : 200).send(receipt);
  });
  return app;
}
