# AGENTS.md — React overlay layer

This document describes the React UI layer under `src/react/` with a focus on the Trial/debate screen (`screens/TrialUI.tsx`) and its supporting files.

## Files at a glance

| File | Purpose |
|------|---------|
| `ReactApp.tsx` | Scene-keyed switch: renders `MainMenuUI`, `TrialUI`, or `BoilerPlateUI` based on the active Phaser scene. |
| `ReactRoot.tsx` | Positions the overlay over the Phaser canvas and syncs its size on resize. |
| `screens/MainMenuUI.tsx` | Overlay shown while the `MainMenu` scene is active. |
| `screens/GameLoadingScreen.tsx` | Loading screen shown until `isGameReady`, and again while `isSceneLoading`. Also the interaction gate: it covers the stage and sets `pointer-events: auto`, so nothing behind it is clickable while `Boot`/`Preloader` or a scene pack load. |
| `screens/BoilerPlateUI.tsx` | Fallback overlay for scenes without a dedicated UI. |
| `codex/CodexOverlay.tsx` | Field Notes journal: Next (who to talk to), known / spotted fallacies, important conversations. |
| `screens/TrialUI.tsx` | Thin orchestrator: workflow hook, modal/guess state, `TrialLayout`, `RoundRecapModal`, and `RoundAnalysisModal`. |
| `trial/TrialLayout.tsx` | 2×2 grid shell: a transparent full-width "game hole" across the top row, then the Debate Log (or `DebateLogRecapChip` when collapsed) over its right 3fr when a `log` slot is passed, and Dialog / Actions along the bottom. Reads `debateLogStore` and owns the collapsed/expanded branch. Farm talks omit `log`. |
| `trial/panels/FeedbackPanel.tsx` | The expanded Debate Log: title strip (log title, Insight + moderator mood, the whole-panel collapse button) and the scrollable round-card list. |
| `trial/components/DebateLogRecapChip.tsx` | The collapsed Debate Log: round counter, the same Insight + mood strip, and the button back in. |
| `trial/components/DebateLogToggleButton.tsx` | The whole-panel collapse / expand control, rendered by both of the above so they cannot drift. Exports `DEBATE_LOG_PANEL_ID`. |
| `trial/components/TrialActionRow.tsx` | Analyze / Back / Continue icon row, shared by the debate Actions panel and the overworld talk. Owns A / S / Enter / Space / D (and farm-talk E) shortcuts. |
| `trial/components/TrialChoiceButton.tsx` | A/B/C (or Talk / Leave) square, shared by the debate and the overworld talk. |
| `trial/utils/debateLogTutorialNeeds.ts` | `tutorialNeedsDebateLog(steps)` — does this tutorial point at something only present while the log is expanded? |
| `trial/panels/WizardPanel.tsx` | Centre column: the guidance line plus the statement box, which fills in a sentence at a time, each one added below the last (see "Wizard sentence reveal"). |
| `trial/panels/InteractivePanel.tsx` | Right column: phase-specific content and an icon-only footer (Analyze / Back / Continue-Confirm-Leave). The Analyze button opens the opponent's current-round line — the debate log's own `AnalyzeButton` lenses stay the way into history. |
| `hooks/useTrialRoundWorkflow.ts` | Reducer hook that owns the entire debate state machine. Also emits `round:start` / `round:end` on the debate event bus. |
| `hooks/useWizardReveal.ts` | Paces one incoming line through the wizard a sentence at a time; owns which sentences have been spoken, not the character count. |
| `hooks/useWindowKeyDown.ts` | Window `keydown` subscription that always calls the latest handler (same ref pattern as `useDebateEvent`). |
| `trial/utils/trialActionShortcuts.ts` | Action-key codes (Continue / Analyze / Back / options) and the ignore rules for focused controls. |
| `trial/components/TypewriterText.tsx` | Leaf that fills in one line character by character. Owns the character count so a reveal re-renders one node, not the overlay. |
| `hooks/useScenarioTutorials.ts` | Subscribes to bus events declared by `scenario.tutorials` and opens the matching overlay via `useTutorialStore` (see "Scenario tutorials" below). |
| `hooks/useFarmTutorials.ts` | Opens farm overlay tutorials from `src/data/farmTutorials.ts` when their `GameCondition`s are met (see "Farm tutorials" below). |
| `trial/utils/debateEventBus.ts` | Typed pub/sub singleton keyed on `EventTrigger`, plus the `useDebateEvent` React hook and tutorial-trigger helpers (`DebateTutorialTrigger`, `debatePayloadSatisfies`, `debateTutorialTriggerMatches`). |
| `trial/roundRecapModal/RoundRecapModal.tsx` | Post–player-round summary modal; closing it dispatches `continue` and advances the workflow. Emits `round:recap:open` / `round:recap:close` on mount/unmount. Each block renders the authored `summary` (clamped to two lines), falling back to the spoken text — see [`docs/encounters.md`](../../docs/encounters.md#recap-summaries). |
| `trial/roundAnalysisModal/RoundAnalysisModal.tsx` | Modal overlay for per-round analysis and fallacy guessing (see below). Emits `analysis:*` events for every open/close, sentence toggle, fallacy toggle, and guess outcome. |
| `hooks/useScrollFade.ts` | Hook that tracks scroll edge state; drives animated fade overlays on scrollable containers. |
| `trial/utils/trialHelpers.ts` | Shared helpers: speaker names, quality/score colours, statement text, statement type labels. |
| `trial/utils/optionUnlock.ts` | Player-option unlock rules, lock-phase hints, and resolved sentence text for gated choices. |
| `trial/utils/fallacyGuessTypes.ts` / `fallacyGuessUtils.ts` | Types and multiset logic for the analysis-modal guessing game. |
| `trial/components/AnalyzeButton.tsx` | Magnifying-glass analyse button (history / interactive). |
| `trial/components/HistoryEntry.tsx` | Repeated history row layout (label, body, optional analyse button). |
| `trial/components/StatementBlock.tsx` | Speaker label + statement text (+ optional inline analyse button). |
| `trial/components/ScrollFadeContainer.tsx` | Wraps a scrollable div with top/bottom fade overlays; calls `useScrollFade` internally. |
| `hooks/useGame.ts` | Utilities around the `GameManager` and the Zustand store. |
| `index.scss` | Global base styles for the React layer (imported from `ReactApp.tsx`; no Tailwind). Applies `uiTypography.font-scale` on `.react-root` and `uiColors.color-palette` on `html`. |
| `uiTypography.scss` | `@mixin font-scale` — sets `--ui-font-*` (consumed under `.react-root`). |
| `uiFont.ts` | `uiFont` object: `var(--ui-font-*)` for inline `style` in TSX. |
| `uiColors.scss` | `@mixin color-palette` — sets `--ui-color-*` on the element where the mixin is included (`html` in `index.scss`). |
| `uiColor.ts` | `uiColor` object: `var(--ui-color-*)` for inline styles and helpers (e.g. `trialHelpers`). |
| `*.module.scss` | Per-component styles (e.g. `trial/panels/TrialPanels.module.scss`, `trial/trialShared.module.scss`, `trial/roundAnalysisModal/RoundAnalysisModal.module.scss`). Prefer `var(--ui-color-*)` over raw hex/rgba for shared colours. |

---

## ⚠️ Critical: pointer-events architecture

`.react-ui-overlay` (the root wrapper in `App.tsx`) has **`pointer-events: none`**. This **inherits to every descendant**. Panels re-enable pointer events with `pointer-events: auto`, but any **new interactive element** (modal overlay, custom popup, tooltip, etc.) that does not sit inside an existing panel **must explicitly set `pointer-events: auto`** on itself, or all click/hover/focus events will silently fall through to the Phaser canvas.

This caused the round analysis modal to be completely non-interactive until `pointer-events: auto` was added to the modal overlay styles.

---

## TrialUI — overview

`TrialUI` is the React overlay rendered when the `Trial` Phaser scene is active. It receives a single `debate` prop of type `DebateScenarioJson` (see `src/types/debateEntities.ts`) and drives the full debate interaction with no Phaser involvement.

```tsx
<TrialUI debate={scenarioData} />
```

Implementation split:

- **`TrialUI.tsx`** — `useTrialRoundWorkflow`, `analysisTarget` / `fallacyGuesses`, `handleGuess`, `getNpcGuessState` (memoised), `interactiveFooter` and `modalSpeakerName` memos, then composes `FeedbackPanel`, `WizardPanel`, `InteractivePanel`, and `RoundAnalysisModal`.
- **Panels** — Own their JSX and imports; shared presentation lives in `trial/components/*`, `trial/panels/TrialPanels.module.scss`, and `trial/utils/trialHelpers.ts`.

### Data model — `DebateScenarioJson`

`DebateScenarioJson` is the authoring shape for a complete scenario. Relevant fields:

| Field | Type | Meaning |
|-------|------|---------|
| `id` | `string` | Unique scenario identifier. |
| `introduction` | `string?` | Optional text shown at the top of the Feedback panel throughout the debate. |
| `playerSide` | `"proposition" \| "opposition"` | Which side the player argues. |
| `characters` | `Record<string, string>?` | Maps a `speakerId` to a display name; falls back to capitalising the id. |
| `logicalFallacies` | `LogicalFallacyScenario[]` | The fallacies this scenario uses, each with an `explanation` shown after a guess. |
| `availableLogicalFallacies` | `LogicalFallacyId[]` | Which fallacy icons appear on the analysis modal's picker. Keep it short — it is the difficulty dial. |
| `startingInsightPoints` | `number?` | Insight balance the player starts with. Defaults to 0. |
| `mechanics` | `DebateScenarioMechanics?` | Mode flags that let a scenario ship as something smaller than a full debate. Omit for full-debate behaviour. See [`docs/encounters.md`](../../docs/encounters.md). |
| `rounds` | `RoundEntry[]` | Ordered list of NPC and player turns (see below). |
| `tutorials` | `DebateScenarioTutorialEntry[]?` | Bus-driven overlays triggered by specific `EventTrigger` emissions with optional payload filters. See "Scenario tutorials" below. The onboarding overlay that used to live on `introTutorial` is now just an entry here triggered by `introduction:start`. |

---

## Rounds system

`rounds` is a **sequential array** of `RoundEntry` items. Each entry is either an `NpcRoundEntry` or a `PlayerRoundEntry` (discriminated by the `kind` field). The workflow advances through this array one entry at a time.

### NPC rounds (`kind: "npc"`)

The NPC speaks. The player has **no choices** — they simply read the statement and click **Continue** to proceed to the next round.

Relevant fields: `speakerId`, `statement` (a `Statement` with one or more `Sentence` objects), `type` (`StatementType`).

Each `Sentence` carries a `logicalFallacies: LogicalFallacy[]` array listing any fallacies present in that sentence. This powers the analysis modal guessing mechanic.

### Player rounds (`kind: "player"`)

The player must pick **one of exactly three pre-authored `PlayerOption` items**. Each option has:

| Field | Type | Meaning |
|-------|------|---------|
| `quality` | `"effective" \| "ineffective" \| "logical_fallacy"` | Qualitative label shown in the history. |
| `impact` | `number` | Score delta applied when the option is confirmed (range `[-50, 50]`). |
| `sentences` | `Sentence[]` | The full text of the option. Each sentence may carry its own `logicalFallacies`. |
| `reason` | `string?` | Explanation of why the option is effective, ineffective, or a fallacy. Displayed in the analysis modal. |

Optional fields on a player round:

- **`opponentPrompt`** — an NPC statement shown before the player's options (e.g. the NPC raises a crossfire question).
- **`opponentResponses`** — exactly three `OpponentResponse` entries, one per option, shown after the player confirms their choice.

---

## Game phases and state machine

`useTrialRoundWorkflow` (in `hooks/useTrialRoundWorkflow.ts`) maintains a `GamePhase` enum and an undo-capable history stack. The phases and their transitions are:

```
debate_intro   (only when `scenario.introduction` is non-empty)
    │  Continue → intro summary modal → Begin Round 1
    │  (mechanics.showIntroSummary: false skips the modal)
    ▼
npc_speaking
    │  Continue  — held disabled while the round has `requiresAnalysis`
    │             and its analysis is unresolved
    ▼
player_choosing
    │  pick one of the 3 options, then Continue
    ├─► npc_responding   (round has opponentResponses)
    │        │  Continue
    │        ▼
    └─► round_recap ◄────┘   (entered directly when there are none)
    │  Continue closes the recap
    │  (mechanics.showRoundRecap: false skips it — advance straight on)
    ▼
[next round] ... until rounds are exhausted
    ▼
debate_complete
    │  Leave → mark complete, return to `gameStore.returnSceneKey`
    ▼
[MainMenu or Farm]
```

Three notes on this diagram:

- **Continue is consumed by the wizard reveal first.** In every phase that reveals an incoming
  line, the first presses step through its sentences and dispatch nothing; once the **last
  sentence** has landed, Continue advances the phase as drawn (and Analyze unlocks). See
  "Wizard sentence reveal".

- **`player_confirming` is not in it on purpose.** The phase is declared in `GamePhase` and
  reduced, and `canUndo` keys off it — but nothing ever sets it, so it is unreachable.
  `player_choosing` + Continue goes straight to `npc_responding` / `round_recap`. Treat it as
  dead code until something enters it.
- **`debate_complete` used to be a dead end** — it fell through to `default:` in `TrialUI`'s
  footer, leaving Continue disabled forever. It now has a Leave action; see
  [`docs/farm_overworld.md`](../../docs/farm_overworld.md) for the return-trip plumbing.

### Key hook values returned by `useTrialRoundWorkflow`

| Value | Description |
|-------|-------------|
| `gamePhase` | Current `GamePhase` string. |
| `currentRound` | The `RoundEntry` at the active index, or `null`. |
| `currentRoundIndex` | Index of the current round in `scenario.rounds`. |
| `totalRounds` | Total number of rounds in the scenario. |
| `currentNpcRound` | Typed shortcut when the current round is NPC. |
| `currentPlayerRound` | Typed shortcut when the current round is player. |
| `selectedOption` | The `PlayerOption` the player has clicked but not yet confirmed. |
| `activeOpponentResponse` | The `OpponentResponse` matched to the confirmed option (during `npc_responding` and `round_recap`). |
| `completedRounds` | Array of `CompletedRound` records for all past player turns. |
| `totalScore` | Running sum of `impact` values from confirmed options. |
| `maxPossibleScore` | Sum of the best `impact` across every player round (for a score display). |
| `canUndo` | `true` only during `player_confirming` — the Back button is enabled. |
| `wizardMessage` | Human-readable guidance string for the current phase. |
| `wizardRoundLabel` | `"Round 4 — crossfire"` alone, or `null` outside the rounds. What the wizard shows while it is still revealing a statement. |
| `dispatch` | Action dispatcher (`continue`, `select_option`, `confirm_option`, `undo`). |

---

## Three-panel layout

`TrialLayout` (in `trial/TrialLayout.tsx`) arranges the named slots over the 2×2 grid. Debates pass a grouped `log` slot (`FeedbackPanel` + `DebateLogRecapChip`) plus `WizardPanel` and `InteractivePanel`; the layout renders the log panel or the chip depending on `debateLogStore.isExpanded` (see **Collapsing the whole log** above). Farm talks reuse the same layout with no `log` slot — Dialog and Actions only, farm framed in the hole.

### Collapsing the whole log

The Debate Log collapses **as a panel**, independently of the per-round card bodies, and
**collapsed is the default** for every encounter (`TrialUI` calls `resetDebateLog()` per
scenario). Collapsed, the stage's top-right corner holds `DebateLogRecapChip`; expanded, the
panel is exactly what it always was, painting over the right 3fr of the full-width cast.

Three things worth knowing before you touch it:

- **The flag is a store (`src/store/debateLogStore.ts`), not `useState`.** `TutorialOverlay`
  resolves a step's highlight target exactly once per step and gives up when the element is
  missing — no retry, no observer. Expanding from an effect would mount the panel a commit
  too late and every debate-log tutorial step would lose its spotlight silently. So
  `useScenarioTutorials` calls `setExpanded(true)` **before** `openTutorial`, gated on
  `tutorialNeedsDebateLog`, and both store writes land in one synchronous emit.
- **Collapsing unmounts the panel, deliberately.** `display: none` would zero
  `getBoundingClientRect`, leaving `FeedbackPanel`'s auto-scroll measuring garbage and never
  re-running, so re-expanding would park the log at the top instead of the active round. A
  fresh mount runs that effect with no previous index and scrolls to the current round. The
  cost — per-round expand overrides reset — is harmless, since cards default to shrunk.
- **The chip and the panel are mutually exclusive in the DOM.** Collapsing unmounts the
  panel and mounts the chip, so a bare `querySelector` can target either state on purpose.
  The moderator emoji on the chip is `debate_log_recap_moderator_score`; the same strip in
  the expanded header is `debate_log_moderator_score`. Only the header kind is in
  `tutorialNeedsDebateLog` — adding the chip kinds there would auto-expand the panel and
  unmount the controls they point at. The whole-panel ◀ / ▶ is `debate_log_panel_toggle`
  (`data-debate-log-toggle-panel`, already on `DebateLogToggleButton`).

### Feedback panel (`trial/panels/FeedbackPanel.tsx`)

- Shows the `introduction` text (if present) at the top, always visible.
- Displays the current **round counter** (`Round N / total`) and **score** (coloured cyan for positive, red for negative).
- Below those, renders a scrollable **history** of all completed rounds: NPC statements and player choices (with quality, impact, and first sentence), plus any NPC responses.
- Each history entry has a **magnifying glass button** (bottom-right corner, `src/static/icons/magnifying.svg`) via `AnalyzeButton` that opens the `RoundAnalysisModal`. The button turns **green** if the player correctly guessed a fallacy in that NPC round, or **red** if the guess was wrong.
- The panel **auto-scrolls to the bottom** whenever `currentRoundIndex` increases (new history content is added), using a `useEffect` + `scrollTo` on the scroll ref owned by `FeedbackPanel`.

### Wizard panel (`trial/panels/WizardPanel.tsx`)

- Displays `wizardMessage` — a single contextual hint that tells the player what to do next (e.g. "Read the opponent's statement, then click Continue").
- Below it, the statement box: the title of the line being spoken (`"Duchess speaks:"`) and its
  text, one sentence at a time while a reveal is running, then held on the last sentence.

### Interactive panel (`trial/panels/InteractivePanel.tsx`)

Content depends on `gamePhase`:

| Phase | Rendered content |
|-------|-----------------|
| `npc_speaking` | The NPC's full statement text (`StatementBlock`). |
| `player_choosing` | Three choice buttons labelled A / B / C — mounted but invisible and disabled (`hideOptions`) while the wizard is still revealing the opponent's question. |
| `player_confirming` | The full text of the selected option plus a reminder that confirming is irreversible. |
| `npc_responding` | The NPC's response matched to the confirmed option (`StatementBlock` + `AnalyzeButton`). |
| `round_recap` | Same response view as `npc_responding` when a crossfire reply exists; otherwise a short note to use the recap modal. The footer **Continue** is disabled — the player advances only from the `RoundRecapModal`. |
| `debate_complete` | A "debate finished" message with the final score. |

The panel footer is three icon-only squared buttons: **Analyze | Back | Continue**. Analyze always targets the opponent's *current* line (the NPC statement, the opponent's crossfire question, or its response — never the player's own choice), keyed off `gamePhase`; it stays disabled while that line is still being revealed, and with nothing current to analyze (`debate_intro`, `player_confirming`, `round_recap`, `debate_complete`) it renders disabled rather than reflowing the row, and it is not rendered at all when `mechanics.analysisEnabled` is `false`. It carries the same green/amber/red guess-state tint as the debate log's `AnalyzeButton` lenses. **Back** is enabled only in `player_confirming` (or while an option can be unselected in `player_choosing`). The context-sensitive submit button's icon follows its three states — continue / confirm / leave — via `TrialUI`'s `interactiveFooter.submitIcon`.

Keyboard shortcuts press those same buttons (no-op when the matching control is disabled, hidden, or tutorial-blocked): **A** Analyze, **S** Back, **Enter / Space / D** Continue (Confirm / Leave), **Z / X / C** options A / B / C. Analysis and intro-summary overlays suspend the footer/option map so they do not steal keys; recap and intro-summary Continue / Begin bind Enter / Space / D themselves. Farm talk keeps **E** as an extra Continue alias, and last-beat **Talk / Leave** take the A / B slots (**Z / X**). An open tutorial takes **Enter / Space / D** for Got it / Continue unless the step is `target_only` (those keys then press the highlighted control instead).

---

## Wizard sentence reveal (`hooks/useWizardReveal.ts`)

Incoming speech is paced through the wizard one sentence at a time rather than dumped as a
block. `TrialUI` builds a `WizardRevealSource` (`{ key, sentences }`) for the current phase and
passes it to `useWizardReveal`, which returns the line as `spoken` (the sentences already fully
shown) plus `typing` (the one still filling in, or `null`). `WizardPanel` renders `spoken` as
static `<p>`s and `typing` through `TypewriterText` after them.

**The box accumulates.** Each sentence is *added* below the ones before it, so a finished line
shows in full. This is load-bearing, not cosmetic: `settled` is a "this line has been read" flag
with no memory of how far the pacer got, and several things complete a line early (table below).
While the wizard showed one chunk at a time, any of those froze it on whichever sentence was up
— usually the first, with the rest of the statement unreachable and the readout stuck at `(1/4)`.
With the whole line on screen the stale index cannot be seen. For the same reason the `(2/4)`
readout counts `spoken`, never an index.

Each sentence must stay a plain sibling `<p>`. Wrapping the stack in a flex or grid container
would establish a BFC, and it would sit *beside* the floated speaker portrait
(`.trialWizardPortrait`) instead of flowing around it.

Because the box now holds a whole line it can outgrow the panel, which one sentence rarely did.
`WizardPanel` keeps the newest text in view with a `ResizeObserver` on the scroll container's
content — an effect keyed on the sentence count is not enough, since the character count lives in
`TypewriterText` so that a line filling in re-renders one leaf, not the overlay. For the same
reason `.trialWizardDetailLive` is `flex: 0 0 auto`: as a `1 1 0%` item it was shrunk below its
own content, so its box never grew and nothing watching it could tell the text had.

**Press rules**

- Continue (or Enter / Space / D) while characters are still appearing fills in the rest of the
  sentence. Those keys invoke the footer Continue button, so they also advance the phase or
  farm beat once that button is enabled and the line is fully on screen.
- Continue on a fully-shown sentence adds the next one below it.
- When the **last** sentence finishes (typewriter or skip), the reveal is done: the whole line
  is on screen at `(n/n)`, Analyze unlocks, and Continue becomes the phase-advance button.
  Skipping the last sentence mid-type fills it in and does **not** also advance the round on
  that same press.
- Reduced motion and an open tutorial skip the pacer, which lands in `settled` like a line the
  player paced through — the whole line, same rendering path. `settled` is deliberately *not*
  gated on `enabled` / `reduced`: gating it was what made the wizard shrink back to sentence 1
  when a tutorial closed. The `(all)` readout is now only for content shown whole with no
  reveal attached (the round recap, the closing verdict).

**What is revealed** — incoming speech only: `scenario.introduction` during `debate_intro`, the
NPC statement during `npc_speaking`, `opponentPrompt` during `player_choosing` while no option
is selected, and the matched `OpponentResponse` during `npc_responding`. Never the player's own
selected line, the round recap, or the closing verdict. `TrialUI`'s source memo switches on
`gamePhase` **first** — `activeOpponentResponse` is also non-null during `round_recap`.

**Chunking** — one entry point, `revealChunks(string | Sentence[])` in
`trial/utils/trialHelpers.ts`, used by every source in `TrialUI` and by `FarmDialogue`. An
authored `Sentence[]` maps 1:1, so wizard chunks line up with the cards the analysis modal
guesses on; prose (`scenario.introduction`, farm talk beats) goes through `splitIntoSentences`.
Do not fold authored sentences — that would unpair the wizard's chunks from the modal's cards.

**What completes a reveal early** (`reveal.complete()`, and the line is never revealed again).
All four land in `settled`, which shows the whole line — none of them can strand the player
part-way through a statement.

| Trigger | Why |
|---|---|
| A tutorial overlay is open | `tutorialStore.canRunTargetAction` blocks Continue for any step targeting something else, which would strand the player mid-statement — and a step targeting an option the reveal has hidden would deadlock outright. A tutorial paces its own reading. |
| `prefers-reduced-motion` | House rule from `useSpriteFrame`: show the still, don't animate. Behaviour is identical to a game without this feature. |
| Analysis opened on the same line | The modal already lists every sentence, and `requiresAnalysis` rounds force the player through it. |
| The scenario changes (`resetKey`) | The hook is not remounted on a scenario swap — only `InteractivePanel` is keyed on `debate.id`. |

**Ordering constraint**: the reveal branch wraps `TrialUI`'s `interactiveFooter`
memo, keeping Continue enabled *ahead* of `analysisGatePending`. Reversed, a `requiresAnalysis`
round deadlocks — the gate disables Continue, and a disabled Continue can never finish the
reveal. `analysisGatePending` itself is left alone because it also drives the debate-log
attention chip. Once the last sentence has landed, Continue is the phase button again and the
gate applies.

**Where the state lives** — not in `reduceWorkflow`. That reducer snapshots every field for the
undo stack (a reveal step would replay a typewriter on Back), cannot own a timer, and is kept
unaware of reduced motion / tutorials / analysis by design. The character count lives lower
still, in `TypewriterText`: `TrialUI` renders the debate log, the cast stage and the interactive
panel, none memoised — and `useTrialRoundWorkflow` returns a fresh object every render, so
memoising them would not help — meaning a `chars` state in `TrialUI` would re-render the whole
overlay ~36 times a second next to Phaser's own loop.

**Accessibility** — the filling-in text is `aria-hidden`; `WizardPanel` carries a separate
off-screen `aria-live` region, keyed on the sentence index, that announces each sentence once in
full. The statement box's own `aria-live` is dropped while the typewriter is running, or a
screen reader restarts the paragraph on every character.

---

## Round Analysis Modal (`trial/roundAnalysisModal/RoundAnalysisModal.tsx`)

A full-screen overlay opened by clicking the magnifying glass button on any history entry. Closed by clicking the backdrop or the ✕ button.

`analysis:open` / `analysis:close` carry **`analysisRoundNumber`** (the `RoundEntry.roundNumber` of the row under inspection) and **`activeRoundNumber`** (workflow round from `TrialUI`, same phase gate as `fallacyGuessBucketRoundNumber`, or `null` during `debate_intro` / `debate_complete`). Tutorials that should run only while the player is still “in” round N should filter on `activeRoundNumber`, not `analysisRoundNumber`, so opening analysis on an older log line during a later round does not match.

### NPC round view

- Lists each sentence of the NPC's statement as an individual clickable card.
- While it is the **player's active turn** (`player_choosing` or `player_confirming`) and no guess has been used for this turn yet, the player can:
  1. Click a sentence to select it.
  2. Pick a fallacy from the grid (5 per row, `fallacy_placeholder.svg` icon + label, drawn from `debate.logicalFallacies`).
  3. Click **Submit guess** to record the result.
- **One guess per player round** — `TrialUI` tracks this in `fallacyGuesses: Map<playerRoundNumber, GuessRecord>`.
- After guessing: a coloured result banner appears (green ✓ / red ✗) with the fallacy description. Sentences containing the guessed fallacy get a red tint and fallacy pills.
- When it is not the player's turn, sentence cards are still rendered but a disabled hint is shown instead of the picker.

### Player round view

- Shows the quality badge (cyan = effective, red = fallacy, grey = ineffective) and impact score.
- Displays `opt.reason` as an explanation block.
- Lists each sentence; any sentence with `logicalFallacies.length > 0` gets a red-tinted card with fallacy pills (icon + name; hover to see description).

### Guess state

```typescript
interface GuessRecord {
  npcRoundId: string;      // which NPC round was analysed
  sentenceId: string;      // sentence the player picked
  fallacyId: string;       // fallacy the player picked
  correct: boolean;
  actualFallacies: LogicalFallacy[];  // what was actually in that sentence
}
// Stored in TrialUI as:
// fallacyGuesses: Map<playerRoundNumber, GuessRecord>
```

---

## Debate event bus (`trial/utils/debateEventBus.ts`)

A typed pub/sub singleton used across the trial layer to broadcast user interactions and debate lifecycle beats. Every event name is a literal from the `EventTrigger` union in `src/types/debateEntities.ts`, and each event has a dedicated payload type in `DebateEventPayloads`. The bus enforces the pair at compile time — you cannot emit `analysis:guess_correct` with the payload shape of `round:start`.

A compile-time assertion (`_AssertKeysMatch`) keeps `EventTrigger` and `DebateEventPayloads` in lockstep: add or remove a key on one side without the other and the type check fails immediately.

### Events, payloads, and emit sites

| Event | Payload | Emitted from |
|-------|---------|--------------|
| `introduction:start` | `IntroductionStartPayload` | `TrialUI` — fires once per scenario when the `debate_intro` phase begins. Drives the onboarding tutorial overlay via `scenario.tutorials`. |
| `round:start` / `round:end` | `RoundLifecyclePayload` | `useTrialRoundWorkflow` — on `currentRoundIndex` / `gamePhase` transitions, including the step into `debate_complete`. |
| `interactive:continue` | `InteractiveContinuePayload` | `TrialUI` — the Continue footer in `debate_intro`, `npc_speaking`, `npc_responding`. |
| `interactive:confirm` | `InteractiveConfirmPayload` | `TrialUI` — the Confirm footer in `player_choosing` / `player_confirming`. |
| `interactive:statement_selected` | `InteractiveStatementSelectedPayload` | `InteractivePanel` — option click (selection only, not unselect). |
| `interactive:back` | `InteractiveBackPayload` | `InteractivePanel` — Back button. |
| `interactive:analyze` | `InteractiveAnalyzePayload` | `InteractivePanel` — the footer Analyze button, current-round only. Distinct from `debate_log:round:analyze` so a tutorial `where` filter can tell a footer click from a log-card click. |
| `round:recap:open` / `round:recap:close` | `RoundRecapTogglePayload` | `RoundRecapModal` — mount/unmount effect so any dismissal path stays balanced. |
| `debate_log:round:analyze` | `DebateLogRoundPayload` | `DebateRoundLogCard` — every `AnalyzeButton` click site. |
| `debate_log:round:shrink` / `debate_log:round:expand` | `DebateLogRoundPayload` | `DebateRoundLogCard` — per-card expand/collapse toggle. |
| `debate_log:collapse` / `debate_log:expand` | `DebateLogPanelPayload` (`roundNumber`, null outside a round) | `DebateLogToggleButton` — the whole-panel toggle, from either the chip or the log header. |
| `analysis:open` / `analysis:close` | `AnalysisOpenClosePayload` (`analysisRoundNumber`, `activeRoundNumber`, `targetKind`, `targetId`) | `RoundAnalysisModal` — mount/unmount effect; `activeRoundNumber` is passed from `TrialUI` (`fallacyGuessBucketRoundNumber`). |
| `analysis:sentence_selected` / `analysis:sentence_deselected` | `AnalysisSentenceTogglePayload` | `RoundAnalysisModal` — sentence click in the NPC view. |
| `analysis:fallacy_selected` / `analysis:fallacy_deselected` | `AnalysisFallacyTogglePayload` | `RoundAnalysisModal` — fallacy picker click. |
| `analysis:guess_submitted` | `AnalysisGuessSubmittedPayload` | `TrialUI.handleGuess` — always fires first when a guess lands. |
| `analysis:guess_correct` / `analysis:guess_incorrect` / `analysis:guess_partially_correct` | `AnalysisGuessOutcomePayload` | `TrialUI.handleGuess` — derived from the `GuessRecord`. |
| `analysis:guess_max_attempts_reached` | `AnalysisGuessMaxAttemptsPayload` | `TrialUI.handleGuess` — only when attempts run out on a non-correct guess. |
| `tutorial:start` / `tutorial:next` / `tutorial:end` | `TutorialLifecyclePayload` | `useTutorialStore` — `openTutorial` emits `tutorial:start`, `stepForward` emits `tutorial:next` when the index actually advances, `finishTutorial` emits `tutorial:end`. Payload carries `tutorialId` (from `DebateScenarioTutorialEntry.id`) and `stepIndex` so listeners can pin a specific tutorial/step via `where`. |

### API

```ts
import { debateEventBus, useDebateEvent } from '../trial/utils/debateEventBus';

// Non-React consumer (returns an unsubscribe):
const off = debateEventBus.on('round:start', (p) => {
  // p is typed as RoundLifecyclePayload
});

// Emit — payload is type-checked against the event name:
debateEventBus.emit('round:start', {
  roundNumber: 1, roundId: 'r1', kind: 'npc', type: 'opening_constructive',
});

// React consumer — inline arrows are fine (see next section):
useDebateEvent('round:start', (p) => { /* p: RoundLifecyclePayload */ });
```

`debateEventBus.once(event, listener)` fires only on the next matching emission. `debateEventBus.clear()` and `debateEventBus.listenerCount(event)` exist for tests.

### `useDebateEvent` — stable subscription under listener churn

The hook keeps exactly one bus subscription per `event` and routes calls through a `useRef`, so an inline arrow that changes identity on every render does not cause a cleanup / resubscribe cycle.

Why this matters: if a listener was re-subscribed every render, then on any render that also changed `gamePhase` or `currentRoundIndex` you would see:

1. React runs effect cleanups in source order → the listener is unsubscribed.
2. React runs effects in source order → `useTrialRoundWorkflow` emits `round:start` with zero listeners attached.
3. `useDebateEvent`'s effect finally re-adds the listener — one render too late.

Routing through a ref means the subscription is installed once on mount and the latest closure is always visible via `listenerRef.current`. No caller-side `useCallback` is required.

### Emitting safely — never emit from a render-phase callback

`debateEventBus.emit(...)` is synchronous: every subscriber runs on the emitter's stack before `emit` returns. Some of those subscribers (notably `useScenarioTutorials`) synchronously call `useTutorialStore.getState().openTutorial(...)`, which in turn triggers a zustand `set(...)` and schedules a re-render of `TutorialOverlay`. If you emit from somewhere that React considers "render phase", that downstream re-render schedule lands while a different component is still rendering and React logs:

> Cannot update a component (`TutorialOverlay`) while rendering a different component (`NpcRoundAnalysis`). To locate the bad setState() call inside `NpcRoundAnalysis`, follow the stack trace as described in https://react.dev/link/setstate-in-render

Render-phase callbacks include:

- **The body of a component function** — anything that runs top-to-bottom during `render`.
- **`useMemo` / `useCallback` factories**.
- **Functional `setState` updaters** — the `(prev) => next` form. React may re-run these during render (e.g. on concurrent bail-out or under `StrictMode` double-invocation), so they must be pure.
- **`useReducer` reducers**, for the same reason.
- **Render-time side effects inside JSX** (e.g. calling `emit` from a `.map` callback that runs in render).

Safe places to emit:

- **DOM event handlers** (`onClick`, `onChange`, …) — they run after render has committed.
- **`useEffect` / `useLayoutEffect` bodies and their cleanups** — same.
- **Timers, promises, bus callbacks, and other async continuations**.
- **Imperative code in non-React modules** (e.g. `useTrialRoundWorkflow` transitioning a round).

#### Pattern: if you need both a state update and an emit, emit *outside* the updater

```ts
// BAD — emit runs inside a functional updater, i.e. during render.
const handleFallacySelect = useCallback((fallacyId: string) => {
  setBySentence((prev) => {
    // ...compute copy...
    debateEventBus.emit('analysis:fallacy_selected', { /* ... */ }); // ❌ render-phase emit
    return copy;
  });
}, [/* deps */]);
```

```ts
// GOOD — compute from the closure, call setState with the result, then emit.
const handleFallacySelect = useCallback((fallacyId: string) => {
  const cur = bySentence[sid] ?? [];
  // ...decide the transition from `cur`...
  setBySentence({ ...bySentence, [sid]: [...cur, fallacyId] });
  debateEventBus.emit('analysis:fallacy_selected', { /* ... */ }); // ✅ event-handler scope
}, [bySentence, /* ...other deps */]);
```

Trade-off to accept: dropping the functional updater means adding the state value (here `bySentence`) to the `useCallback` dependency list, so the handler re-creates when that state changes. That is cheaper than a render-phase violation, and in practice the identity change is invisible to unmemoized children.

If a functional updater is genuinely required (e.g. to coalesce rapid updates against the latest state), stage the emit as data during the updater and fire it from the surrounding scope once `setState` returns — but prefer the simple shape above.

This rule is not tutorial-specific. It applies to any emit whose listener chain ends in a React state update — including future zustand stores, context providers, or `useState` consumers wired through `useDebateEvent`.

---

## Scenario tutorials (`DebateScenarioJson.tutorials`)

The `tutorials` field on `DebateScenarioJson` declares overlay tutorials that are wired to bus events. Each entry pairs a `DebateTutorialJson` with a typed trigger — an event name plus an optional payload filter — and is opened via `useTutorialStore` when its condition matches.

### Types

```ts
// From src/react/trial/utils/debateEventBus.ts
export type DebateTutorialTrigger = {
  [E in EventTrigger]: {
    event: E;
    where?: DeepPartial<DebateEventPayloads[E]>;
  };
}[EventTrigger];

// From src/types/debateEntities.ts
export interface DebateScenarioTutorialEntry {
  id?: string;                      // dedup key (falls back to array index)
  trigger: DebateTutorialTrigger;
  tutorial: DebateTutorialJson;
}
```

`DebateTutorialTrigger` is a mapped discriminated union over every `EventTrigger` literal. Once you pick `event`, the `where` field is typed strictly against the corresponding payload — a wrong key or a mismatched value red-squiggles at author time. `DeepPartial` recurses into nested objects, so filters can pin any subset of keys at any depth.

### Matching semantics

`debatePayloadSatisfies(spec, actual)` is the structural subset matcher used by the runtime:

- Primitives compare with `===`.
- Objects match when every explicitly-set key in `spec` matches; omitted keys and `undefined` values are wildcards.
- Arrays require identical length and per-index match.

`debateTutorialTriggerMatches(trigger, event, payload)` first checks the event name, then calls `debatePayloadSatisfies` when `where` is present.

### Runtime — `useScenarioTutorials(debate.tutorials)`

Called from `TrialUI`. It subscribes once per unique event referenced in the tutorials array. On each emission it walks the entries for that event in author order, runs the matcher, and opens the first match via `useTutorialStore.getState().openTutorial(...)`.

- **Fires once per scenario run.** After an entry fires, its dedup key (either `entry.id` or `__idx_<n>`) is stored in a ref-backed `Set` that lives for the hook's mount. Swapping to a different `tutorials` reference (e.g. loading another scenario) resets the set.
- **First match wins per emission.** If several entries target the same event and all pass their `where` filters, only the first in author order opens.
- **Does not stomp an open overlay.** If any tutorial is already on screen, matches are dropped rather than queued.
- **No duplicate subscriptions.** One bus listener per unique `event` name, installed on mount and torn down on unmount.

### Authoring example

```json
"tutorials": [
  {
    "id": "analysis-select-sentence",
    "trigger": { "event": "analysis:open", "where": { "activeRoundNumber": 1 } },
    "tutorial": {
      "steps": [
        { "message": "Select first a sentence that you think has a logical fallacy." }
      ]
    }
  },
  {
    "id": "spot-false-dilemma",
    "trigger": {
      "event": "analysis:fallacy_selected",
      "where": { "fallacyId": "false-dilemma" }
    },
    "tutorial": {
      "steps": [
        { "message": "You are spotting the false dilemma fallacy on the selected sentence. Click 'Spot Fallacies' to submit your guess." }
      ]
    }
  }
]
```

### Onboarding tutorial (`introduction:start`)

The onboarding overlay that used to live on a dedicated `introTutorial` field is now authored as a regular `tutorials` entry with `trigger.event === 'introduction:start'`. `TrialUI` emits `introduction:start` (with the scenario id as payload) once per scenario when the `debate_intro` phase begins, and `useScenarioTutorials` opens the matching entry via `useTutorialStore`. While any tutorial overlay is open during `debate_intro`, the Continue footer is disabled and the wizard panel hides the intro body — the same gating that was previously tied to the legacy `introTutorial` field.

### Gotcha: emits that trigger tutorials run synchronously

`useScenarioTutorials` handles bus events synchronously and calls `openTutorial(...)` on the tutorial store in the same tick. That scheduling hits `TutorialOverlay` immediately, so any emit at the authoring site must come from event-handler or effect scope — not from a render-phase callback (function component body, `useMemo` / `useCallback` factory, functional `setState` updater, `useReducer` reducer). See **Debate event bus → Emitting safely** above for the full rule and an example pattern.

---

## Farm tutorials (`src/data/farmTutorials.ts`)

The same `TutorialOverlay` can run on the farm. Entries live in `farmTutorials.ts`, not on a scenario: each has an `id`, a `triggerWhen: GameCondition[]`, and a `DebateTutorialJson`. `useFarmTutorials` (called from `FarmUI`) opens the first unmet entry whose conditions are satisfied, skips while a talk is open, and writes `progressStore.completedTutorials` on Got it so a reload does not replay it.

Field Notes targets (`codex_open`, `codex_tab`, `codex_tabs`, `codex_content`, `codex_close`) are stamped as `data-tutorial-*` on `FarmUI` and `CodexOverlay`. A step that points at the opening button keeps the Codex **closed**; a step that points at tabs or content opens it on `next` before the highlight lookup (same reason the Debate Log is expanded before a log target). `interactionMode: 'highlight'` spotlights a control without freezing sibling Field Notes tabs — overlay Continue still works.

---

## Scroll fade overlays (`useScrollFade` + `ScrollFadeContainer`)

`useScrollFade` (in `hooks/useScrollFade.ts`) — `useScrollFade(ref)` returns `{ top: boolean, bottom: boolean }`, updated via a `scroll` event listener and a `ResizeObserver`. CSS `transition: opacity 0.3s ease` on the overlay classes handles the animation.

**`ScrollFadeContainer`** (`trial/components/ScrollFadeContainer.tsx`) wraps the scrollable element and the two fade overlays. It calls `useScrollFade` on the ref attached to the inner scroll div. Optional props:

- **`scrollRef`** — pass an external ref when the parent needs the same element (e.g. `FeedbackPanel` auto-scroll).
- **`isModal`** — uses the stronger modal gradient tint (matches `RoundAnalysisModal` background).

Equivalent structure (conceptually; actual class names come from CSS modules such as `trialShared.module.scss`):

```tsx
<div className="trialScrollFadeWrap">
  <div className="scrollFadeOverlay fadeTop" style={{ opacity: fade.top ? 1 : 0 }} />
  <div className="trialFeedbackScroll" ref={ref}>…</div>
  <div className="scrollFadeOverlay fadeBottom" style={{ opacity: fade.bottom ? 1 : 0 }} />
</div>
```

**Why not `mask-image`?** CSS `mask-image` gradient values cannot be transitioned — browsers treat them as discrete. Animating `opacity` on a separate element is the standard workaround.

### Applied to

| Container | Location |
|-----------|----------|
| Feedback scroll area | `trial/panels/FeedbackPanel.tsx` (`ScrollFadeContainer` + optional `scrollRef`) |
| Interactive scroll area | `trial/panels/InteractivePanel.tsx` (`ScrollFadeContainer`) |
| Modal body | `trial/roundAnalysisModal/RoundAnalysisModal.tsx` (`ScrollFadeContainer` with `isModal`) |

---

## Shared helpers (`trial/utils/trialHelpers.ts`)

| Function | Role |
|----------|------|
| `getSpeakerName(debate, speakerId)` | Display name from `characters` or capitalised id. |
| `qualityColor` / `qualityLabel` | Colours and labels for `PlayerOption.quality` (used in history, modal, etc.). |
| `statementText(sentences)` | Joins `Sentence` text with spaces. |
| `revealChunks(string \| Sentence[])` | The one entry point for wizard-reveal chunking. `Sentence[]` maps 1:1; prose goes through `splitIntoSentences`. Trims and drops empties. |
| `splitIntoSentences(text)` | Reading chunks for a prose source (`scenario.introduction`, farm talk beats). Folds short or mid-sentence fragments back into their predecessor. Reach for `revealChunks` instead. |
| `scoreColor(score)` | Cyan / red / neutral for numeric totals and impacts. |
| `statementTypeLabel(type)` | Human-readable title for `StatementType` strings. |

---

## CSS conventions

### Global entry (`index.scss`)

- Minimal reset, `#app` / overlay layout, **`.react-root`** (React subtree).
- **`@include ui-colors.color-palette` on `html`** — defines `--ui-color-*` for the whole document (including `body`). Use `var(--ui-color-*)` in any SCSS or plain CSS that loads after these rules.
- **`@include ui-typography.font-scale` on `.react-root`** — defines `--ui-font-*` only under the overlay root so `rem` in typography tokens still tracks the same subtree as `App.tsx` stage sizing.
- Imported by `ReactApp.tsx`.

### Shared tokens (fonts and colours)

| Mechanism | SCSS | TS / inline `style` |
|-----------|------|---------------------|
| Font scale | [`uiTypography.scss`](uiTypography.scss) — `@mixin font-scale` | [`uiFont.ts`](uiFont.ts) — `uiFont.body`, `uiFont.display`, etc. (`var(--ui-font-*)`) |
| Colour palette | [`uiColors.scss`](uiColors.scss) — `@mixin color-palette` | [`uiColor.ts`](uiColor.ts) — `uiColor.textBody`, `uiColor.accent`, `uiColor.danger`, etc. (`var(--ui-color-*)`) |

**When to use what**

- In **`.module.scss`**, prefer `var(--ui-color-*)` and `var(--ui-font-*)` instead of duplicating hex/rgba or parallel `rem` ladders.
- In **TSX** inline styles, import `uiFont` / `uiColor` so runtime values stay tied to the same custom properties.
- **`trial/utils/trialHelpers.ts`** — `qualityColor` and `scoreColor` return `uiColor.*` entries (semantic: info / danger / neutrals), not raw literals.

**File-local colours** — If a value is only used inside one module (one-off gradient stop, shadow, or layout tint), define **`$scssVariables` at the top** of that `.module.scss` and reference them below. Do not add a global `--ui-color-*` unless the same value appears in more than one place.

### Trial and screens

- **CSS modules** under `trial/`, `screens/`, etc. (e.g. `trial/panels/TrialPanels.module.scss`, `trial/trialShared.module.scss`, `trial/roundAnalysisModal/RoundAnalysisModal.module.scss`, `TrialLayout.module.scss`). Class names in source are camelCase (e.g. `trialScrollFadeWrap`); the compiled DOM may use hashed names.
- **Trial panel chrome** — outer panels use `--ui-color-surface-trial-panel` (`uiColor.surfaceTrialPanel` in `TrialLayout.tsx`); inner areas and modals use the overlay/surface tokens in `uiColors.scss` (e.g. `--ui-color-surface-modal`, scroll-fade neutrals).

### Other rules

- Native scrollbars are hidden everywhere with `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }` (Chrome/Safari/Edge). Scrolling still works; only the track is hidden.
- `scrollbar-gutter: stable` is **not** used (it would reserve space for a hidden bar).
- **Font sizing** — `rem` tracks a responsive root `font-size` set by `App.tsx` based on the canvas width. Typography tokens (`--ui-font-*`) are applied on `.react-root` alongside that scale.

---

## Adding new content

To add a new debate scenario, author a `DebateScenarioJson` object (or equivalent JSON file) and pass it to `<TrialUI debate={…} />`. No changes to the state machine or layout are needed for content-only additions.

Remember to:
- Populate `logicalFallacies` at the top level (used by the analysis modal picker).
- Add a `reason` string to every `PlayerOption` (shown in the player-round analysis view).
- Annotate each `Sentence` with the appropriate `logicalFallacies` entries where applicable.

To change the turn structure or scoring, edit `hooks/useTrialRoundWorkflow.ts`. The types that govern valid round shapes live in `src/types/debateEntities.ts`.

To add a new UI block inside a trial panel, prefer extending the relevant panel under `trial/panels/` or a small component under `trial/components/` rather than growing `screens/TrialUI.tsx`.
