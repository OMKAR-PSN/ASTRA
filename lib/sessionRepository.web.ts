import { emptySession, normalizeStoredSession, type SessionRepository, type StoredSession } from '@/lib/sessionRepositoryContract';
import { addEngagementEvent, setJourneyVisibility, type EngagementEventKind, type EngagementState } from '@/lib/engagement';
import { createReportSnapshot } from '@/lib/snapshot';
import type { CheckIn, ReportRecord } from '@/types/astra';

function createWebRepository(): SessionRepository {
  const database = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable in this browser.'));
        return;
      }
      const request = indexedDB.open('astra-care-offline', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('session');
      };
      let blocked = false;
      request.onblocked = () => {
        blocked = true;
        reject(new Error('Close other ASTRA CARE tabs and retry.'));
      };
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage.'));
    });

  const run = async <T>(operation: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode) => {
    const db = await database();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('session', mode);
      const request = operation(transaction.objectStore('session'));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error('Offline storage operation failed.'));
      transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('Offline storage transaction failed.')); };
      transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('Offline storage transaction failed.')); };
      transaction.oncomplete = () => { db.close(); resolve(result); };
    });
  };

  return {
    async load() {
      const stored = await run<Partial<StoredSession> | undefined>((store) => store.get('data'), 'readonly');
      return stored ? normalizeStoredSession(stored) : emptySession();
    },
    async saveCheckIn(draft, recordedAt) {
      const db = await database();
      return new Promise<CheckIn>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let saved!: CheckIn;
        const request = store.get('data');
        request.onsuccess = () => {
          const data: StoredSession = normalizeStoredSession(request.result);
          saved = {
            id: `CHK-${String(data.checkIns.length + 1).padStart(3, '0')}`,
            recordedAt,
            readings: draft.readings,
            symptoms: [...draft.symptoms],
            activityNote: draft.activityNote,
          };
          store.put({ ...data, checkIns: [...data.checkIns, saved] }, 'data');
        };
        transaction.oncomplete = () => { db.close(); resolve(saved); };
        transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('Could not save check-in offline.')); };
      });
    },
    async updateDelivery(reportId, update) {
      const db = await database();
      return new Promise<ReportRecord>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        const request = store.get('data');
        let updated: ReportRecord;
        request.onsuccess = () => {
          const data: StoredSession = normalizeStoredSession(request.result);
          const current = data.reports.find((report) => report.id === reportId);
          if (!current) {
            transaction.abort();
            return;
          }
          if (current.status === 'acknowledged') {
            updated = current;
            return;
          }
          updated = { ...current, ...update };
          store.put({ ...data, reports: data.reports.map((report) => report.id === reportId ? updated : report) }, 'data');
        };
        transaction.oncomplete = () => { db.close(); resolve(updated); };
        transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('Could not save delivery status.')); };
      });
    },
    async confirmReport(checkInId, createdAt) {
      const db = await database();
      return new Promise<ReportRecord>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let result!: ReportRecord;
        const request = store.get('data');
        request.onsuccess = () => {
          const data: StoredSession = normalizeStoredSession(request.result);
          const existing = data.reports.find((report) => report.checkInId === checkInId);
          if (existing) {
            result = existing;
            return;
          }
          const checkIn = data.checkIns.find((item) => item.id === checkInId);
          if (!checkIn) {
            transaction.abort();
            return;
          }
          result = {
            id: `ASTRA-${String(data.reports.length + 1).padStart(4, '0')}`,
            checkInId,
            createdAt,
            status: 'queued',
            snapshot: createReportSnapshot(checkIn),
            receipt: null,
            retryNote: null,
          };
          const reports = [...data.reports, result];
          store.put({ ...data, reports, outbox: reports.map((report) => report.id) }, 'data');
        };
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error('Could not queue report offline.'));
        };
      });
    },
    async recordEngagement(kind: EngagementEventKind, recordedAt: string) {
      const db = await database();
      return new Promise<EngagementState>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let result!: EngagementState;
        const request = store.get('data');
        request.onsuccess = () => {
          const data = normalizeStoredSession(request.result);
          result = addEngagementEvent(data.engagement, kind, recordedAt);
          if (result !== data.engagement) store.put({ ...data, engagement: result }, 'data');
        };
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error('Could not save engagement progress.'));
        };
      });
    },
    async setJourneyVisible(visible: boolean) {
      const db = await database();
      return new Promise<EngagementState>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let result!: EngagementState;
        const request = store.get('data');
        request.onsuccess = () => {
          const data = normalizeStoredSession(request.result);
          result = setJourneyVisibility(data.engagement, visible);
          if (result !== data.engagement) store.put({ ...data, engagement: result }, 'data');
        };
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error('Could not save journey preference.'));
        };
      });
    },
  };
}

export const sessionRepository = createWebRepository();
export const storageDescription = 'Offline storage: browser IndexedDB';
