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
 * Modal rectangle as fractions of `#app-stage-16x9` (0 = start edge, 1 = full span).
 * Maps to viewport pixels at runtime via `getBoundingClientRect()` on the stage.
 *
 * Used for positioning the tutorial dialog itself; the spotlight system has
 * been retired in favour of {@link TutorialTargetComponent}.
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
 * Identifies a single element in the trial UI that a tutorial step anchors to.
 *
 * Each kind belongs to one of two families:
 *
 *  - **Button targets** (`button: true` in `TUTORIAL_TARGET_BUTTON_KINDS`) — an
 *    interactable control. While the step is active the element keeps a
 *    pulsing border AND remains clickable. Every other trial button silences
 *    its click handler. With `showContinueWithTarget: false` (default) the
 *    button's emitted event auto-concludes the step; with
 *    `showContinueWithTarget: true` the dialog Continue button advances and
 *    the target click runs its normal action without advancing.
 *  - **Container targets** — a non-interactable region (panel, section, card).
 *    The element gets the highlight; nothing on the screen is clickable
 *    except the dialog's Back / Continue / Got it. Auto-conclude is never
 *    armed for container kinds — the user must advance via the dialog.
 *
 * Discriminated by `kind`. Variants without extra fields refer to a singleton
 * element on the screen (e.g. the interactive footer's Submit button); variants
 * carrying an id (`optionId`, `roundId`, `sentenceId`, `fallacyId`) refer to a
 * specific instance among many siblings.
 *
 * Equality semantics: two `TutorialTargetComponent` values are considered the
 * same target when their `kind` matches AND every extra field has the same
 * primitive value (see `targetComponentMatches` in
 * `react/tutorial/tutorialTarget.ts`).
 */
export type TutorialTargetComponent =
  // -------------------------------------------------------------- Button targets
  // Interactive panel
  /** Choice button for a specific player option in the interactive panel. */
  | { kind: 'interactive:option'; optionId: string }
  /** The interactive panel's footer Back button. */
  | { kind: 'interactive:back' }
  /** The interactive panel's footer submit / continue button. */
  | { kind: 'interactive:submit' }
  // Debate log
  /** Round card expand / shrink toggle. */
  | { kind: 'debate_log:expand'; roundId: string }
  /** Round card analyze (magnifying-glass) button. */
  | { kind: 'debate_log:analyze'; roundId: string }
  // Round analysis modal
  /** Modal close (✕) button. */
  | { kind: 'analysis:close' }
  /** Sentence card inside the analysis modal's left column. */
  | { kind: 'analysis:sentence'; sentenceId: string }
  /** A specific logical-fallacy item in the FallacyPicker. */
  | { kind: 'analysis:fallacy'; fallacyId: string }
  /** "Spot Fallacies" submit button. */
  | { kind: 'analysis:submit' }
  /** "No fallacies in statement" button (opens the confirm dialog). */
  | { kind: 'analysis:no_fallacies' }
  /** Confirm button inside the no-fallacies confirm dialog. */
  | { kind: 'analysis:no_fallacies_confirm' }
  /** Cancel button inside the no-fallacies confirm dialog. */
  | { kind: 'analysis:no_fallacies_cancel' }
  // ----------------------------------------------------------- Container targets
  /** The whole debate-log feedback panel. */
  | { kind: 'panel:debate_log' }
  /** The whole wizard panel. */
  | { kind: 'panel:wizard' }
  /** The whole interactive panel. */
  | { kind: 'panel:interactive' }
  /** The grid of choice buttons inside the interactive panel. */
  | { kind: 'panel:interactive_options' }
  /** A single debate-log round card (the card itself, not the expand / analyze controls). */
  | { kind: 'debate_log:round'; roundId: string }
  /** The round-analysis modal's outer box. */
  | { kind: 'analysis:modal' }
  /** The list of sentence cards inside the analysis modal. */
  | { kind: 'analysis:sentence_list' }
  /** The fallacy-picker grid inside the analysis modal. */
  | { kind: 'analysis:fallacy_list' };

export type TutorialTargetKind = TutorialTargetComponent['kind'];

/**
 * Set of `kind`s whose target represents an interactable button. Container
 * kinds are intentionally excluded so the overlay never tries to auto-conclude
 * a step on a non-clickable target.
 */
export const TUTORIAL_TARGET_BUTTON_KINDS: ReadonlySet<TutorialTargetKind> =
  new Set<TutorialTargetKind>([
    'interactive:option',
    'interactive:back',
    'interactive:submit',
    'debate_log:expand',
    'debate_log:analyze',
    'analysis:close',
    'analysis:sentence',
    'analysis:fallacy',
    'analysis:submit',
    'analysis:no_fallacies',
    'analysis:no_fallacies_confirm',
    'analysis:no_fallacies_cancel',
  ]);

/** True for button kinds; false for container kinds. */
export function isButtonTutorialTarget(target: TutorialTargetComponent): boolean {
  return TUTORIAL_TARGET_BUTTON_KINDS.has(target.kind);
}

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

/** One panel in a tutorial overlay. */
export interface DebateTutorialStep {
  modal?: DebateTutorialArea;
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
   * Optional component the step is anchored to. Behaviour:
   *
   *  - **Omitted (Scenario 1)** — every interactive control in the trial UI
   *    early-returns from its click handler. The user advances via the Back /
   *    Continue / Got it buttons inside the tutorial dialog itself.
   *  - **Set + `showContinueWithTarget: true` (Scenario 2.1)** — the targeted
   *    component is highlighted with a pulsing border AND remains clickable.
   *    The dialog still shows Back / Continue so the user can advance either
   *    via the dialog or by interacting with the target.
   *  - **Set, no `showContinueWithTarget` (Scenario 2.2)** — the targeted
   *    component is the only clickable thing on the page; the dialog hides
   *    its primary button and a hint replaces it. Clicking the target emits
   *    the corresponding debate event, which auto-concludes the step.
   */
  targetComponent?: TutorialTargetComponent;
  /**
   * When a step has a `targetComponent`, the default is that the step concludes
   * as soon as any new `EventTrigger` fires (assumed to originate from the
   * targeted button) — no Continue / Got it button is shown; a hint is
   * rendered instead.
   *
   * Set this to `true` to opt out of that default and keep the normal
   * Continue / Got it button alongside the highlighted target.
   *
   * Ignored when the step has no `targetComponent`.
   */
  showContinueWithTarget?: boolean;
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
