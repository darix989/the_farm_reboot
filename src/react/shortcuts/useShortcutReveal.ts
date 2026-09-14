import { useEffect } from 'react';
import { nextRevealHeld, type RevealHoldEvent } from './revealHold';
import { useShortcutRevealStore } from '../../store/shortcutRevealStore';

function applyRevealEvent(event: RevealHoldEvent): void {
  const current = useShortcutRevealStore.getState().isRevealed;
  useShortcutRevealStore.getState().setRevealed(nextRevealHeld(current, event));
}

/**
 * Drives `shortcutRevealStore` from window key / focus / visibility events.
 *
 * Mounted at the top of `ReactApp` (before the `isGameReady` early return) so
 * the guards exist for the app's whole life and cannot be torn down mid-hold.
 *
 * Capture-phase key listeners so `TutorialOverlay`'s `stopImmediatePropagation`
 * can never starve the hold. Never `preventDefault` — Shift has no default, and
 * swallowing it would break Shift+Tab.
 */
export function useShortcutRevealListener(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      applyRevealEvent({
        type: 'keydown',
        key: event.key,
        repeat: event.repeat,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      });
    };
    const onKeyUp = (event: KeyboardEvent) => {
      applyRevealEvent({
        type: 'keyup',
        key: event.key,
        shiftKey: event.shiftKey,
      });
    };
    const onBlur = () => applyRevealEvent({ type: 'blur' });
    const onHidden = () => applyRevealEvent({ type: 'hidden' });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHidden();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onHidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onHidden);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
