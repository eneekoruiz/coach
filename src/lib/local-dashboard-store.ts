'use client';

import { type DailyLog } from '@/lib/schema';

export type DashboardSnapshot = {
  lastLog: DailyLog | null;
  momentum: number;
  insightText: string;
  dailyWaterTarget: number;
  defaultGlassSize: number;
  dietTargets: {
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  hasLoggedToday: boolean;
  updatedAt: string;
};

export type DashboardMutation = {
  id: string;
  type: 'add_water';
  payload: {
    delta: number;
    date: string;
  };
  attempts: number;
  createdAt: number;
};

const CACHE_KEY = 'coach.dashboard.snapshot.v1';
const DB_NAME = 'coach-mascota-local-first';
const DB_VERSION = 1;
const CACHE_STORE = 'dashboard_cache';
const QUEUE_STORE = 'sync_queue';

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseBrowserStorage()) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function readDashboardCacheSync(): DashboardSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardSnapshot) : null;
  } catch {
    return null;
  }
}

export async function writeDashboardSnapshot(snapshot: DashboardSnapshot) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  }

  if (!canUseBrowserStorage()) return;

  const db = await openLocalDb();
  const transaction = db.transaction(CACHE_STORE, 'readwrite');
  transaction.objectStore(CACHE_STORE).put(snapshot, 'latest');
  await txDone(transaction);
  db.close();
}

export async function enqueueDashboardMutation(
  mutation: Omit<DashboardMutation, 'id' | 'attempts' | 'createdAt'> & Partial<Pick<DashboardMutation, 'id' | 'attempts' | 'createdAt'>>
) {
  if (!canUseBrowserStorage()) return;

  const queued: DashboardMutation = {
    id: mutation.id || `${mutation.type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: mutation.type,
    payload: mutation.payload,
    attempts: mutation.attempts ?? 0,
    createdAt: mutation.createdAt ?? Date.now(),
  };

  const db = await openLocalDb();
  const transaction = db.transaction(QUEUE_STORE, 'readwrite');
  transaction.objectStore(QUEUE_STORE).put(queued);
  await txDone(transaction);
  db.close();
}

export async function listDashboardMutations(): Promise<DashboardMutation[]> {
  if (!canUseBrowserStorage()) return [];

  const db = await openLocalDb();
  const transaction = db.transaction(QUEUE_STORE, 'readonly');
  const request = transaction.objectStore(QUEUE_STORE).getAll();

  const rows = await new Promise<DashboardMutation[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result || []) as DashboardMutation[]);
    request.onerror = () => reject(request.error);
  });

  await txDone(transaction);
  db.close();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeDashboardMutation(id: string) {
  if (!canUseBrowserStorage()) return;

  const db = await openLocalDb();
  const transaction = db.transaction(QUEUE_STORE, 'readwrite');
  transaction.objectStore(QUEUE_STORE).delete(id);
  await txDone(transaction);
  db.close();
}
