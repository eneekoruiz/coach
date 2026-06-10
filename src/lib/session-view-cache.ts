'use client';

type CacheEnvelope<T> = {
  value: T;
  updatedAt: number;
};

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readSessionViewCache<T>(key: string): T | null {
  const memoryValue = memoryCache.get(key);
  if (memoryValue) {
    return memoryValue.value as T;
  }

  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    memoryCache.set(key, parsed as CacheEnvelope<unknown>);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeSessionViewCache<T>(key: string, value: T) {
  const payload: CacheEnvelope<T> = {
    value,
    updatedAt: Date.now(),
  };

  memoryCache.set(key, payload as CacheEnvelope<unknown>);

  if (!canUseStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues; memory cache still works for this session.
  }
}
