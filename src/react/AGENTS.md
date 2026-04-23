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
| `hooks/useTrialRoundWorkflow.ts` | Reducer hook that owns the entire debate state machine. Also emits `round:start` / `round:end` on the debate event bus. |
| `hooks/useScenarioTutorials.ts` | Subscribes to bus events declared by `scenario.tutorials` and opens the matching overlay via `useTutorialStore` (see "Scenario tutorials" below). |
| `trial/utils/debateEventBus.ts` | Typed pub/sub singleton keyed on `EventTrigger`, plus the `useDebateEvent` React hook and tutorial-trigger helpers (`DebateTutorialTrigger`, `debatePayloadSatisfies`, `debateTutorialTriggerMatches`). |
| `trial/roundRecapModal/RoundRecapModal.tsx` | Post–player-round summary modal; closing it dispatches `continue` and advances the workflow. Emits `round:recap:open` / `round:recap:close` on mount/unmount. |
| `trial/roundAnalysisModal/RoundAnalysisModal.tsx` | Modal overlay for per-round analysis and fallacy guessing (see below). Emits `analysis:*` events for every open/close, sentence toggle, fallacy toggle, and guess outcome. |
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
    │  player clicks Continue → intro summary modal → Begin Round 1
    ▼
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
| `round:recap:open` / `round:recap:close` | `RoundRecapTogglePayload` | `RoundRecapModal` — mount/unmount effect so any dismissal path stays balanced. |
| `debate_log:round:analyze` | `DebateLogRoundPayload` | `DebateRoundLogCard` — every `AnalyzeButton` click site. |
| `debate_log:round:shrink` / `debate_log:round:expand` | `DebateLogRoundPayload` | `DebateRoundLogCard` — expand/collapse toggle. |
| `analysis:open` / `analysis:close` | `AnalysisOpenClosePayload` | `RoundAnalysisModal` — mount/unmount effect. |
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
    "trigger": { "event": "analysis:open" },
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
