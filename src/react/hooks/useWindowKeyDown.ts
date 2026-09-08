import { useEffect, useRef } from 'react';

/**
 * Window `keydown` subscription that always calls the latest handler without
 * tearing the listener down on every render (same ref pattern as `useDebateEvent`).
 */
export function useWindowKeyDown(
  handler: (event: KeyboardEvent) => void,
  enabled: boolean,
  options?: { capture?: boolean },
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const capture = options?.capture === true;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown, capture);
    return () => window.removeEventListener('keydown', onKeyDown, capture);
  }, [enabled, capture]);
}
