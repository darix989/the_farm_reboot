import type { TutorialTargetRef } from '../../types/debateEntities';

const CODEX_INNER_KINDS = new Set<TutorialTargetRef['kind']>([
  'codex_tab',
  'codex_tabs',
  'codex_content',
  'codex_close',
]);

/**
 * True when this target only exists while Field Notes is open. The overlay's
 * highlight lookup is a one-shot `querySelector`, so callers must open the Codex
 * (and wait for it to mount) before that lookup runs.
 *
 * Do **not** include `codex_open` — that is the farm button, which is covered
 * once the overlay is up.
 */
export function tutorialStepNeedsCodexOpen(target: TutorialTargetRef | undefined): boolean {
  return !!target && CODEX_INNER_KINDS.has(target.kind);
}

/**
 * True when this target is the Field Notes opening button. The Codex overlay
 * must stay closed or the button is hidden underneath it.
 */
export function tutorialStepNeedsCodexClosed(target: TutorialTargetRef | undefined): boolean {
  return target?.kind === 'codex_open';
}
