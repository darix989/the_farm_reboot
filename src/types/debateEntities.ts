/**
 * Domain entities for the dialogue / debate game (see plan_002.md).
 */

// Type-only import — avoids a runtime cycle with the bus module. The bus depends
// on `EventTrigger` from this file, and we depend on the trigger type it defines.
import type { DebateTutorialTrigger } from '../react/trial/utils/debateEventBus';
import type { TutorialModalSpec } from './tutorialModalLayout';

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
  | 'introduction:summary'
  | 'round:start'
  | 'round:end'
  | 'interactive:statement_selected'
  | 'interactive:statement_unlocked'
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

/**
 * Discriminated action performed by a synthetic UI interaction scheduled from
 * a tutorial step. Each action maps to a single concrete gesture on the
 * underlying debate UI (scroll a container, click a button).
 *
 * New action types should stay narrowly scoped — one gesture per variant —
 * so tutorial authors can compose sequences deterministically from JSON.
 */
export type TutorialArtificialInteractionAction =
  /** Scroll the debate log's scrollable content to the top. */
  | { type: 'debate_log:scroll_to_top' }
  /** Click the shrink / expand toggle on a specific debate-log round card. */
  | { type: 'debate_log:round:toggle_expand'; roundId: string }
  /** Click the analyze (magnifying-glass) button on a specific debate-log round card. */
  | { type: 'debate_log:round:analyze'; roundId: string }
  /** Scroll the wizard panel's scrollable content to the top. */
  | { type: 'wizard:scroll_to_top' }
  /** Scroll the wizard panel's scrollable content to the bottom. */
  | { type: 'wizard:scroll_to_bottom' };

/**
 * One artificial UI interaction fired automatically while a tutorial step is
 * visible. Interactions run in author order; each one optionally waits for
 * `delayTimeMs` before executing, so authors can space them out to let the UI
 * settle (e.g. scroll animation finishing before a click).
 */
export interface TutorialArtificialInteraction {
  /** Milliseconds to wait before executing this interaction. Defaults to 0 when omitted. */
  delayTimeMs?: number;
  /** The gesture to perform. */
  action: TutorialArtificialInteractionAction;
}

export type TutorialInteractionMode = 'modal_only' | 'target_only';

/**
 * Typed reference to a UI element that can be highlighted (and optionally be
 * the only interactable control) during a tutorial step.
 */
export type TutorialTargetRef =
  | { kind: 'panel'; panel: 'debate_log' | 'wizard' | 'interactive' }
  | { kind: 'modal_round_recap_score' }
  | { kind: 'intro_summary_action'; action: 'begin_round_1' | 'close' }
  | { kind: 'interactive_action'; action: 'back' | 'continue' | 'confirm' }
  | { kind: 'interactive_option'; optionId: string }
  | { kind: 'debate_log_round_analyze'; roundId: string }
  | { kind: 'debate_log_round_toggle'; roundId: string }
  | { kind: 'analysis_sentence'; sentenceId: string }
  | { kind: 'analysis_fallacy'; fallacyId: LogicalFallacyId }
  | { kind: 'analysis_action'; action: 'submit_guess' | 'no_fallacies' | 'close' };

/** One panel in the intro tutorial. */
export interface DebateTutorialStep {
  /** Modal box layout: explicit rect, size+position grid, or analysis modal presets. */
  modal?: TutorialModalSpec;
  /**
   * Tutorial body copy. Plain text works as before. Rich inline markup (optional):
   * - `**bold**`
   * - `[accent]…[/accent]`, `[danger]…[/danger]`, `[warning]…[/warning]`,
   *   `[success]…[/success]`, `[info]…[/info]`, `[muted]…[/muted]` for coloured spans
   * - Nesting is allowed (e.g. `[accent]**bold**[/accent]`). Unclosed tags are shown literally.
   * - `[[` → a literal `[`.
   * - A blank line (two or more consecutive newlines) starts a new paragraph; a single newline inside a paragraph becomes a line break.
   */
  message: string;
  /**
   * When `true`, the tutorial modal renders only forward progression controls.
   * The Back button is not mounted for this step.
   */
  onlyForward?: boolean;
  /**
   * Optional target component to highlight during this step.
   *
   * - Omitted: only tutorial overlay buttons can progress (`scenario 1`).
   * - Present + `interactionMode: 'modal_only'`: target is highlighted but not
   *   interactable (`scenario 2.1`).
   * - Present + `interactionMode: 'target_only'`: target is the only allowed
   *   in-app interaction (`scenario 2.2`).
   */
  targetComponent?: TutorialTargetRef;
  /** Behavior used when `targetComponent` is present. Defaults to `modal_only`. */
  interactionMode?: TutorialInteractionMode;
  /**
   * Optional custom class name applied to the highlighted target element.
   * When omitted, the tutorial default highlight class is used.
   */
  targetClassName?: string;
  /**
   * Optional ordered sequence of synthetic UI interactions fired while this
   * step is visible. Each entry's `delayTimeMs` is measured from the moment
   * the step becomes active (delays are cumulative across the list, so
   * entry N fires at `sum(delayTimeMs[0..N])`).
   *
   * Interactions are scheduled once per step activation and are cancelled if
   * the step changes, the tutorial closes, or the overlay unmounts before
   * they fire.
   */
  artificialInteractions?: readonly TutorialArtificialInteraction[];
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
   * `introduction:start` when the `debate_intro` phase begins, and
   * `introduction:summary` when the pre-round introduction summary modal opens.
   */
  tutorials?: readonly DebateScenarioTutorialEntry[];
}

// ---------------------------------------------------------------------------
// Assembling phase (UI state during a player round)
// ---------------------------------------------------------------------------
