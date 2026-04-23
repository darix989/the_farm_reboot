/**
 * Domain entities for the dialogue / debate game (see plan_002.md).
 */

// Type-only import — avoids a runtime cycle with the bus module. The bus depends
// on `EventTrigger` from this file, and we depend on the trigger type it defines.
import type { DebateTutorialTrigger } from '../react/trial/utils/debateEventBus';

/** Always exactly two sides in a debate. */
export type Side = 'proposition' | 'opposition';

export type LogicalFallacyId =
  | 'false-dilemma'
  | 'nothing-to-hide'
  | 'slippery-slope'
  | 'ad-hominem'
  | 'loaded-question'
  | 'straw-man'
  | 'appeal-to-pity'
  | 'special-pleading'
  | 'appeal-to-popularity'
  | 'weak-analogy'
  | 'hasty-generalization'
  | 'anecdotal'
  | 'false-cause'
  | 'genetic'
  | 'glittering-generalities'
  | 'appeal-to-emotion'
  | 'appeal-to-fear';

export type LogicalFallacyType = 'emotional' | 'faulty_logic' | 'structural';
export interface LogicalFallacy {
  id: LogicalFallacyId;
  type: LogicalFallacyType;
  label: string;
  description: string;
}

export interface LogicalFallacyScenario {
  id: LogicalFallacyId;
  explanation: string;
}

export interface Sentence {
  id: string;
  text: string;
  logicalFallacies: LogicalFallacyScenario[];
}

export type StatementType =
  | 'opening_constructive'
  | 'rebuttal'
  | 'crossfire'
  | 'closing_constructive';

export interface Statement {
  id: string;
  speakerId: string;
  sentences: Sentence[];
  type: StatementType;
}

export type JuryVerdict = 'proposition_accepted' | 'proposition_rejected';

// ---------------------------------------------------------------------------
// Player options
// ---------------------------------------------------------------------------

export type OptionQuality = 'logical_fallacy' | 'ineffective' | 'effective';

/** Max absolute value for `PlayerOption.impact` (symmetric range [-50, 50]). */
export const PLAYER_OPTION_IMPACT_ABS_MAX = 50;

/** When set on a `PlayerOption`, the option stays locked until the player identifies this fallacy in the given NPC sentence (same player round). */
export interface PlayerOptionUnlockCondition {
  npcRoundId: string;
  sentenceId: string;
  fallacyId: LogicalFallacyId;
}

/**
 * One of the three pre-authored choices offered to the player in a player round.
 * `impact` is a score delta; keep in [-PLAYER_OPTION_IMPACT_ABS_MAX, PLAYER_OPTION_IMPACT_ABS_MAX].
 */
export interface PlayerOption {
  id: string;
  quality: OptionQuality;
  sentences: Sentence[];
  /** Integer delta in [-PLAYER_OPTION_IMPACT_ABS_MAX, PLAYER_OPTION_IMPACT_ABS_MAX]. Negative for fallacy, ~0 for ineffective, positive for effective. */
  impact: number;
  /** Explanation of why this option is effective, ineffective, or a logical fallacy. */
  reason?: string;
  /**
   * If set, `sentences` is placeholder copy until unlock; full content lives in `unlockedSentences`.
   */
  unlockCondition?: PlayerOptionUnlockCondition;
  unlockedSentences?: Sentence[];
}

// ---------------------------------------------------------------------------
// Round entries
// ---------------------------------------------------------------------------

/** A round where the NPC (opponent) speaks; the player only reads and continues. */
export interface NpcRoundEntry {
  kind: 'npc';
  id: string;
  roundNumber: number;
  type: StatementType;
  speakerId: string;
  statement: Statement;
}

/** Links one NPC response to the player option that triggered it. */
export interface OpponentResponse {
  /** Id of the PlayerOption that triggers this response. */
  forOptionId: string;
  statement: Statement;
}

/**
 * A round where the player picks from 3 pre-authored options.
 *
 * Two sub-patterns:
 *  - Player raises question (crossfire): `opponentResponses` holds the NPC reply
 *    for each option (matched by `forOptionId`).
 *  - NPC raises question (crossfire) or NPC rebuttal/constructive: `opponentPrompt`
 *    holds the NPC's opening statement before the player responds; no `opponentResponses`.
 */
export interface PlayerRoundEntry {
  kind: 'player';
  id: string;
  roundNumber: number;
  type: StatementType;
  /** NPC speaks first (crossfire question) before the player responds. */
  opponentPrompt?: Statement;
  options: readonly [PlayerOption, PlayerOption, PlayerOption];
  /**
   * One NPC response per player option (exactly 3 elements, each with `forOptionId`
   * matching the corresponding PlayerOption id). Present only when the NPC replies
   * to each of the player's possible questions (player raises crossfire).
   */
  opponentResponses?: readonly [OpponentResponse, OpponentResponse, OpponentResponse];
  /**
   * When `true`, `options` are rendered in their authored order for every game
   * run instead of being deterministically shuffled per playthrough. Useful for
   * tutorial / scripted rounds where option positions must stay stable.
   */
  preventOptionsShuffle?: boolean;
}

export type RoundEntry = NpcRoundEntry | PlayerRoundEntry;

// ---------------------------------------------------------------------------
// Logical Fallacies JSON authoring shape
// ---------------------------------------------------------------------------

export interface LogicalFallaciesListJson {
  logicalFallacies: readonly LogicalFallacy[];
}

export type EventTrigger =
  | 'introduction:start'
  | 'round:start'
  | 'round:end'
  | 'interactive:statement_selected'
  | 'interactive:back'
  | 'interactive:continue'
  | 'interactive:confirm'
  | 'round:recap:open'
  | 'round:recap:close'
  | 'debate_log:round:analyze'
  | 'debate_log:round:shrink'
  | 'debate_log:round:expand'
  | 'analysis:open'
  | 'analysis:close'
  | 'analysis:sentence_selected'
  | 'analysis:sentence_deselected'
  | 'analysis:fallacy_selected'
  | 'analysis:fallacy_deselected'
  | 'analysis:guess_submitted'
  | 'analysis:guess_correct'
  | 'analysis:guess_incorrect'
  | 'analysis:guess_partially_correct'
  | 'analysis:guess_max_attempts_reached'
  | 'tutorial:start'
  | 'tutorial:next'
  | 'tutorial:end';

export type DebateTutorialLogic = {
  triggerEvent: EventTrigger;
};

// ---------------------------------------------------------------------------
// Scenario JSON authoring shape
// ---------------------------------------------------------------------------

/**
 * Spotlight rectangle as fractions of `#app-stage-16x9` (0 = start edge, 1 = full span).
 * Maps to viewport pixels at runtime via `getBoundingClientRect()` on the stage.
 */
export type DebateTutorialArea = {
  /** Left edge / stage width. */
  x: number;
  /** Top edge / stage height. */
  y: number;
  /** Width / stage width. */
  width: number;
  /** Height / stage height. */
  height: number;
};

/** One panel in the intro tutorial; optional spotlight defaults to full stage when omitted. */
export interface DebateTutorialStep {
  modal?: DebateTutorialArea;
  message: string;
  spotlight?: DebateTutorialArea;
  /**
   * When a step has a (non-full-stage) `spotlight`, the default is that the step
   * concludes as soon as any new `EventTrigger` fires (assumed to originate from
   * the spotlighted button) — no Continue / Got it button is shown; a hint
   * ("Click the highlighted button to continue") is rendered instead.
   *
   * Set this to `true` to opt out of that default and keep the normal
   * Continue / Got it button behavior even when a spotlight is defined.
   *
   * Ignored when the step has no spotlight (or a full-stage spotlight).
   */
  showContinueWithSpotlight?: boolean;
}

/** Ordered list of steps shown in a tutorial overlay. */
export interface DebateTutorialJson {
  /** At least one step; multiple steps use Back / Continue / Got it in the tutorial overlay. */
  steps: DebateTutorialStep[];
}

/**
 * Pair a tutorial overlay with a debate-event trigger. The overlay opens when
 * `trigger.event` fires AND every key in `trigger.where` matches the emitted
 * payload by deep structural equality.
 *
 * Semantics:
 *  - Fires at most once per scenario run (the dedup key is `id` when set, else
 *    the array index). To reset, open a different scenario.
 *  - If another tutorial is already open, matches are dropped (not queued).
 *  - At most one tutorial opens per event emission, even if multiple entries
 *    match — the first match wins in author order.
 */
export interface DebateScenarioTutorialEntry {
  /** Optional stable id; used as the dedup key. Falls back to array index. */
  id?: string;
  trigger: DebateTutorialTrigger;
  tutorial: DebateTutorialJson;
}

/**
 * Authoring shape for a single-player debate scenario loaded from JSON.
 * `rounds` defines the full sequential flow (NPC and player turns in order).
 */
export interface DebateScenarioJson {
  id: string;
  /** Brief summary of what the debate is about. */
  introduction?: string;
  playerSide: Side;
  /** Maps speakerId to a display name. Falls back to capitalizing the id when absent. */
  characters?: Record<string, string>;
  logicalFallacies: LogicalFallacyScenario[];
  availableLogicalFallacies: LogicalFallacyId[];
  rounds: RoundEntry[];
  /**
   * Overlay tutorials wired to specific debate events via the typed event bus.
   * See `DebateScenarioTutorialEntry`. The onboarding overlay that used to live
   * on `introTutorial` is now just a regular entry here, triggered by the
   * `introduction:start` event that fires when the `debate_intro` phase begins.
   */
  tutorials?: readonly DebateScenarioTutorialEntry[];
}

// ---------------------------------------------------------------------------
// Assembling phase (UI state during a player round)
// ---------------------------------------------------------------------------
