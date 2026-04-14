# AGENT.md — React overlay layer

This document describes the React UI layer under `src/react/` with a focus on the Trial/debate screen (`TrialUI.tsx`) and its supporting files.

## Files at a glance

| File | Purpose |
|------|---------|
| `ReactApp.tsx` | Scene-keyed switch: renders `MainMenuUI`, `TrialUI`, or `BoilerPlateUI` based on the active Phaser scene. |
| `ReactRoot.tsx` | Positions the overlay over the Phaser canvas and syncs its size on resize. |
| `MainMenuUI.tsx` | Overlay shown while the `MainMenu` scene is active. |
| `BoilerPlateUI.tsx` | Fallback overlay for scenes without a dedicated UI. |
| `TrialUI.tsx` | Main debate overlay (see below). |
| `trial/TrialLayout.tsx` | Three-column layout shell used by `TrialUI`. |
| `trial/useTrialRoundWorkflow.ts` | Reducer hook that owns the entire debate state machine. |
| `trial/RoundAnalysisModal.tsx` | Modal overlay for per-round analysis and fallacy guessing (see below). |
| `trial/useScrollFade.ts` | Hook that tracks scroll edge state; drives animated fade overlays on scrollable containers. |
| `hooks/useGame.ts` | Utilities around the `GameManager` and the Zustand store. |
| `index.css` | All CSS for the React layer (no Tailwind). |

---

## ⚠️ Critical: pointer-events architecture

`.react-ui-overlay` (the root wrapper in `App.tsx`) has **`pointer-events: none`**. This **inherits to every descendant**. Panels re-enable pointer events with `pointer-events: auto`, but any **new interactive element** (modal overlay, custom popup, tooltip, etc.) that does not sit inside an existing panel **must explicitly set `pointer-events: auto`** on itself, or all click/hover/focus events will silently fall through to the Phaser canvas.

This caused the round analysis modal to be completely non-interactive until `pointer-events: auto` was added to `.trial-modal-overlay`.

---

## TrialUI — overview

`TrialUI` is the React overlay rendered when the `Trial` Phaser scene is active. It receives a single `debate` prop of type `DebateScenarioJson` (see `src/types/debateEntities.ts`) and drives the full debate interaction with no Phaser involvement.

```tsx
<TrialUI debate={scenarioData} />
```

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

`useTrialRoundWorkflow` (in `trial/useTrialRoundWorkflow.ts`) maintains a `GamePhase` enum and an undo-capable history stack. The phases and their transitions are:

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
    ▼
npc_responding  (only if the round has opponentResponses)
    │  player clicks Continue
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
| `activeOpponentResponse` | The `OpponentResponse` matched to the confirmed option (during `npc_responding`). |
| `completedRounds` | Array of `CompletedRound` records for all past player turns. |
| `totalScore` | Running sum of `impact` values from confirmed options. |
| `maxPossibleScore` | Sum of the best `impact` across every player round (for a score display). |
| `canUndo` | `true` only during `player_confirming` — the Back button is enabled. |
| `wizardMessage` | Human-readable guidance string for the current phase. |
| `dispatch` | Action dispatcher (`continue`, `select_option`, `confirm_option`, `undo`). |

---

## Three-panel layout

`TrialLayout` (in `trial/TrialLayout.tsx`) arranges three named slots side-by-side. `TrialUI` populates them:

### Feedback panel (left)

- Shows the `introduction` text (if present) at the top, always visible.
- Displays the current **round counter** (`Round N / total`) and **score** (coloured cyan for positive, red for negative).
- Below those, renders a scrollable **history** of all completed rounds: NPC statements and player choices (with quality, impact, and first sentence), plus any NPC responses.
- Each history entry has a **magnifying glass button** (bottom-right corner, `src/static/icons/magnifying.svg`) that opens the `RoundAnalysisModal`. The button turns **green** if the player correctly guessed a fallacy in that NPC round, or **red** if the guess was wrong.
- The panel **auto-scrolls to the bottom** whenever `currentRoundIndex` increases (new history content is added), using a `useEffect` + `scrollTo`.

### Wizard panel (centre)

- Displays `wizardMessage` — a single contextual hint that tells the player what to do next (e.g. "Read the opponent's statement, then click Continue").

### Interactive panel (right)

Content depends on `gamePhase`:

| Phase | Rendered content |
|-------|-----------------|
| `npc_speaking` | The NPC's full statement text. |
| `player_choosing` | Three `ChoiceButton` elements labelled A / B / C. |
| `player_confirming` | The full text of the selected option plus a reminder that confirming is irreversible. |
| `npc_responding` | The NPC's response matched to the confirmed option. |
| `debate_complete` | A "debate finished" message with the final score. |

The panel footer always shows **Back** (enabled only in `player_confirming`) and a context-sensitive **Continue / Confirm** button.

---

## Round Analysis Modal (`RoundAnalysisModal.tsx`)

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

## Scroll fade overlays (`useScrollFade`)

All scrollable containers in the trial UI use animated fade overlays to indicate hidden content above/below.

### Pattern

Each scrollable area is wrapped in `.trial-scroll-fade-wrap` (a `position: relative; flex: 1` div) with two sibling `.scroll-fade-overlay` divs (absolutely positioned at top and bottom). Their `opacity` is controlled via inline style:

```tsx
<div className="trial-scroll-fade-wrap">
  <div className="scroll-fade-overlay top" style={{ opacity: fade.top ? 1 : 0 }} />
  <div className="trial-feedback-scroll" ref={ref}>…</div>
  <div className="scroll-fade-overlay bottom" style={{ opacity: fade.bottom ? 1 : 0 }} />
</div>
```

`useScrollFade(ref)` returns `{ top: boolean, bottom: boolean }`, updated via a `scroll` event listener and a `ResizeObserver`. CSS `transition: opacity 0.3s ease` on `.scroll-fade-overlay` handles the animation.

**Why not `mask-image`?** CSS `mask-image` gradient values cannot be transitioned — browsers treat them as discrete. Animating `opacity` on a separate element is the standard workaround.

### Applied to

| Container | Location |
|-----------|----------|
| `.trial-feedback-scroll` | `TrialUI.tsx` |
| `.trial-scroll-area` (interactive panel) | `TrialUI.tsx` |
| `.trial-modal-content` | `RoundAnalysisModal.tsx` |

---

## CSS conventions

All styling is in `src/react/index.css`. Key conventions:

- All trial UI classes are prefixed `.trial-`.
- Native scrollbars are hidden everywhere with `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar { display: none }` (Chrome/Safari/Edge). Scrolling still works; only the track is hidden.
- `scrollbar-gutter: stable` is **not** used (it would reserve space for a hidden bar).
- Font sizes use `rem` values tied to a responsive root `font-size` set by `App.tsx` based on the canvas width (so `1rem` scales with the viewport).
- Color palette: cyan `#22d3ee` / `#67e8f9` for positive/effective; red `#f87171` for fallacy/negative; white at various opacities for text hierarchy.
- Panel background: `#3a3a3a` (from `TrialLayout`) + `rgba(0,0,0,0.25)` inner panel = effectively `~#2b2b2b`. Scroll fade overlays use `rgba(20,20,20,0.88)` to approximate this.
- Modal background: `rgba(10,12,18,0.96)` with a blurred backdrop.

---

## Adding new content

To add a new debate scenario, author a `DebateScenarioJson` object (or equivalent JSON file) and pass it to `<TrialUI debate={…} />`. No changes to the state machine or layout are needed for content-only additions.

Remember to:
- Populate `logicalFallacies` at the top level (used by the analysis modal picker).
- Add a `reason` string to every `PlayerOption` (shown in the player-round analysis view).
- Annotate each `Sentence` with the appropriate `logicalFallacies` entries where applicable.

To change the turn structure or scoring, edit `useTrialRoundWorkflow.ts`. The types that govern valid round shapes live in `src/types/debateEntities.ts`.
