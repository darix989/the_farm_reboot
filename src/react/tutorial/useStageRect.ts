import { useLayoutEffect, useState } from 'react';
import { STAGE_ELEMENT_ID, type StageRect } from './spotlightRect';

/**
 * Coherent snapshot of the stage rect and the viewport, updated together.
 *
 * `stageRect` is the live `#app-stage-16x9` rect (letterbox-safe — `left`/`top`
 * already include the letterbox offset). When the stage isn't laid out yet,
 * it falls back to a viewport-sized rect rooted at the origin so spotlight
 * conversion degrades to "cover the whole screen" instead of NaN / zero output.
 *
 * `viewport` is the window/visualViewport size — used for shutter pane
 * dimensions (which must cover letterbox bars too, not just the stage).
 *
 * `isStageReady` lets callers distinguish the fallback case if needed.
 */
export type StageRectSnapshot = {
  stageRect: StageRect;
  viewport: { w: number; h: number };
  isStageReady: boolean;
};

const SSR_FALLBACK: StageRectSnapshot = {
  stageRect: { left: 0, top: 0, width: 1920, height: 1080 },
  viewport: { w: 1920, h: 1080 },
  isStageReady: false,
};

function readViewport(): { w: number; h: number } {
  const vv = window.visualViewport;
  return {
    w: vv?.width ?? window.innerWidth,
    h: vv?.height ?? window.innerHeight,
  };
}

function readStageRect(): StageRect | null {
  const el = document.getElementById(STAGE_ELEMENT_ID);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function buildSnapshot(): StageRectSnapshot {
  const viewport = readViewport();
  const stage = readStageRect();
  return {
    stageRect: stage ?? { left: 0, top: 0, width: viewport.w, height: viewport.h },
    viewport,
    isStageReady: stage !== null,
  };
}

function snapshotsEqual(a: StageRectSnapshot, b: StageRectSnapshot): boolean {
  return (
    a.isStageReady === b.isStageReady &&
    a.viewport.w === b.viewport.w &&
    a.viewport.h === b.viewport.h &&
    a.stageRect.left === b.stageRect.left &&
    a.stageRect.top === b.stageRect.top &&
    a.stageRect.width === b.stageRect.width &&
    a.stageRect.height === b.stageRect.height
  );
}

/**
 * Reactive single source of truth for `#app-stage-16x9`'s rect and the
 * viewport size. Updates on every layout-changing source we know about:
 *
 * - `ResizeObserver` on the stage element — catches every size change of
 *   the stage itself, regardless of why (CSS `min(100vh, …)` recompute,
 *   parent flex changes, fullscreen, scrollbar appearance, devtools docking).
 * - `window.resize` — covers viewport unit changes that don't strictly
 *   resize the stage (e.g. `window.innerWidth` shifting the stage's `left`
 *   when letterbox bars rebalance).
 * - `visualViewport.resize` / `scroll` — pinch-zoom, mobile address bar
 *   collapse, on-screen keyboard.
 * - `fullscreenchange` / `orientationchange` — platforms that change layout
 *   without firing `resize`.
 *
 * All updates are coalesced through `requestAnimationFrame` so multiple
 * signals in the same frame produce a single render. Measurement runs in
 * `useLayoutEffect`, so the first paint already has the correct rect.
 *
 * If the stage element isn't in the DOM or hasn't been laid out yet on
 * mount, we keep retrying on RAF until it shows up — important because
 * `TutorialOverlay` is mounted via portal to `document.body`, and on a
 * cold start its first render can race the stage's CSS layout.
 */
export function useStageRect(): StageRectSnapshot {
  const [snapshot, setSnapshot] = useState<StageRectSnapshot>(() => {
    if (typeof window === 'undefined') return SSR_FALLBACK;
    return buildSnapshot();
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let measureRafId: number | null = null;
    let observeRetryRafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const measure = () => {
      measureRafId = null;
      if (cancelled) return;
      const next = buildSnapshot();
      setSnapshot((prev) => (snapshotsEqual(prev, next) ? prev : next));
      // Stage not laid out yet — keep polling each frame until it is.
      // This catches the cold-start race where the overlay mounts before
      // CSS has produced a non-zero stage rect.
      if (!next.isStageReady && !cancelled) {
        measureRafId = requestAnimationFrame(measure);
      }
    };

    const scheduleMeasure = () => {
      if (measureRafId !== null) return;
      measureRafId = requestAnimationFrame(measure);
    };

    const tryAttachObserver = () => {
      if (resizeObserver || cancelled) return;
      const el = document.getElementById(STAGE_ELEMENT_ID);
      if (!el) return;
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(el);
    };

    const retryAttachObserver = () => {
      observeRetryRafId = null;
      if (cancelled || resizeObserver) return;
      tryAttachObserver();
      if (!resizeObserver) {
        observeRetryRafId = requestAnimationFrame(retryAttachObserver);
      }
    };

    // Initial pass: attach observer + measure. Both can be retried via RAF
    // if the stage isn't in the DOM yet.
    tryAttachObserver();
    if (!resizeObserver) {
      observeRetryRafId = requestAnimationFrame(retryAttachObserver);
    }
    scheduleMeasure();

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    document.addEventListener('fullscreenchange', scheduleMeasure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleMeasure);
    vv?.addEventListener('scroll', scheduleMeasure);

    return () => {
      cancelled = true;
      if (measureRafId !== null) cancelAnimationFrame(measureRafId);
      if (observeRetryRafId !== null) cancelAnimationFrame(observeRetryRafId);
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      document.removeEventListener('fullscreenchange', scheduleMeasure);
      vv?.removeEventListener('resize', scheduleMeasure);
      vv?.removeEventListener('scroll', scheduleMeasure);
    };
  }, []);

  return snapshot;
}
