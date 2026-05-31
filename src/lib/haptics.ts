export type HapticType = 'success' | 'error' | 'light';

const vibrationPatterns: Record<HapticType, number[]> = {
  light: [50],
  success: [100, 50, 100],
  error: [120, 60, 120],
};

export function triggerVibration(type: HapticType) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  const navWithActivation = navigator as Navigator & {
    userActivation?: {
      isActive?: boolean;
    };
  };

  if (navWithActivation.userActivation && !navWithActivation.userActivation.isActive) {
    return;
  }

  navigator.vibrate(vibrationPatterns[type]);
}
