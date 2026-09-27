import { useEffect, useRef, useState } from 'react';

/**
 * Looped demo clock. Returns elapsed ms in [0, duration), advancing only while
 * `active`. Bump `nonce` to restart from zero (demo reset/replay buttons).
 * Ticks at ~30fps, plenty for fades/typing and cheap enough for four demos.
 */
export function useLoopClock(duration: number, active: boolean, nonce: number = 0) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    startRef.current = performance.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      const t = (performance.now() - startRef.current) % duration;
      setElapsed(t);
    }, 33);
    return () => window.clearInterval(timer);
  }, [active, nonce, duration]);

  return elapsed;
}

/** Eased 0→1 progress over a window starting at `t0` lasting `dur`. */
export function windowProgress(t: number, t0: number, dur: number): number {
  if (t <= t0) return 0;
  if (t >= t0 + dur) return 1;
  const p = (t - t0) / dur;
  return p * p * (3 - 2 * p); // smoothstep
}
