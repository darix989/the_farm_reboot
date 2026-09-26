import { useEffect, useRef } from 'react';
import { useInGameMenuStore } from '../../store/inGameMenuStore';

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
      // Every gameplay shortcut is registered through this hook. The in-game menu has a
      // full-screen pointer shield, and this closes the keyboard path into the paused UI too.
      if (useInGameMenuStore.getState().view !== 'closed') return;
      handlerRef.current(event);
    };
    window.addEventListener('keydown', onKeyDown, capture);
    return () => window.removeEventListener('keydown', onKeyDown, capture);
  }, [enabled, capture]);
}
