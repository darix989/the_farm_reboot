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
   │     └ TutorialOverlay   (portals to document.body)
   └ ChromeAndroidFullscreenButton
```

Three consequences that catch people out:

1. **The canvas is always full-stage and never hidden.** `TrialUI`'s "game hole" is just an
   empty `pointer-events: none` div — it is *not* a clip. A Phaser scene left running while
   the Trial UI is up paints behind the panels, not only in the hole.
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
`'MainMenu'` during boot.

> **Switching scenes:** use `GameManager.switchScene(key)`. It goes through the *running
> scene's* ScenePlugin so the old scene stops. `game.scene.start(key)` (the SceneManager)
> only starts the target and leaves the caller running — see `farm_overworld.md`.

---

## State: five stores, two buses

Nothing here is Redux or Context. Five zustand stores, plus two event emitters that do not
know about each other.

| Store | Scope | Persisted |
|---|---|---|
| `gameStore` | Phaser game/scene refs, `currentScene`, `activeDebateId`, `returnSceneKey`, player position | no |
| `tutorialStore` | The open tutorial overlay: steps, index, and the interaction gate | no |
| `farmStore` | Overworld ↔ React handoff: which animal is nearby, which one you are talking to | no |
| `trialStageStore` | Debate ↔ Phaser handoff: which speaker the `Trial` scene's cast should react to | no |
| `progressStore` | Which encounters are finished | **yes** — `localStorage`, `the-farm-progress` |

Everything else in a debate — the chosen options, the fallacy guesses, the Insight balance —
is **component-local `useState` in `TrialUI`** and is discarded when it unmounts. That is
deliberate: a debate is a single session. It also means anything that must survive a scenario
belongs in a store, not a hook.

The two buses:

| Bus | Events | Typed | Used for |
|---|---|---|---|
| `src/phaser/EventBus.ts` | 3 | no | `current-scene-ready`, `game-ready`, `game-destroyed` |
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
and the menu ordering. Adding an encounter is one edit there plus the JSON file.

**All user-visible fixed strings go through `getLabel` in `src/data/labels.ts`** — Phaser
scenes included. Scenario prose (statements, options, introductions) lives in the JSON, not
in labels.

---

## Where things live

```
src/
  types/debateEntities.ts    the whole content schema — scenarios, rounds, options,
                             mechanics flags, tutorial triggers
  data/                      labels, the scenario registry, the farm map, the JSON
  store/                     the four zustand stores
  utils/gameManager.ts       imperative Phaser access (switchScene, getScene, …)
  phaser/
    main.ts                  game config: scale, physics, scene list
    EventBus.ts              the 3-event Phaser→React bus
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
