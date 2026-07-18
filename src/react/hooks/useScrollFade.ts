import { useEffect, useState } from 'react';
import type React from 'react';

export interface ScrollFadeState {
  top: boolean;
  bottom: boolean;
}

/**
 * Tracks whether a scrollable container has hidden content above/below.
 * Returns { top, bottom } booleans — drive overlay opacity to animate scroll hints.
 */
export function useScrollFade(ref: React.RefObject<HTMLDivElement | null>): ScrollFadeState {
  const [fade, setFade] = useState<ScrollFadeState>({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;

    const update = () => {
      const nextTop = el.scrollTop > 2;
      const nextBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;

      setFade((prev) => {
        if (prev.top === nextTop && prev.bottom === nextBottom) return prev;
        return { top: nextTop, bottom: nextBottom };
      });
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    };

    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    scheduleUpdate();

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref]);

  return fade;
}
