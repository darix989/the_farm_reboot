/**
 * Domain entities for the dialogue / debate game (see plan_002.md).
 */

// Type-only import — avoids a runtime cycle with the bus module. The bus depends
// on `EventTrigger` from this file, and we depend on the trigger type it defines.
import type { DebateTutorialTrigger } from '../react/trial/utils/debateEventBus';
import type { TutorialModalSpec } from './tutorialModalLayout';
// Type-only, and `animalEmotions` imports no Phaser — see its docstring for why the shared
// emotion vocabulary lives under `src/phaser/animals/`.
import type { AnimalEmotion } from '../phaser/animals/animalEmotions';
// Type-only. `gameConditions` reads the stores at runtime, so a value import here would drag
// zustand into every module that only wants the content schema.
import type { GameCondition } from '../utils/gameConditions';
import type { DialogFlagId } from '../data/dialogFlags';
import type { GameFeatureId } from '../data/gameFeatures';

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
  | 'closing_constructive'
  /** A line dropped outside the Public Farm floor (trough gossip, yard sparring). */
  | 'gossip';

/**
 * How many lines an authored recap summary may occupy. The recap renders summaries
 * clamped to this many lines, so anything longer is silently cut — treat it as a hard
 * authoring limit, not a suggestion.
 */
export const RECAP_SUMMARY_MAX_LINES = 2;

/**
 * Rough character budget for {@link RECAP_SUMMARY_MAX_LINES} lines at the recap's body
 * width. Used by the authoring lint (`npm run lint:scenarios`), not at runtime.
 */
export const RECAP_SUMMARY_MAX_CHARS = 160;

export interface Statement {
  id: string;
  speakerId: string;
  sentences: Sentence[];
  type: StatementType;
  /**
   * Authored paraphrase of `sentences`, shown wherever the line is *recapped* rather
   * than spoken (the round recap modal). Recapping the statement verbatim reads as a
   * copy-paste of the round the player just played, so write a fresh, shorter line —
   * what this statement did, not what it said. Keep it to
   * {@link RECAP_SUMMARY_MAX_LINES} lines (see {@link RECAP_SUMMARY_MAX_CHARS}).
   * When omitted the recap falls back to the full text.
   */
  summary?: string;
  /**
   * Overrides the emotion the staged sprite plays while this line is spoken. Omit it and
   * `activeEmotionForWorkflow()` derives one from the line itself (a statement carrying
   * `logicalFallacies` reads as `sneaky`, for instance) — set it only where the derived
   * emotion is wrong for the beat. An emotion the speaker's animal has no art for falls back
   * to the generic reaction, so authoring one is never load-bearing.
   */
  emotion?: AnimalEmotion;
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
   * Overrides the emotion Rue plays while delivering this line. Same rules as
   * {@link Statement.emotion}; omitted, it is derived from `quality`.
   */
  emotion?: AnimalEmotion;
  /**
   * Authored paraphrase of the line, shown in the round recap in place of the verbatim
   * sentences. Same rules as {@link Statement.summary}: a fresh, shorter line, at most
   * {@link RECAP_SUMMARY_MAX_LINES} lines. Describes the *unlocked* copy — while the
   * option is still locked the recap keeps showing the placeholder `sentences`.
   */
  summary?: string;
  /**
   * If set, `sentences` is placeholder copy until unlock; full content lives in `unlockedSentences`.
   */
  unlockCondition?: PlayerOptionUnlockCondition;
  /**
   * Requirements drawn from the rest of the game rather than from this debate: a fallacy the
   * player was taught by another animal, a conversation they had at the trough. Evaluated
   * against `ConditionContext` (see `src/utils/gameConditions.ts`).
   *
   * ANDed with `unlockCondition` when both are present, so "you were told about this *and* you
   * caught her doing it just now" is expressible. Presentation is shared: either field makes
   * the option locked, and unlocking still goes through the click-to-reveal step, which turns a
   * condition met an hour ago in another conversation into a discovery here.
   */
  unlockConditions?: readonly GameCondition[];
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
  /**
   * Integer delta in [-PLAYER_OPTION_IMPACT_ABS_MAX, PLAYER_OPTION_IMPACT_ABS_MAX] applied
   * to the moderator score from the player's perspective. Negative when the NPC's
   * statement is effective for the opposing side (the moderator drifts away from the
   * player), 0 when ineffective, positive when self-defeating (e.g. dense with fallacies)
   * and the moderator drifts toward the player.
   */
  impact: number;
  /**
   * When `true`, the Continue button stays disabled until the player has resolved this
   * round's analysis (a correct guess, or all attempts spent). Used by spotting-only
   * scenarios where analysing the statement *is* the gameplay.
   */
  requiresAnalysis?: boolean;
}

/** Links one NPC response to the player option that triggered it. */
export interface OpponentResponse {
  /** Id of the PlayerOption that triggers this response. */
  forOptionId: string;
  statement: Statement;
  /**
   * Integer delta in [-PLAYER_OPTION_IMPACT_ABS_MAX, PLAYER_OPTION_IMPACT_ABS_MAX] applied
   * to the moderator score from the player's perspective. Negative when the NPC's reply
   * lands a clean rebuttal against the picked option. Used to compute the round's
   * net "moderator's favor" delta = `playerOption.impact + opponentResponse.impact`.
   */
  impact: number;
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
  /**
   * Player-perspective signed impact for `opponentPrompt` (only meaningful when
   * `opponentPrompt` is set). Negative when the NPC's question lands hard. Combined
   * with the chosen option's impact to compute the round's net "moderator's favor"
   * delta = `opponentPromptImpact + playerOption.impact`. Defaults to 0 when omitted.
   */
  opponentPromptImpact?: number;
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

/**
 * The moderator's spoken opening of the floor. Lives on the scenario, not in `rounds`:
 * it is not scored, analysed, or numbered. Speaker is always `debateModeratorId`.
 */
export interface ModeratorOpening {
  id: string;
  sentences: Sentence[];
  /**
   * Overrides the emotion the staged sprite plays. Omit for `talking` — a fair opening
   * of the floor has nothing to derive a sneak or a doubt from.
   */
  emotion?: AnimalEmotion;
}

// ---------------------------------------------------------------------------
// Logical Fallacies JSON authoring shape
// ---------------------------------------------------------------------------

export interface LogicalFallaciesListJson {
  logicalFallacies: readonly LogicalFallacy[];
}

export type EventTrigger =
  | 'introduction:start'
  | 'introduction:summary'
  | 'moderator:start'
  | 'round:start'
  | 'round:end'
  | 'interactive:statement_selected'
  | 'interactive:statement_unlocked'
  | 'interactive:back'
  | 'interactive:continue'
  | 'interactive:confirm'
  | 'interactive:analyze'
  | 'round:recap:open'
  | 'round:recap:close'
  | 'debate_log:round:analyze'
  | 'debate_log:round:shrink'
  | 'debate_log:round:expand'
  | 'debate_log:expand'
  | 'debate_log:collapse'
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

export type TutorialInteractionMode = 'modal_only' | 'target_only' | 'highlight';
export type TutorialStepOnFinish = 'exit';

/** Field Notes sections. Mirrors `CodexSection` in `codexUiStore` so this file stays store-free. */
export type TutorialCodexSection = 'next' | 'known' | 'spotted' | 'dialogs';

/**
 * Typed reference to a UI element that can be highlighted (and optionally be
 * the only interactable control) during a tutorial step.
 */
export type TutorialTargetRef =
  | { kind: 'panel'; panel: 'debate_log' | 'wizard' | 'interactive' }
  /** Moderator opinion face (+ insight strip) in the debate log panel header. */
  | { kind: 'debate_log_moderator_score' }
  /** Moderator opinion face on the *collapsed* log's recap chip. */
  | { kind: 'debate_log_recap_moderator_score' }
  /** The maximize / minimize button that collapses or expands the log panel as a whole. */
  | { kind: 'debate_log_panel_toggle' }
  | { kind: 'modal_round_recap_score' }
  | { kind: 'round_recap_action'; action: 'continue' }
  | { kind: 'intro_summary_action'; action: 'begin_round_1' | 'close' }
  | { kind: 'interactive_action'; action: 'back' | 'continue' | 'confirm' | 'analyze' }
  | { kind: 'interactive_option'; optionId: string }
  | { kind: 'debate_log_round_analyze'; roundId: string }
  | { kind: 'debate_log_round_toggle'; roundId: string }
  | { kind: 'analysis_sentence'; sentenceId: string }
  | { kind: 'analysis_fallacy'; fallacyId: LogicalFallacyId }
  | {
      kind: 'analysis_action';
      action:
        | 'help'
        | 'help_confirm'
        | 'submit_guess'
        | 'no_fallacies'
        | 'no_fallacies_confirm'
        | 'close';
    }
  /** Attempts remaining + Insight Points recap row in the analysis modal body. */
  | { kind: 'analysis_resources' }
  /** Overworld / menu button that opens Field Notes. */
  | { kind: 'codex_open' }
  /** One Field Notes tab (`next` / `known` / `spotted` / `dialogs`). */
  | { kind: 'codex_tab'; section: TutorialCodexSection }
  /** The Field Notes tablist as a whole. */
  | { kind: 'codex_tabs' }
  /** The Field Notes body (current section's content). */
  | { kind: 'codex_content' }
  /** Field Notes Close control. */
  | { kind: 'codex_close' };

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
   * Optional behavior executed when the primary button is clicked on this step.
   * - `exit`: closes tutorial and routes the player to the Main Menu.
   */
  onFinish?: TutorialStepOnFinish;
  /**
   * Optional target component to highlight during this step.
   *
   * - Omitted: only tutorial overlay buttons can progress (`scenario 1`).
   * - Present + `interactionMode: 'modal_only'`: target is highlighted but not
   *   interactable (`scenario 2.1`).
   * - Present + `interactionMode: 'target_only'`: target is the only allowed
   *   in-app interaction (`scenario 2.2`).
   * - Present + `interactionMode: 'highlight'`: visual spotlight only; overlay
   *   Continue / Got it still work, and sibling Field Notes controls stay live.
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
  /** When true, this tutorial entry is ignored and never triggered. */
  disabled?: boolean;
  trigger: DebateTutorialTrigger;
  tutorial: DebateTutorialJson;
}

/**
 * What kind of encounter a scenario is. This selects UI copy only — the panel heading,
 * the opening guidance and the closing line — so a trough conversation is not labelled
 * "Debate Log". It never changes behaviour; the mechanics flags below do that.
 *
 * `'debate'` covers the full Public Farm and the one-beat skirmishes that use its chrome.
 */
export type EncounterKind = 'debate' | 'gossip' | 'sparring' | 'lab' | 'lesson';

/**
 * Feature flags that let a scenario ship as a *smaller mode* than a full Public Farm
 * debate (see `pitch/002_gradual_mechanics_onboarding.md`). Each flag is consumed
 * independently — there is deliberately no behavioural `mode` enum, so nothing in the
 * engine branches on which rung a scenario belongs to.
 *
 * Every field is optional and defaults to full-debate behaviour, so scenarios that
 * omit `mechanics` entirely keep working unchanged. Read these through
 * `resolveMechanics()` rather than off the raw scenario.
 */
export interface DebateScenarioMechanics {
  /** Analyze buttons and the analysis modal. Default `true`. */
  analysisEnabled?: boolean;
  /** Insight Points counter in the debate log header. Default `true`. */
  showInsightPoints?: boolean;
  /** Moderator gauge, opinion face and per-round impact numbers. Default `true`. */
  showModeratorOpinion?: boolean;
  /** The per-round recap modal. When `false`, rounds advance straight through. Default `true`. */
  showRoundRecap?: boolean;
  /** The pre-round-1 introduction summary modal. Default `true`. */
  showIntroSummary?: boolean;
  /**
   * When `true`, the round recap shows the chosen option's quality badge and its
   * `reason`. This is the only feedback a scenario with `analysisEnabled: false`
   * can give the player, so speaking-only rungs rely on it. Default `false`.
   */
  revealChoiceAssessment?: boolean;
  /**
   * The option quality this scenario rewards. Inoculation scenarios set
   * `'logical_fallacy'` so committing the fallacy on purpose reads as the win.
   * Only affects presentation — scoring always comes from authored `impact`.
   * Default `'effective'`.
   */
  targetQuality?: OptionQuality;
  /** Analysis attempts per target. Default `DEFAULT_MAX_ANALYSIS_ATTEMPTS`. */
  maxAnalysisAttempts?: number;
  /** Selects the encounter's UI copy. Presentation only. Default `'debate'`. */
  encounterKind?: EncounterKind;
  /**
   * The round-type half of the wizard label (`— crossfire`), the type line on debate-log
   * cards, and the analysis-modal subtitle. Default `true`. Hidden globally until the
   * `round_types` feature is unlocked, even when this flag is on.
   */
  showRoundType?: boolean;
}

/**
 * Authoring shape for a single-player debate scenario loaded from JSON.
 * `rounds` defines the full sequential flow (NPC and player turns in order).
 */
export interface DebateScenarioJson {
  id: string;
  /** Brief summary of what the debate is about. */
  introduction?: string;
  /**
   * Authored paraphrase of `introduction`, shown in the pre-round-1 introduction summary
   * modal. Without it that modal just repeats the introduction the player has already
   * read (truncated at a word boundary), so write a fresh line: the stakes, not the scene.
   * At most {@link RECAP_SUMMARY_MAX_LINES} lines.
   */
  introductionSummary?: string;
  playerSide: Side;
  /** Maps speakerId to a display name. Falls back to capitalizing the id when absent. */
  characters?: Record<string, string>;
  /**
   * Whose face the moderator status stills wear, and who speaks `moderatorOpening`.
   * 1.7 names Cass so she sits the fence as practice (and now stands in the centre slot
   * to open it). Omit to use a staged moderator (`characters` ∩ `MODERATOR_IDS`) or
   * Duchess. See `debateModeratorId`.
   */
  moderatorId?: string;
  /**
   * The moderator's opening of the floor, spoken after `debate_intro` and before round 1.
   * Presence of this field (with at least one non-empty sentence) is what creates the
   * `moderator_speaking` phase and puts the resolved moderator on stage. Not a numbered
   * round: no score, no analysis, no recap.
   */
  moderatorOpening?: ModeratorOpening;
  logicalFallacies: LogicalFallacyScenario[];
  availableLogicalFallacies: LogicalFallacyId[];
  /** Initial Insight Points balance the player starts the debate with. Defaults to 0. */
  startingInsightPoints?: number;
  /** Mode flags; omit for a full debate. See `DebateScenarioMechanics`. */
  mechanics?: DebateScenarioMechanics;
  /**
   * Fallacies the player can name once this encounter is finished — the only way the Codex's
   * "fallacies you know" list grows, other than spotting one in the wild.
   *
   * Granted on leaving a finished encounter, not on reaching the round that explains the
   * fallacy: an encounter the player walked out of halfway teaches them nothing.
   * See `src/utils/encounterRewards.ts`.
   */
  teachesFallacies?: readonly LogicalFallacyId[];
  /**
   * Dialog flags set once this encounter is finished, whatever the player scored. Use these
   * for "this conversation happened" gates rather than `encounter_completed`, because a flag
   * carries player-facing copy for the Codex and for the locked-encounter hint.
   *
   * On a farm Leave they wait until the follow-up pointer is heard
   * (`src/data/encounterFollowUps.ts`). Main-menu Leave and replays write them immediately.
   */
  setsDialogFlags?: readonly DialogFlagId[];
  /**
   * Features unlocked once this encounter is finished. Same leave-timing as
   * `teachesFallacies`: a walked-out lesson unlocks nothing. The teaching encounter can
   * still *show* the feature during play — `applyFeatureUnlocks` treats these ids as
   * visible for this scenario, and the store write persists them on leave.
   */
  unlocksFeatures?: readonly GameFeatureId[];
  rounds: RoundEntry[];
  /**
   * Overlay tutorials wired to specific debate events via the typed event bus.
   * See `DebateScenarioTutorialEntry`. The onboarding overlay that used to live
   * on `introTutorial` is now just a regular entry here, triggered by the
   * `introduction:start` when the `debate_intro` phase begins,
   * `introduction:summary` when the pre-round introduction summary modal opens, and
   * `moderator:start` when the moderator opens the floor.
   */
  tutorials?: readonly DebateScenarioTutorialEntry[];
}

// ---------------------------------------------------------------------------
// Assembling phase (UI state during a player round)
// ---------------------------------------------------------------------------
