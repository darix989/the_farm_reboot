/**
 * What Field Notes' Next tab should point the player at.
 *
 * A goal is a character to talk to (or an optional lesson), gated on the same
 * {@link GameCondition} vocabulary as overworld unlocks. Completing the main spine
 * follows Dot's `talkStages` in `farmMap.ts`, so the greeter and the journal cannot
 * disagree about who is next.
 *
 * Evaluation is pure over a {@link ConditionContext} snapshot. The overlay subscribes
 * via `useConditionContext()`; nothing here reads a store.
 */
import type { Labels } from './labels';
import {
  areConditionsMet,
  isConditionMet,
  type ConditionContext,
  type GameCondition,
} from '../utils/gameConditions';

export type LevelGoalKind = 'main' | 'optional';

export interface LevelGoal {
  id: string;
  kind: LevelGoalKind;
  /** Who to talk to — the Next tab names them. */
  npcId: string;
  titleLabel: Labels;
  /** Where they are, and why they matter now. */
  bodyLabel: Labels;
  /** Omit for a goal that is available from the start of the level. */
  availableWhen?: readonly GameCondition[];
  completeWhen: GameCondition;
}

/**
 * Level 1 — "The Pond Motion". Main goals are the character unlock spine
 * (Dot → Bram → Cass → Hetty → Duchess). The optional goal is Bram's skippable
 * crossfire lesson (rung 1.2), which is not required for Cass.
 */
export const LEVEL_1_GOALS: readonly LevelGoal[] = [
  {
    id: 'talk-dot',
    kind: 'main',
    npcId: 'dot',
    titleLabel: 'levelGoalDotTitle',
    bodyLabel: 'levelGoalDotBody',
    completeWhen: { kind: 'dialog_flag', flagId: 'dot-welcomed' },
  },
  {
    id: 'talk-bram',
    kind: 'main',
    npcId: 'bram',
    titleLabel: 'levelGoalBramTitle',
    bodyLabel: 'levelGoalBramBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'dot-welcomed' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'bram-taught-rounds' },
  },
  {
    id: 'talk-cass',
    kind: 'main',
    npcId: 'cass',
    titleLabel: 'levelGoalCassTitle',
    bodyLabel: 'levelGoalCassBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-rounds' }],
    completeWhen: { kind: 'fallacy_known', fallacyId: 'ad-hominem' },
  },
  {
    id: 'talk-hetty',
    kind: 'main',
    npcId: 'hetty',
    titleLabel: 'levelGoalHettyTitle',
    bodyLabel: 'levelGoalHettyBody',
    availableWhen: [{ kind: 'fallacy_known', fallacyId: 'ad-hominem' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' },
  },
  {
    id: 'talk-duchess',
    kind: 'main',
    npcId: 'duchess',
    titleLabel: 'levelGoalDuchessTitle',
    bodyLabel: 'levelGoalDuchessBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' }],
    completeWhen: { kind: 'encounter_completed', scenarioKey: '015_tobias_vs_rue' },
  },
  {
    id: 'bram-crossfire',
    kind: 'optional',
    npcId: 'bram',
    titleLabel: 'levelGoalBramCrossfireTitle',
    bodyLabel: 'levelGoalBramCrossfireBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-rounds' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'bram-taught-crossfire' },
  },
];

function isGoalOpen(goal: LevelGoal, ctx: ConditionContext): boolean {
  return areConditionsMet(goal.availableWhen, ctx) && !isConditionMet(goal.completeWhen, ctx);
}

/** First unmet main goal in author order, or `null` when the spine is finished. */
export function currentMainGoal(ctx: ConditionContext): LevelGoal | null {
  return LEVEL_1_GOALS.find((goal) => goal.kind === 'main' && isGoalOpen(goal, ctx)) ?? null;
}

/** Every optional goal that is available and not yet done. */
export function currentOptionalGoals(ctx: ConditionContext): LevelGoal[] {
  return LEVEL_1_GOALS.filter((goal) => goal.kind === 'optional' && isGoalOpen(goal, ctx));
}
