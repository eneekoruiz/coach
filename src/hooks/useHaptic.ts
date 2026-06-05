'use client';

export function useHaptic() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn('[useHaptic] vibration blocked or unsupported:', err);
      }
    }
  };

  return {
    light: () => vibrate(10),
    success: () => vibrate([10, 50, 10]),
  };
}
