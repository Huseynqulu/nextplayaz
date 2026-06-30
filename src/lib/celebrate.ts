import confetti from "canvas-confetti";
import { toast } from "sonner";

let lastBurst = 0;

/** Lightweight confetti burst — throttled so rapid calls don't stack. */
export function burstConfetti(opts?: { origin?: { x: number; y: number } }) {
  const now = Date.now();
  if (now - lastBurst < 400) return;
  lastBurst = now;

  const defaults = {
    spread: 70,
    startVelocity: 35,
    ticks: 120,
    gravity: 0.9,
    scalar: 0.9,
    colors: ["#22d3ee", "#3b82f6", "#a855f7", "#f59e0b", "#10b981"],
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: 60,
    origin: opts?.origin ?? { x: 0.5, y: 0.35 },
  });
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 35,
      spread: 100,
      origin: opts?.origin ?? { x: 0.5, y: 0.4 },
    });
  }, 180);
}

/** Soft success toast with animated tick. Pass `celebrate: true` for confetti. */
export function softSuccess(
  message: string,
  opts?: { description?: string; celebrate?: boolean }
) {
  if (opts?.celebrate) burstConfetti();
  return toast.success(message, {
    description: opts?.description,
    duration: 3200,
  });
}
