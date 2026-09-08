# Architecture

How the pieces fit together. Read this before changing anything structural; the
per-layer guides ([`AGENTS.md`](../AGENTS.md), [`src/react/AGENTS.md`](../src/react/AGENTS.md),
[`farm_overworld.md`](./farm_overworld.md)) go deeper on one area each.

---

## The shape of the running app

Phaser and React are **siblings**, not nested. Both are absolutely positioned over the same
letterboxed 16:9 stage and share its coordinate space.

```
#app                         100vw × 100vh, flex-centred, overflow hidden
└ #app-stage-16x9            the letterbox: min(100vh, 100vw*9/16) tall
   ├ #phaser-parent          position: absolute; inset: 0
   │  └ <canvas>             Phaser, 1920×1080, Scale.FIT + CENTER_BOTH
   ├ .react-ui-overlay       position: absolute; inset: 0; z-index: 1
   │  │                      ⚠ pointer-events: none
   │  └ .react-root          mirrors the canvas margins/size
   │     ├ MainMenuUI | TrialUI | FarmUI | BoilerPlateUI
   │     ├ TutorialOverlay   (portals to document.body)
   │     └ CodexOverlay      (Field Notes; absolute to the stage, not a scene)
   └ ChromeAndroidFullscreenButton
```

Three consequences that catch people out:

1. **The canvas is always full-stage and never hidden.** `TrialUI`'s "game hole" is just an
   empty `pointer-events: none` div — it is *not* a clip. A Phaser scene left running while
   the Trial UI is up paints behind the panels, not only in the hole. The hole spans the
   **full stage width** across the top band (`TRIAL_STAGE_HOLE`, 1920×540); when the player
   expands the Debate Log it paints *over* the right 3fr of the cast rather than the cast
   re-laying out, so the rightmost animal of a 2-3 strong cast is hidden while the log is
   open. That is deliberate — the stage rect is a compile-time constant, and nothing tells
   Phaser how much room it has.
2. **`pointer-events: none` inherits to every descendant of the overlay.** Any new
   interactive element must set `pointer-events: auto` on itself or its clicks fall through
   to the canvas. This is the single most common bug in this codebase.
3. **`rem` tracks the stage width.** `App.tsx` sets the root font size to
   `16 × (stageWidth / 1920) ^ 1.28`, clamped to 5–28px, on every resize. So `rem` in the
   React UI scales with the game, and `px` does not. Prefer `rem`.

---

## Who owns what

| Concern | Owner |
|---|---|
| Terrain, collision, movement, camera | Phaser (`Farm` scene) |
| Everything the player reads or clicks | React |
| Debate rules, scoring, analysis grading | React (`useTrialRoundWorkflow`, `TrialUI`) |
| Which screen is showing | Phaser scene key, mirrored into `gameStore` |

The debate rules, scoring and UI are **entirely React**. The `Trial` Phaser scene draws only
a backdrop and the animated animal cast (`CharacterStage` in React labels it and reacts to
who's speaking) — see [characters-and-animations.md](./characters-and-animations.md).
`CharacterStage`'s nameplates place each label at `(i + 1) / (n + 1)` of the hole width, the
same slot formula `Trial.ts` uses for the sprites; the two are a mirrored contract like
`TRIAL_STAGE_HOLE` itself, and drift shows up as a label floating off its animal.

---

## Scenes and routing

Registered in `src/phaser/main.ts`, in order:

```
Boot → Preloader → MainMenu → Farm → Game → Trial → GameOver
```

`Boot` and `Preloader` are template plumbing. `Game` and `GameOver` are unused template
stubs. The live ones are **MainMenu**, **Farm** and **Trial**.

Routing is a one-way mirror:

```
scene.create() ──EventBus.emit('current-scene-ready', this)──► gameStore.currentScene
                                                                       │
                                    ReactApp switches on that string ◄──┘
```

So **the Phaser scene key decides which React overlay renders.** Add a scene and you must
add a `case` in `ReactApp.tsx`, or it falls through to `BoilerPlateUI` and paints the
boilerplate over your scene.

`Boot` and `Preloader` never emit, which is why `currentScene` sits at its initial
`'Boot'` until `MainMenu` reports in.

That first emit is also the **readiness signal**. `isGameReady` means "a playable scene has
run `create()`", not "a `Phaser.Game` object exists" — the constructor returns in
microseconds while `Boot`/`Preloader` are still fetching the backdrop, logo and star.
Character atlases are **not** part of that wait: each playable scene queues only the
animals it uses (`src/phaser/animals/animalPacks.ts`) in its own `preload()`. `ReactApp`
renders `GameLoadingScreen` (which covers the stage and takes pointer events) until the
menu reports in, and again while `isSceneLoading` is true so a Farm / Gallery click cannot
start a second scene alongside a pack that is still downloading. Before the boot gate
existed, an early menu click ran `game.scene.start('Farm')` alongside the loading
`Preloader` — the Farm came up with placeholder circles for animals, and
`Preloader.create()` then started `MainMenu`, leaving the menu overlay painted over the
running Farm.

Loading progress reaches React the same way: `Boot` and `Preloader` mirror their loaders
onto `boot-progress` via `src/phaser/bootProgress.ts`; a later scene pack uses
`scene-load-progress`. The progress bar and the interaction gate read the same store
field (`loadProgress`), so they cannot disagree.

> **Switching scenes:** use `GameManager.switchScene(key)`. It goes through the *running
> scene's* ScenePlugin so the old scene stops. `game.scene.start(key)` (the SceneManager)
> only starts the target and leaves the caller running — see `farm_overworld.md`.

---

## State: eight stores, two buses

Nothing here is Redux or Context. Eight zustand stores, plus two event emitters that do not
know about each other.

| Store | Scope | Persisted |
|---|---|---|
| `gameStore` | Phaser game/scene refs, `currentScene`, `activeDebateId`, `returnSceneKey`, player position | no |
| `tutorialStore` | The open tutorial overlay: steps, index, and the interaction gate | no |
| `farmStore` | Overworld ↔ React handoff: which animal is nearby, which one you are talking to | no |
| `trialStageStore` | Debate ↔ Phaser handoff: which speaker the `Trial` scene's cast should react to | no |
| `debateLogStore` | Whether the Trial's Debate Log is expanded or collapsed to its recap chip | no |
| `progressStore` | Which encounters are finished, whether Level 1 has been started | **yes** — `localStorage`, `the-farm-progress` |
| `codexStore` | Known fallacies, spotted fallacies, dialog flags | **yes** — `localStorage`, `the-farm-codex` |
| `codexUiStore` | Whether Field Notes is open, and which section | no |

`codexStore` and `codexUiStore` are split so a UI flag does not ride along on every persisted
write. `SpottedFallacy` stores ids only (`fallacyId`, `scenarioKey`, `statementId`,
`sentenceId`) — never prose — because saved data outlives the copy that wrote it.

Everything else in a debate — the chosen options, the fallacy guesses, the Insight balance —
is **component-local `useState` in `TrialUI`** and is discarded when it unmounts. That is
deliberate: a debate is a single session. It also means anything that must survive a scenario
belongs in a store, not a hook.

The two buses:

| Bus | Events | Typed | Used for |
|---|---|---|---|
| `src/phaser/EventBus.ts` | 5 | no | `current-scene-ready`, `game-ready`, `game-destroyed`, `boot-progress`, `scene-load-progress` |
| `src/react/trial/utils/debateEventBus.ts` | 28 | yes | every debate interaction, and the trigger system for scenario tutorials |

They are unrelated and must not be confused. The Phaser bus exists only to tell React which
scene is up. The debate bus is a typed pub/sub with a compile-time assertion keeping its
event union and payload map in sync — it is the extension seam for anything that wants to
observe a debate.

> `debateEventBus.emit` is **synchronous**: subscribers run on the emitter's stack. Never
> emit from inside a React render or a `setState` updater — `src/react/AGENTS.md` explains
> the failure mode.

---

## Content flow

All game content is authored as data and bundled — nothing is fetched at runtime.

```
src/data/debates/*.json          one file per encounter
        │  statically imported
        ▼
src/data/levels.ts               the registry: DebateScenarioKey union,
        │                        LEVEL_1_SCENARIOS, LEGACY_SCENARIOS, DEBATES
        ├──► MainMenuUI          renders a button per entry
        └──► ReactApp            DEBATES[activeDebateId] → <TrialUI debate={…} />

src/data/farmMap.ts              zones + NPCs; NPC.scenarios is typed
        │                        DebateScenarioKey, so the wiring is compile-checked
        └──► Farm scene
```

`levels.ts` is the single place to register a scenario — it owns the key union, the lookup
and the menu ordering. Adding an encounter is one edit there plus the JSON file. Overworld
gates live on `ScenarioEntry.requires`; the menu lists every entry ungated, which is what
makes the ladder testable without replaying the farm.

---

## Conditions, gates, and Field Notes

One vocabulary, two consumers. `GameCondition` (`src/utils/gameConditions.ts`) is a
discriminated union — a fallacy the player knows, a fallacy they have spotted, an encounter
they have finished, or a named dialog flag. The same predicate gates a Talk button
(`ScenarioEntry.requires`) and a debate option (`PlayerOption.unlockConditions`). Evaluate
it with `isConditionMet` / `areConditionsMet`; React subscribers go through
`useGameConditions.ts` so a store write re-renders. Prefer a `dialog_flag` over
`encounter_completed` when the gate is "this conversation happened" — a flag carries
authored copy for the locked-button hint and for the Codex.

Finishing an encounter goes through `applyEncounterRewards` (`src/utils/encounterRewards.ts`):
it marks the scenario complete *and* grants `teachesFallacies` / `setsDialogFlags` in one
write, so a two-part gate can never be half-written. Rewards land on leaving a finished
encounter, not on reaching the round that explains the fallacy. Spotting a fallacy in the
analysis modal also marks it known (`recordSpottedFallacy`) — spotting one in the wild is
strictly more than being told it exists.

**Field Notes is a React overlay, not a Phaser scene.** Mounted globally in `ReactApp`
next to `TutorialOverlay`. Routing to a Codex scene would tear down the overworld (and
Rue's position with it) just to read a list. It is `absolute` on the letterboxed stage,
`pointer-events: auto` on its root, `z-index` above the trial modals.

A gated encounter is still *offered*, by default — the animal talks, and only the Talk
button is locked. Set `gateTalk` on the NPC to refuse the conversation itself (Hetty)
until the next encounter's `requires` are met. `Farm.ts` `tryInteract` and the overworld
prompt both go through `farmNpcTalkLocked`. Being told "not yet, and here is why" is
content; a silent animal without `gateTalk` is a bug report.

**All user-visible fixed strings go through `getLabel` in `src/data/labels.ts`** — Phaser
scenes included. Scenario prose (statements, options, introductions) lives in the JSON, not
in labels.

---

## Where things live

```
src/
  types/debateEntities.ts    the whole content schema — scenarios, rounds, options,
                             mechanics flags, tutorial triggers
  data/                      labels, the scenario registry, the farm map, the JSON,
                             dialogFlags, fallacyCatalog
  store/                     the eight zustand stores
  utils/gameManager.ts       imperative Phaser access (switchScene, getScene, …)
  utils/gameConditions.ts    GameCondition union; shared by gates and option unlocks
  utils/encounterRewards.ts  complete + teach + set flags in one write
  phaser/
    main.ts                  game config: scale, physics, scene list
    EventBus.ts              the 5-event Phaser→React bus
    bootProgress.ts          Boot/Preloader → `boot-progress`; scene packs → `scene-load-progress`
    PhaserGame.tsx           creates/destroys the game
    scenes/                  Boot, Preloader, MainMenu, Farm, Game, Trial, GameOver
    farm/                    overworld helpers (textures, input, joystick, palette)
  react/
    ReactApp.tsx             scene key → overlay switch
    ReactRoot.tsx            mirrors canvas geometry
    screens/                 one component per scene key
    trial/                   the debate UI — panels, modals, utils
    tutorial/                the overlay system and its interaction gate
    farm/                    the overworld overlay
    codex/                   Field Notes (known / spotted / dialogs)
```

---

## Build and verification

Vite 6, two configs (`vite/config.dev.mjs`, `vite/config.prod.mjs`). Dev server on **8080**.
`phaser` is split into its own manual chunk.

```
npm run dev-nolog      # dev server, no telemetry ping
npm run build-nolog    # production build
npm run lint           # eslint
npm run lint:styles    # stylelint
npx tsc --noEmit       # typecheck
```

**There is no test runner.** Changes are verified by driving the real app — the loop is
`npm run dev-nolog`, then a Playwright script that clicks and sends keys into the canvas and
screenshots the stage. Two of the worst bugs found so far (a collider offset from its
visual, and a scene switch that did not stop the old scene) produced no type error, no lint
warning and no console message; only running the game surfaced them.

Useful while debugging the overworld: set `arcade: { debug: true }` in `main.ts` to draw
every physics body outline.

### Known pre-existing breakage

- **`npx tsc --noEmit` reports 7 errors on a clean tree.** Four are
  `GameManager.whenReady` / `whenSceneReady` passing a zustand v3/v4 `(selector, listener)`
  pair to a v5 `subscribe` — the callbacks are silently dropped at runtime, so **do not use
  those two functions**. The rest are unused-`React`-import and `navigator.userAgentData`.
- **8 files fail `npm run format:check`** — template leftovers never formatted. `lint-staged`
  formats files as you touch them, so this shrinks over time.
- `Preloader` and `MainMenu` position things at 512/384 — leftovers from the template's
  1024×768 design, never updated to 1920×1080.
