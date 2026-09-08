import type { TutorialStepInput } from '../../../store/tutorialStore';

/**
 * Target kinds that only resolve to an element while the Debate Log panel is expanded.
 * `panel` is handled separately — only `panel: 'debate_log'` lives inside the log.
 */
const DEBATE_LOG_TARGET_KINDS = new Set([
  'debate_log_moderator_score',
  'debate_log_round_analyze',
  'debate_log_round_toggle',
]);

/**
 * True when any step of a tutorial points at something that only exists inside the expanded
 * Debate Log — a spotlight target or an artificial interaction.
 *
 * Every one of those lookups is a null-guarded `document.querySelector`
 * (`tutorialTarget.ts`, `artificialInteractions.ts`), so with the log collapsed they fail
 * *silently*: no spotlight, no scroll, no error. Callers use this to expand the log before
 * opening the tutorial.
 *
 * Deliberately scans **every** step, not just the first: a tutorial whose third step
 * highlights a round card must open with the log already up, because the panel has to be
 * mounted by the time that step's one-shot target lookup runs.
 */
export function tutorialNeedsDebateLog(steps: readonly TutorialStepInput[]): boolean {
  return steps.some((step) => {
    const target = step.targetComponent;
    if (target) {
      if (target.kind === 'panel' && target.panel === 'debate_log') return true;
      if (DEBATE_LOG_TARGET_KINDS.has(target.kind)) return true;
    }
    return (step.artificialInteractions ?? []).some((interaction) =>
      interaction.action.type.startsWith('debate_log:'),
    );
  });
}
