/** True when the browser reports at least one touch input surface. */
export function supportsTouchInput(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}
