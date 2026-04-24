/**
 * Runner for `TutorialArtificialInteraction` sequences.
 *
 * Tutorial steps may include an ordered list of synthetic UI gestures that
 * should fire automatically while the step is visible — e.g. "scroll the
 * debate log to the top after 2s". Each entry's `delayTimeMs` is measured from
 * the moment the step becomes active; the delays accumulate so the Nth entry
 * fires at `sum(delayTimeMs[0..N])`.
 *
 * Actions are dispatched by finding the relevant DOM node via stable
 * `data-*` attributes that the debate-log UI emits, not by relying on hashed
 * CSS module class names. This keeps the contract between tutorial JSON and
 * UI markup narrow and explicit.
 *
 * The runner returns a `cancel` function; callers (TutorialOverlay) invoke it
 * when the step changes, the tutorial closes, or the overlay unmounts so no
 * stale timer fires against the wrong step or a dismounted UI.
 */

import type {
  TutorialArtificialInteraction,
  TutorialArtificialInteractionAction,
} from '../../types/debateEntities';

/**
 * Data attribute key applied to the debate-log scroll container (see
 * `FeedbackPanel` and `ScrollFadeContainer`). The runner looks up the element
 * via `[data-scroll-key="debateLogScroll"]` when dispatching
 * `debate_log:scroll_to_top`.
 */
export const DEBATE_LOG_SCROLL_KEY = 'debateLogScroll';

/**
 * Data attribute key on the wizard panel scroll container (`WizardPanel` /
 * `ScrollFadeContainer`). Used for `wizard:scroll_to_top` and
 * `wizard:scroll_to_bottom`.
 */
export const WIZARD_SCROLL_KEY = 'wizardScroll';

function findDebateLogScroll(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-scroll-key="${DEBATE_LOG_SCROLL_KEY}"]`);
}

function findWizardScroll(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-scroll-key="${WIZARD_SCROLL_KEY}"]`);
}

function findDebateLogToggleButton(roundId: string): HTMLButtonElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLButtonElement>(
    `button[data-debate-log-toggle-expand-round-id="${CSS.escape(roundId)}"]`,
  );
}

function findDebateLogAnalyzeButton(roundId: string): HTMLButtonElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLButtonElement>(
    `button[data-debate-log-analyze-round-id="${CSS.escape(roundId)}"]`,
  );
}

/** Execute one action against the live DOM. Silently no-ops when the target is absent. */
export function runArtificialInteractionAction(action: TutorialArtificialInteractionAction): void {
  switch (action.type) {
    case 'debate_log:scroll_to_top': {
      const el = findDebateLogScroll();
      if (!el) return;
      // Smooth scroll keeps the tutorial feeling hand-guided rather than teleported.
      el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    case 'debate_log:round:toggle_expand': {
      const btn = findDebateLogToggleButton(action.roundId);
      if (!btn || btn.disabled) return;
      btn.click();
      return;
    }
    case 'debate_log:round:analyze': {
      const btn = findDebateLogAnalyzeButton(action.roundId);
      if (!btn || btn.disabled) return;
      btn.click();
      return;
    }
    case 'wizard:scroll_to_top': {
      const el = findWizardScroll();
      if (!el) return;
      el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    case 'wizard:scroll_to_bottom': {
      const el = findWizardScroll();
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      return;
    }
    default: {
      // Exhaustiveness guard — new action types must be handled above.
      const _never: never = action;
      void _never;
    }
  }
}

/**
 * Schedule every interaction in `interactions` using cumulative delays.
 *
 * Returns a `cancel` function that clears every still-pending timer. Safe to
 * call after some (or all) interactions have already fired — already-fired
 * slots are simply no-ops.
 */
export function scheduleArtificialInteractions(
  interactions: readonly TutorialArtificialInteraction[],
): () => void {
  if (interactions.length === 0) return () => {};
  const timers: number[] = [];
  let cumulativeDelay = 0;
  for (const interaction of interactions) {
    cumulativeDelay += Math.max(0, interaction.delayTimeMs ?? 0);
    const action = interaction.action;
    const tid = window.setTimeout(() => {
      runArtificialInteractionAction(action);
    }, cumulativeDelay);
    timers.push(tid);
  }
  return () => {
    for (const tid of timers) window.clearTimeout(tid);
  };
}
