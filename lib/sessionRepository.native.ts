import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { emptySession, normalizeStoredSession, type SessionRepository, type StoredSession } from '@/lib/sessionRepositoryContract';
import { initialSessionState, sessionReducer } from '@/state/sessionReducer';

let database: Promise<SQLiteDatabase> | undefined;

function openStorage() {
  database ??= openDatabaseAsync('astra-care.db').then(async (db) => {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS mission_session (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload TEXT NOT NULL
        )
      `);
      return db;
    } catch (error) {
      await db.closeAsync();
      throw error;
    }
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function readSession(db: SQLiteDatabase): Promise<StoredSession> {
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM mission_session WHERE id = 1',
  );
  return row ? normalizeStoredSession(JSON.parse(row.payload)) : emptySession();
}

function writeSession(db: SQLiteDatabase, session: StoredSession) {
  return db.runAsync(
    'INSERT INTO mission_session (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    JSON.stringify(session),
  );
}

// Sequence writes on this connection so concurrent confirmations see committed data.
let pendingWrite: Promise<unknown> = Promise.resolve();

function queueWrite<T>(write: () => Promise<T>): Promise<T> {
  const operation = pendingWrite.then(write);
  pendingWrite = operation.catch(() => {});
  return operation;
}

export const sessionRepository: SessionRepository = {
  async load() {
    return readSession(await openStorage());
  },

  saveCheckIn(draft, recordedAt) {
    return queueWrite(async () => {
      const db = await openStorage();
      const data = await readSession(db);
      const updated = sessionReducer({ ...initialSessionState, ...data }, {
        type: 'saveCheckIn', draft, recordedAt,
      });
      const checkIn = updated.checkIns.at(-1);
      if (!checkIn) throw new Error('Could not create the check-in.');
      await writeSession(db, updated);
      return checkIn;
    });
  },

  updateDelivery(reportId, update) {
    return queueWrite(async () => {
      const db = await openStorage();
      const data = await readSession(db);
      const current = data.reports.find((report) => report.id === reportId);
      if (!current) throw new Error('Report was not found.');
      if (current.status === 'acknowledged') return current;
      const updated = { ...current, ...update };
      await writeSession(db, { ...data, reports: data.reports.map((report) => report.id === reportId ? updated : report) });
      return updated;
    });
  },

  confirmReport(checkInId, createdAt) {
    return queueWrite(async () => {
      const db = await openStorage();
      const data = await readSession(db);
      const existing = data.reports.find((report) => report.checkInId === checkInId);
      if (existing) return existing;
      const updated = sessionReducer({ ...initialSessionState, ...data }, {
        type: 'confirmReport', checkInId, createdAt,
      });
      const report = updated.reports.find((item) => item.checkInId === checkInId);
      if (!report) throw new Error('Check-in was not found.');
      await writeSession(db, updated);
      return report;
    });
  },

  recordEngagement(kind, recordedAt) {
    return queueWrite(async () => {
      const db = await openStorage();
      const data = await readSession(db);
      const updated = sessionReducer({ ...initialSessionState, ...data }, {
        type: 'recordEngagement', kind, recordedAt,
      });
      await writeSession(db, updated);
      return updated.engagement;
    });
  },

  setJourneyVisible(visible) {
    return queueWrite(async () => {
      const db = await openStorage();
      const data = await readSession(db);
      const updated = sessionReducer({ ...initialSessionState, ...data }, {
        type: 'setJourneyVisible', visible,
      });
      await writeSession(db, updated);
      return updated.engagement;
    });
  },
};

export const storageDescription = 'Offline storage: device SQLite';
