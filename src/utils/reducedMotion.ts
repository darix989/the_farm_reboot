/**
 * Single source of truth for `prefers-reduced-motion`, so Phaser's animated cast and any
 * React motion honour the same signal instead of each inlining its own `matchMedia` check.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

/** Subscribes to changes in the preference. Returns an unsubscribe function. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  const listener = (event: MediaQueryListEvent) => callback(event.matches);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}
