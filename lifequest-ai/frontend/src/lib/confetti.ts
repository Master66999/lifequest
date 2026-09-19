import confetti from 'canvas-confetti';

/**
 * Triggers an epic double-sided confetti cannon for Level-Up milestones
 */
export function triggerLevelUpConfetti() {
  if (typeof window === 'undefined') return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#3b82f6', '#1d4ed8', '#fbbf24', '#f59e0b'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#a855f7', '#6366f1', '#ec4899'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#ffd700', '#f59e0b', '#10b981'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    shapes: ['star'],
    colors: ['#ffd700', '#f97316'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#2563eb', '#38bdf8', '#fbbf24'],
  });
}

/**
 * Triggers a quick crisp reward spark burst for quest completion
 */
export function triggerQuestRewardConfetti() {
  if (typeof window === 'undefined') return;

  confetti({
    particleCount: 45,
    spread: 60,
    origin: { y: 0.65 },
    zIndex: 9999,
    colors: ['#3b82f6', '#f59e0b', '#10b981', '#6366f1'],
    disableForReducedMotion: true,
  });
}
