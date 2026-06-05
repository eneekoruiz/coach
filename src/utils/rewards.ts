import confetti from 'canvas-confetti';

export function triggerStreakConfetti() {
  if (typeof window === 'undefined') return;

  // Elegant gold, yellow, and green colors
  const colors = ['#f59e0b', '#fbbf24', '#fef08a', '#10b981', '#34d399'];

  // Left corner blast
  confetti({
    particleCount: 70,
    angle: 60,
    spread: 60,
    origin: { x: 0, y: 0.8 },
    colors: colors,
  });

  // Right corner blast
  confetti({
    particleCount: 70,
    angle: 120,
    spread: 60,
    origin: { x: 1, y: 0.8 },
    colors: colors,
  });
}
