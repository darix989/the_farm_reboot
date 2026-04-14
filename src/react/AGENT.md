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
| `hooks/useGame.ts` | Utilities around the `GameManager` and the Zustand store. |

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
| `logicalFallacies` | `LogicalFallacy[]` | Catalogue of fallacies referenced by `Sentence` objects. |
| `rounds` | `RoundEntry[]` | Ordered list of NPC and player turns (see below). |

---

## Rounds system

`rounds` is a **sequential array** of `RoundEntry` items. Each entry is either an `NpcRoundEntry` or a `PlayerRoundEntry` (discriminated by the `kind` field). The workflow advances through this array one entry at a time.

### NPC rounds (`kind: "npc"`)

The NPC speaks. The player has **no choices** — they simply read the statement and click **Continue** to proceed to the next round.

Relevant fields: `speakerId`, `statement` (a `Statement` with one or more `Sentence` objects), `type` (`StatementType`).

### Player rounds (`kind: "player"`)

The player must pick **one of exactly three pre-authored `PlayerOption` items**. Each option has:

| Field | Type | Meaning |
|-------|------|---------|
| `quality` | `"effective" \| "ineffective" \| "logical_fallacy"` | Qualitative label shown in the history. |
| `impact` | `number` | Score delta applied when the option is confirmed (range `[-50, 50]`). |
| `sentences` | `Sentence[]` | The full text of the option. |

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
- Below those, renders a scrollable **history** of all completed rounds (NPC statements + player choices with their quality and impact, plus any NPC responses).

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

## Adding new content

To add a new debate scenario, author a `DebateScenarioJson` object (or equivalent JSON file) and pass it to `<TrialUI debate={…} />`. No changes to the state machine or layout are needed for content-only additions.

To change the turn structure or scoring, edit `useTrialRoundWorkflow.ts`. The types that govern valid round shapes live in `src/types/debateEntities.ts`.
