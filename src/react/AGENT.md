# AGENT.md — React overlay layer

This document describes the React UI layer under `src/react/` with a focus on the Trial/debate screen (`screens/TrialUI.tsx`) and its supporting files.

## Files at a glance

| File | Purpose |
|------|---------|
| `ReactApp.tsx` | Scene-keyed switch: renders `MainMenuUI`, `TrialUI`, or `BoilerPlateUI` based on the active Phaser scene. |
| `ReactRoot.tsx` | Positions the overlay over the Phaser canvas and syncs its size on resize. |
| `screens/MainMenuUI.tsx` | Overlay shown while the `MainMenu` scene is active. |
| `screens/BoilerPlateUI.tsx` | Fallback overlay for scenes without a dedicated UI. |
| `screens/TrialUI.tsx` | Thin orchestrator: workflow hook, modal/guess state, `TrialLayout`, `RoundRecapModal`, and `RoundAnalysisModal`. |
| `trial/TrialLayout.tsx` | Three-column layout shell used by `TrialUI`. |
| `trial/panels/FeedbackPanel.tsx` | Left column: introduction, round counter, score, history, live crossfire prompt. |
| `trial/panels/WizardPanel.tsx` | Centre column: `wizardMessage` only. |
| `trial/panels/InteractivePanel.tsx` | Right column: phase-specific content and footer (Back / Continue / Confirm). |
| `hooks/useTrialRoundWorkflow.ts` | Reducer hook that owns the entire debate state machine. |
| `trial/roundRecapModal/RoundRecapModal.tsx` | Post–player-round summary modal; closing it dispatches `continue` and advances the workflow. |
| `trial/roundAnalysisModal/RoundAnalysisModal.tsx` | Modal overlay for per-round analysis and fallacy guessing (see below). |
| `hooks/useScrollFade.ts` | Hook that tracks scroll edge state; drives animated fade overlays on scrollable containers. |
| `trial/utils/trialHelpers.ts` | Shared helpers: speaker names, quality/score colours, statement text, statement type labels. |
| `trial/utils/optionUnlock.ts` | Player-option unlock rules and resolved sentence text for locked choices. |
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
| `logicalFallacies` | `LogicalFallacy[]` | Master catalogue of all fallacies usable in this scenario. Displayed in the analysis modal's fallacy picker. |
| `rounds` | `RoundEntry[]` | Ordered list of NPC and player turns (see below). |

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
npc_speaking
    │  player clicks Continue
    ▼
[next round starts]
    │  if next round is a player round
    ▼
player_choosing
    │  player clicks one of the 3 options
    ▼
player_confirming  ◄──── Back (undo)
    │  player clicks Confirm
    ├─► npc_responding  (when the round has opponentResponses)
    │       │  player clicks Continue
    │       └──────────────┐
    └─► round_recap ◄──────┘  (also entered directly when there are no opponentResponses)
    │  player closes Round recap modal (Continue)
    ▼
[next round starts] ... until all rounds exhausted
    ▼
debate_complete
```

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
| `dispatch` | Action dispatcher (`continue`, `select_option`, `confirm_option`, `undo`). |

---

## Three-panel layout

`TrialLayout` (in `trial/TrialLayout.tsx`) arranges three named slots side-by-side. `TrialUI` passes in `FeedbackPanel`, `WizardPanel`, and `InteractivePanel` as those slots.

### Feedback panel (`trial/panels/FeedbackPanel.tsx`)

- Shows the `introduction` text (if present) at the top, always visible.
- Displays the current **round counter** (`Round N / total`) and **score** (coloured cyan for positive, red for negative).
- Below those, renders a scrollable **history** of all completed rounds: NPC statements and player choices (with quality, impact, and first sentence), plus any NPC responses.
- Each history entry has a **magnifying glass button** (bottom-right corner, `src/static/icons/magnifying.svg`) via `AnalyzeButton` that opens the `RoundAnalysisModal`. The button turns **green** if the player correctly guessed a fallacy in that NPC round, or **red** if the guess was wrong.
- The panel **auto-scrolls to the bottom** whenever `currentRoundIndex` increases (new history content is added), using a `useEffect` + `scrollTo` on the scroll ref owned by `FeedbackPanel`.

### Wizard panel (`trial/panels/WizardPanel.tsx`)

- Displays `wizardMessage` — a single contextual hint that tells the player what to do next (e.g. "Read the opponent's statement, then click Continue").

### Interactive panel (`trial/panels/InteractivePanel.tsx`)

Content depends on `gamePhase`:

| Phase | Rendered content |
|-------|-----------------|
| `npc_speaking` | The NPC's full statement text (`StatementBlock`). |
| `player_choosing` | Optional `opponentPrompt` (`StatementBlock` + `AnalyzeButton`), then three choice buttons labelled A / B / C. |
| `player_confirming` | The full text of the selected option plus a reminder that confirming is irreversible. |
| `npc_responding` | The NPC's response matched to the confirmed option (`StatementBlock` + `AnalyzeButton`). |
| `round_recap` | Same response view as `npc_responding` when a crossfire reply exists; otherwise a short note to use the recap modal. The footer **Continue** is disabled — the player advances only from the `RoundRecapModal`. |
| `debate_complete` | A "debate finished" message with the final score. |

The panel footer always shows **Back** (enabled only in `player_confirming`) and a context-sensitive **Continue / Confirm** button (disabled during `round_recap`).

---

## Round Analysis Modal (`trial/roundAnalysisModal/RoundAnalysisModal.tsx`)

A full-screen overlay opened by clicking the magnifying glass button on any history entry. Closed by clicking the backdrop or the ✕ button.

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
