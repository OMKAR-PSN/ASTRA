import { Platform } from 'react-native';

import { createReportSnapshot } from '@/lib/snapshot';
import type { CheckIn, CheckInDraft, ReportRecord } from '@/types/astra';

export type StoredSession = {
  checkIns: CheckIn[];
  reports: ReportRecord[];
};

export interface SessionRepository {
  load(): Promise<StoredSession>;
  saveCheckIn(draft: CheckInDraft, recordedAt: string): Promise<CheckIn>;
  confirmReport(checkInId: string, createdAt: string): Promise<ReportRecord>;
}

const emptySession = (): StoredSession => ({ checkIns: [], reports: [] });

function createMemoryRepository(): SessionRepository {
  let data = emptySession();
  return {
    async load() {
      return structuredClone(data);
    },
    async saveCheckIn(draft, recordedAt) {
      const checkIn: CheckIn = {
        id: `CHK-${String(data.checkIns.length + 1).padStart(3, '0')}`,
        recordedAt,
        readings: draft.readings,
        symptoms: [...draft.symptoms],
        activityNote: draft.activityNote,
      };
      data = { ...data, checkIns: [...data.checkIns, checkIn] };
      return checkIn;
    },
    async confirmReport(checkInId, createdAt) {
      const existing = data.reports.find((report) => report.checkInId === checkInId);
      if (existing) return existing;
      const checkIn = data.checkIns.find((item) => item.id === checkInId);
      if (!checkIn) throw new Error('Check-in was not found. Save it again before creating a report.');
      const report: ReportRecord = {
        id: `ASTRA-${String(data.reports.length + 1).padStart(4, '0')}`,
        checkInId,
        createdAt,
        status: 'queued',
        snapshot: createReportSnapshot(checkIn),
        receipt: null,
        retryNote: null,
      };
      data = { ...data, reports: [...data.reports, report] };
      return report;
    },
  };
}

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
      request.onsuccess = () => resolve(request.result);
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
      return (await run((store) => store.get('data'), 'readonly')) ?? emptySession();
    },
    async saveCheckIn(draft, recordedAt) {
      const db = await database();
      return new Promise<CheckIn>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let saved!: CheckIn;
        const request = store.get('data');
        request.onsuccess = () => {
          const data: StoredSession = request.result ?? emptySession();
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
    async confirmReport(checkInId, createdAt) {
      const db = await database();
      return new Promise<ReportRecord>((resolve, reject) => {
        const transaction = db.transaction('session', 'readwrite');
        const store = transaction.objectStore('session');
        let result!: ReportRecord;
        const request = store.get('data');
        request.onsuccess = () => {
          const data: StoredSession = request.result ?? emptySession();
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
  };
}

export const sessionRepository = Platform.OS === 'web' ? createWebRepository() : createMemoryRepository();
export const storageDescription = Platform.OS === 'web'
  ? 'Offline storage: browser IndexedDB'
  : 'In-memory fallback (native data is not persisted)';
