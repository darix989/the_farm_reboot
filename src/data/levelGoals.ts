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
 * Level 1 — "The Pond Motion". One main goal per rung of the nine-rung ladder, in play
 * order: Bram → Bram → Cass → Hetty → Cass → Hetty → Bram → Bram → Duchess. Each goal
 * opens on the previous rung's reward, which is also what Dot's `talkStages` key off, so
 * the greeter and the journal cannot disagree about who is next.
 *
 * Level 1 has no optional goals, so the Next tab's Optional section never renders.
 * `currentOptionalGoals` stays for the levels that will.
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
    id: 'talk-bram-crossfire',
    kind: 'main',
    npcId: 'bram',
    titleLabel: 'levelGoalBramCrossfireTitle',
    bodyLabel: 'levelGoalBramCrossfireBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-rounds' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'bram-taught-crossfire' },
  },
  {
    id: 'talk-cass',
    kind: 'main',
    npcId: 'cass',
    titleLabel: 'levelGoalCassTitle',
    bodyLabel: 'levelGoalCassBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-crossfire' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'cass-named-ad-hominem' },
  },
  {
    id: 'talk-hetty',
    kind: 'main',
    npcId: 'hetty',
    titleLabel: 'levelGoalHettyTitle',
    bodyLabel: 'levelGoalHettyBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'cass-named-ad-hominem' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' },
  },
  {
    id: 'talk-cass-popularity',
    kind: 'main',
    npcId: 'cass',
    titleLabel: 'levelGoalCassPopularityTitle',
    bodyLabel: 'levelGoalCassPopularityBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'cass-named-appeal-to-popularity' },
  },
  {
    id: 'talk-hetty-grate',
    kind: 'main',
    npcId: 'hetty',
    titleLabel: 'levelGoalHettyGrateTitle',
    bodyLabel: 'levelGoalHettyGrateBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'cass-named-appeal-to-popularity' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'hetty-grate-heard' },
  },
  {
    // Playable from the moment Ad Hominem has a name — this is only where the journal
    // points at it, beside the skirmish it exists to prepare.
    id: 'bram-unlock-options',
    kind: 'main',
    npcId: 'bram',
    titleLabel: 'levelGoalBramUnlocksTitle',
    bodyLabel: 'levelGoalBramUnlocksBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'hetty-grate-heard' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'bram-taught-unlocks' },
  },
  {
    id: 'talk-bram-skirmish',
    kind: 'main',
    npcId: 'bram',
    titleLabel: 'levelGoalBramSkirmishTitle',
    bodyLabel: 'levelGoalBramSkirmishBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-unlocks' }],
    completeWhen: { kind: 'dialog_flag', flagId: 'bram-grate-conceded' },
  },
  {
    id: 'talk-duchess',
    kind: 'main',
    npcId: 'duchess',
    titleLabel: 'levelGoalDuchessTitle',
    bodyLabel: 'levelGoalDuchessBody',
    availableWhen: [{ kind: 'dialog_flag', flagId: 'bram-grate-conceded' }],
    completeWhen: { kind: 'encounter_completed', scenarioKey: '015_tobias_vs_rue' },
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
