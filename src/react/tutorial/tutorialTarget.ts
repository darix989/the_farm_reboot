/**
 * Tutorial-target plumbing shared by every targetable element in the trial UI.
 *
 * Targets fall into two families (see `TutorialTargetComponent` in
 * `types/debateEntities.ts`):
 *
 *  1. **Buttons** — interactable controls. While a tutorial is open, every
 *     button consults `useTutorialTarget` for its own `TutorialTargetComponent`.
 *     The matching button stays clickable and receives the highlight ring;
 *     non-matching buttons early-return from their click handlers. When the
 *     step has no `targetComponent` at all (Scenario 1) every button is
 *     silenced.
 *  2. **Containers** — non-interactable regions (panels, sections, cards).
 *     They consult `useTutorialHighlight` for their own
 *     `TutorialTargetComponent`; matching containers receive the highlight
 *     ring. They have no click handler, so the blocking flag is irrelevant.
 *     Container targets force the step to advance via the dialog buttons.
 *
 * Equality is intentionally narrow — exact `kind` plus exact id field — so a
 * step that targets `analysis:sentence:s7` does not accidentally light up
 * sentence cards for `s7` in a different scenario. Authors must spell out the
 * id; there is no wildcard form.
 *
 * Highlight styling: `useTutorialTarget` and `useTutorialHighlight` resolve a
 * `highlightClass` that callers paste into their `className`. By default it
 * points at the shared pulsing-border style in `tutorialHighlight.module.scss`.
 * Pass `{ highlightClass: customClass }` to swap the default for a
 * component-specific look (e.g. when the host element already paints its own
 * border and just needs a recoloured outline).
 */

import { useTutorialStore } from '../../store/tutorialStore';
import type { TutorialTargetComponent } from '../../types/debateEntities';
import highlightStyles from './tutorialHighlight.module.scss';

/** Default class applied to the active target. Re-exported for callers that
 *  want to compose with their own className without going through the hook. */
export const DEFAULT_TUTORIAL_HIGHLIGHT_CLASS: string = highlightStyles.highlight!;

/**
 * Deep-ish equality for two `TutorialTargetComponent` values. The union shape
 * is shallow — at most a `kind` plus one id field — so a structural compare on
 * `kind` plus the relevant id is sufficient.
 */
export function targetComponentMatches(
  a: TutorialTargetComponent | undefined,
  b: TutorialTargetComponent | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'interactive:option':
      return a.optionId === (b as { optionId: string }).optionId;
    case 'debate_log:expand':
    case 'debate_log:analyze':
    case 'debate_log:round':
      return a.roundId === (b as { roundId: string }).roundId;
    case 'analysis:sentence':
      return a.sentenceId === (b as { sentenceId: string }).sentenceId;
    case 'analysis:fallacy':
      return a.fallacyId === (b as { fallacyId: string }).fallacyId;
    // Singleton kinds (no extra fields) — `kind` match is sufficient.
    case 'interactive:back':
    case 'interactive:submit':
    case 'analysis:close':
    case 'analysis:submit':
    case 'analysis:no_fallacies':
    case 'analysis:no_fallacies_confirm':
    case 'analysis:no_fallacies_cancel':
    case 'panel:debate_log':
    case 'panel:wizard':
    case 'panel:interactive':
    case 'panel:interactive_options':
    case 'analysis:modal':
    case 'analysis:sentence_list':
    case 'analysis:fallacy_list':
      return true;
  }
}

/** Optional knobs accepted by both `useTutorialTarget` and `useTutorialHighlight`. */
export interface TutorialTargetOptions {
  /**
   * Override for the highlight class applied when this component is the
   * active target. Defaults to the shared pulsing-border in
   * `tutorialHighlight.module.scss`.
   *
   * Pass an empty string to opt out entirely (the hook will return
   * `highlightClass: undefined`) and apply your own visual treatment using
   * the returned `isTarget` flag.
   */
  highlightClass?: string;
}

/**
 * Result of `useTutorialTarget`. Button components consume all three fields:
 *  - `isBlocked` gates the click handler (early return when true).
 *  - `isTarget` toggles host-specific UI states (e.g. ARIA decorations).
 *  - `highlightClass` is the className to merge into the rendered element
 *    while it's the active target (or `undefined` otherwise).
 */
export interface TutorialTargetState {
  /**
   * `true` while a tutorial is open AND this component is *not* the active
   * target. The component's click handler should early-return.
   *
   * When the tutorial step has no `targetComponent` at all (Scenario 1), every
   * trial button is blocked — the user advances via the dialog buttons. When
   * the step's target is a *container* kind, every button is also blocked
   * (only matching button kinds unblock).
   */
  isBlocked: boolean;
  /**
   * `true` while a tutorial is open AND this component matches the active
   * step's `targetComponent`.
   */
  isTarget: boolean;
  /**
   * Highlight CSS class to merge into the host element's `className` while
   * it's the active target. `undefined` when not the active target, or when
   * the caller passed `highlightClass: ''` to opt out.
   */
  highlightClass: string | undefined;
}

/**
 * Read tutorial state from the store and decide whether `component` is the
 * highlighted target, and whether unrelated buttons should silence
 * themselves.
 *
 * Pass a stable reference (or a memoised one) when `component` carries an id;
 * otherwise re-renders will create a new object every commit and the hook
 * will recompute, which is harmless but wastes work in tight render loops.
 */
export function useTutorialTarget(
  component: TutorialTargetComponent,
  options?: TutorialTargetOptions,
): TutorialTargetState {
  const isOpen = useTutorialStore((s) => s.isOpen);
  const target = useTutorialStore((s) =>
    s.isOpen && s.steps.length > 0 ? s.steps[s.stepIndex]?.targetComponent : undefined,
  );

  if (!isOpen) {
    return { isBlocked: false, isTarget: false, highlightClass: undefined };
  }
  if (!target) {
    // Scenario 1: no target defined → every trial button is silenced.
    return { isBlocked: true, isTarget: false, highlightClass: undefined };
  }
  const matches = targetComponentMatches(component, target);
  if (!matches) {
    return { isBlocked: true, isTarget: false, highlightClass: undefined };
  }
  return {
    isBlocked: false,
    isTarget: true,
    highlightClass: resolveHighlightClass(options?.highlightClass),
  };
}

/**
 * Highlight-only variant for non-interactable container targets (panels,
 * sections, cards). Containers don't have a click handler to guard, so this
 * hook only returns whether the container is the active target plus the
 * resolved highlight class.
 */
export function useTutorialHighlight(
  component: TutorialTargetComponent,
  options?: TutorialTargetOptions,
): { isTarget: boolean; highlightClass: string | undefined } {
  const target = useTutorialStore((s) =>
    s.isOpen && s.steps.length > 0 ? s.steps[s.stepIndex]?.targetComponent : undefined,
  );
  if (!target || !targetComponentMatches(component, target)) {
    return { isTarget: false, highlightClass: undefined };
  }
  return {
    isTarget: true,
    highlightClass: resolveHighlightClass(options?.highlightClass),
  };
}

/**
 * Map an `options.highlightClass` value to the class that should be merged in.
 * `undefined` → default shared class. Empty string → no class (caller wants to
 * decorate themselves). Anything else → use the supplied override verbatim.
 */
function resolveHighlightClass(override: string | undefined): string | undefined {
  if (override === undefined) return DEFAULT_TUTORIAL_HIGHLIGHT_CLASS;
  if (override === '') return undefined;
  return override;
}
