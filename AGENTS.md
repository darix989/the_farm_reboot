# AGENTS.md — Repository guide for automated assistants

**Where things are and where to put new code.** This is a lookup index, not an explanation.

> **Read [`docs/architecture.md`](docs/architecture.md) first** if you need to understand
> *how the app works* — the Phaser/React sibling layout, scene-key routing, the eight stores
> and two event buses, content flow, and how to verify a change. That
> document owns the conceptual model; this one owns the file map. Where they overlap, this
> file defers to it.

## What this project is

- **The Farm** — a browser game about spotting logical fallacies in a farmyard debate. The player walks an overworld (Phaser), talks to animals, and plays debate encounters (React). See the root [`README.md`](README.md).
- Built from the [Phaser React TypeScript + Vite template](https://github.com/phaserjs/template-react-ts), extended with Zustand and scene-keyed React overlays (`MainMenu`, `Farm`, `Trial`).
- `package.json` still names the package `template-react-ts` and carries upstream template metadata.

## Tech stack

| Area | Choice |
|------|--------|
| Runtime UI | React 19 |
| Game engine | Phaser 3.90 |
| Bundler | Vite 6 (`vite/config.dev.mjs`, `vite/config.prod.mjs`) |
| Language | TypeScript 5.7 (strict, `noUnusedLocals` / `noUnusedParameters`) |
| Global UI state | Zustand (`src/store/gameStore.ts`) |
| Styling | SCSS — `src/react/index.scss` (global) + `*.module.scss` (per feature); shared **design tokens** for fonts (`uiTypography.scss` / `uiFont.ts`) and colors (`uiColors.scss` / `uiColor.ts`). Tailwind has been removed. |
| Lint | ESLint 9 + TypeScript ESLint (`eslint.config.mjs`) |
| Tests | Vitest (`*.test.ts` next to the module) |

## How to run and build

- `npm install` — install dependencies.
- `npm run dev` — Vite on port **8080**; prepends `node log.js dev` (see below).
- `npm run build` — production build to `dist/`.
- `npm run dev-nolog` / `npm run build-nolog` — same without Phaser template telemetry.
- `npm test` — Vitest unit tests (`*.test.ts` colocated with the module).
- `npm run check` — typecheck, lint, format, tests, and a production build. CI runs this.

## Source layout (authoritative)

All application code lives under **`src/`**. Cursor rule **`.cursor/rules/project-architecture.mdc`** applies:

- **React UI** → `src/react/` (components, hooks, CSS).
- **Phaser-only** (no React components) → `src/phaser/` (`main.ts`, `PhaserGame.tsx` bridge, scenes, `EventBus.ts`).
- **Shared** → `src/store/`, `src/utils/`, `src/data/` (UI copy), top-level `src/App.tsx`, `src/main.tsx`.

See also the root **README.md** for commands, structure, and the React–Phaser bridge.

```
src/
  main.tsx              # React bootstrap
  App.tsx               # PhaserGame + ReactApp siblings on the 16:9 stage
  types/
    debateEntities.ts   # DebateScenarioJson + every content type (rounds, options,
                        #   mechanics flags, tutorial triggers)
    tutorialModalLayout.ts
  data/
    labels.ts           # Central UI strings + default export getLabel()
    levels.ts           # Scenario registry: DebateScenarioKey, DEBATES, menu order
                        #   ScenarioEntry.requires is the overworld gate
    farmMap.ts          # Overworld zones + NPCs; `talkStages` on FarmNpc
    farmTalk.ts         # Sequential talk beats, keyed by `{npcId}{suffix}` (`hetty1`, `dot2`)
                        #   and `followUp:{scenarioKey}` for post-Trial pointers
    farmTutorials.ts    # Overworld overlay tutorials + FarmTutorialId
    encounterFollowUps.ts # After Trial Leave: farm talk or tutorial, then dialog flags / Next
    characters.ts       # Cast roster: name, tint, and (if any) animated `animal` sprite
    debateCast.ts        # Who's on the character stage for a scenario + their stage order
    dialogFlags.ts      # Named conversations the Codex and gates can refer to
    levelGoals.ts       # Field Notes Next tab: main spine + optional goals
    fallacyCatalog.ts   # Parsed logicalFallacies.json + id lookup
    debates/            # One JSON file per encounter
    logicalFallacies.json
  phaser/
    PhaserGame.tsx      # Creates/destroys Phaser Game, wires Zustand + EventBus
    main.ts             # Game config: scene list, scale, physics
    EventBus.ts         # Phaser→React bus (5 events)
    scenes/             # Boot, Preloader, MainMenu, Farm, Game, Trial, GameOver
    farm/               # Overworld helpers: textures, palette, input, joystick
    animals/            # Placeholder animal spritesheets: descriptors, animation
                        #   builder, AnimalAnimator, per-scene packs — see
                        #   docs/characters-and-animations.md
  react/
    AGENTS.md           # React-layer guide (TrialUI, debate workflow, event bus)
    uiTypography.scss   # @mixin font-scale → --ui-font-* on `.react-root`
    uiFont.ts           # var(--ui-font-*) for inline styles in TSX
    uiColors.scss       # @mixin color-palette → --ui-color-* on `html`
    uiColor.ts          # var(--ui-color-*) for inline styles in TSX
    ReactApp.tsx        # Scene-key → overlay switch; loading gate on isGameReady / isSceneLoading
    ReactRoot.tsx       # Overlay aligned to Phaser canvas (resize sync)
    screens/            # One overlay per scene key
      GameLoadingScreen.tsx # Boot + scene-pack progress bar (shown until ready / while loading)
      MainMenuUI.tsx
      TrialUI.tsx       # The debate (rounds, choices, analysis, score)
      FarmUI.tsx        # Overworld prompt + dialogue
      BoilerPlateUI.tsx # Fallback for unmapped scenes
    hooks/
      useGame.ts
      useTrialRoundWorkflow.ts # Reducer hook driving the debate state machine (`reduceWorkflow` is exported for tests)
      useScenarioTutorials.ts  # Opens scenario tutorials off the debate bus
      useFarmTutorials.ts      # Opens farm overlay tutorials off GameCondition triggers
      useScrollFade.ts
      useSpriteFrame.ts        # Steps a spritesheet frame index for clips played in the DOM
      useGameConditions.ts     # Subscribed ConditionContext for gates and option unlocks
    codex/                    # Field Notes overlay (next / known / spotted / dialogs)
    trial/
      TrialLayout.tsx           # 2×2 grid: full-width game hole across the top, with the
                                #   Debate Log (or its collapsed recap chip) over its right
                                #   3fr when a `log` slot is passed; Wizard / Interactive
                                #   along the bottom. Shared with farm talks (no log).
      panels/                   # Feedback, Wizard, Interactive
      roundAnalysisModal/       # Fallacy spotting
      roundRecapModal/          # Per-round summary
      introSummaryModal/
      components/               # Shared trial widgets, including TrialActionRow and
                                #   TrialChoiceButton (also used by the overworld talk)
      utils/                    # trialHelpers, optionUnlock, scenarioMechanics,
                                #   fallacy guess types/utils, debateEventBus
    tutorial/                   # Overlay, spotlight geometry, interaction gate
    farm/                       # Overworld overlay: talk screen (TrialLayout) + styles
    characters/                 # AnimalFace — the DOM dialogue portrait, used by the farm
                                #   talk Dialog panel and the debate log
  store/
    gameStore.ts        # Phaser refs, currentScene, activeDebateId, returnSceneKey
    tutorialStore.ts    # Open tutorial overlay + its interaction gate
    farmStore.ts        # Overworld ↔ React handoff (nearby / talking / pendingFollowUp)
    trialStageStore.ts  # Debate ↔ Phaser handoff: active speaker for the Trial cast
    debateLogStore.ts   # Is the Trial's Debate Log expanded, or collapsed to its recap chip
    progressStore.ts    # Completed encounters + farm tutorials + whether Level 1 has started (persisted)
    devSettingsStore.ts # Dev UI prefs (farm-talk skip button); persisted, not wiped by Reset Progress
    codexStore.ts       # Known fallacies, spotted fallacies, dialog flags (persisted)
    codexUiStore.ts     # Field Notes overlay open/section (not persisted)
  utils/
    constants.ts        # PHASER_PARENT_ID, stage design size, rem scaling, TRIAL_STAGE_HOLE
    gameManager.ts      # Static Phaser helpers (switchScene, getScene, …)
    gameConditions.ts   # GameCondition union; isConditionMet / conditionHint
    encounterRewards.ts # mark-complete + teach + flags (flags may wait for a farm follow-up)
```

## React UI design tokens (fonts and colors)

React overlays share a small token system (mirrored SCSS + TypeScript so CSS modules and inline `style` stay aligned):

- **Fonts** — [`src/react/uiTypography.scss`](src/react/uiTypography.scss) defines `@mixin font-scale`, which sets `--ui-font-*` custom properties. [`src/react/index.scss`](src/react/index.scss) applies it on **`.react-root`**. [`src/react/uiFont.ts`](src/react/uiFont.ts) exports `var(--ui-font-*)` strings for TSX.
- **Colors** — [`src/react/uiColors.scss`](src/react/uiColors.scss) defines `@mixin color-palette` with `--ui-color-*` (neutrals, borders, brand accent, status colours). It is included on **`html`** in `index.scss` so `body` and all descendants inherit tokens. [`src/react/uiColor.ts`](src/react/uiColor.ts) exports `var(--ui-color-*)` for TSX (e.g. `trialHelpers.qualityColor`, panels).
- **Per-file only** — colours or values used in a single SCSS module can stay as **`$variables` at the top** of that file instead of growing the global palette.

Details and Trial-specific styling notes: [`src/react/AGENTS.md`](src/react/AGENTS.md).

## UI copy (`getLabel`)

User-visible strings for React overlays and Phaser scenes live in one place: [`src/data/labels.ts`](src/data/labels.ts).

- **Default export** — `getLabel(label, options?)` where `label` is a key of the `LABELS` map (TypeScript type **`Labels`**).
- **Options** (`GetLabelOptions`, optional) — **`replacements`**: map placeholder keys to `string | number` (templates use `{word}` tokens, e.g. `'Round {roundNumber}'`). **`addPeriod`**: when `true`, appends a trailing `.` for TTS-style pauses; otherwise omit for normal UI copy.
- **Adding copy** — extend the `LABELS` object with a new key and string; call sites get type-checked via `Labels`.

## React ↔ Phaser integration

The model — siblings over one stage, scene key drives the overlay — is explained in
[`docs/architecture.md`](docs/architecture.md). The files involved:

| File | Role |
|---|---|
| `src/phaser/PhaserGame.tsx` | Mounts the game once; emits `game-ready` / `game-destroyed`. |
| `src/phaser/EventBus.ts` | The 5-event Phaser→React bus. Scenes emit `current-scene-ready` at the end of `create()`; `Boot`/`Preloader` emit `boot-progress`; a playable scene fetching its animal pack emits `scene-load-progress`. |
| `src/phaser/bootProgress.ts` | Mirrors `Boot`/`Preloader` onto `boot-progress`, and a scene pack onto `scene-load-progress`. |
| `src/store/gameStore.ts` | Subscribes to those events; holds `currentScene`, `currentSceneInstance`, `bootPhase`/`isGameReady`, `isSceneLoading` and `loadProgress`. |
| `src/react/ReactApp.tsx` | Switches on `currentScene` to pick the overlay. |
| `src/react/ReactRoot.tsx` | Mirrors the canvas margins/size on resize. |
| `src/utils/gameManager.ts` | Imperative access: `switchScene`, `getScene`, pause/resume. |

⚠️ **Readiness is not "the game object exists."** `isGameReady` flips only when the first
playable scene emits `current-scene-ready`; `new Phaser.Game()` returns long before
`Boot`/`Preloader` finish. Character atlases load later, per scene — `isSceneLoading`
gates the overlay while that fetch runs. Never make an overlay interactive on anything
weaker, and never call `game.scene.start()` to route — `GameManager.switchScene` goes
through the running scene and refuses to run before the game is ready (or while a pack
is still loading).

`GameManager.whenReady` / `whenSceneReady` compare against zustand v5's previous-state
argument (the v3/v4 `(selector, listener)` pair they used to pass was silently dropped) and
return an unsubscribe function — use it as your effect cleanup.

## Phaser scenes (registration order)

Defined in `src/phaser/main.ts`: **Boot** → **Preloader** → **MainMenu** → **Farm** → **Game** → **Trial** → **GameOver**. Design resolution **1920×1080**, `Scale.FIT`, centered. Arcade physics is enabled with zero gravity (the overworld uses it; the debate scenes simply never create bodies).

`Game` and `GameOver` are unused template stubs. The live scenes are **MainMenu**, **Farm** and **Trial**. Adding a scene means adding a matching `case` in `ReactApp.tsx`, or it falls through to `BoilerPlateUI` and paints over your scene — see [`docs/architecture.md`](docs/architecture.md).

## Assets and HTML

- Entry: `index.html` → `/src/main.tsx`, `#root`.
- Favicon referenced: `/favicon.png` (ensure it exists under `public/` or root when deploying).
- Template docs mention `public/assets` for static loads; add that folder as needed for `this.load.*` paths like `assets/...`.
- **Character art** — `public/assets/characters/emotions/` holds the whole-body emotion clips Phaser plays on the Trial stage, **generated** through Ludo. `public/assets/characters/faces/` holds the head-and-shoulders portraits React plays in dialogue, **cropped out of those body clips locally** by `scripts/ludo/cropFace.mjs` — free, no API. Generating portraits was tried and abandoned; do not retry it without reading the `--faces` section of the `animal-emotion-sprites` skill. See also [`docs/characters-and-animations.md`](docs/characters-and-animations.md).

## Telemetry (`log.js`)

Default `npm run dev` / `build` run `log.js`, which performs an anonymous GET to `gryzor.co` with template/package metadata (see README). Use `*-nolog` scripts or remove the hook if that must be avoided in CI or sensitive environments.

## Debate / Trial system

The Trial scene uses a turn-based debate loop driven entirely by React state. Phaser's role
is limited to drawing the animated cast behind the transparent game-hole panel — see
[`docs/characters-and-animations.md`](docs/characters-and-animations.md):

- All debate content is declared in a **`DebateScenarioJson`** value (see `src/types/debateEntities.ts`).
- The `TrialUI` overlay (see `src/react/AGENTS.md`) reads this value and drives the full interaction.
- The game state machine lives in `src/react/hooks/useTrialRoundWorkflow.ts`.
- The **Debate Log collapses as a whole**, not just its entries: collapsed (the default for
  every encounter) it is a recap chip in the stage's top-right corner — round counter, Insight
  balance and the moderator's mood — and expanded it is the panel it has always been, painting
  over the right 2fr of the full-width cast. State lives in `src/store/debateLogStore.ts`
  because the tutorial layer has to expand it *synchronously* before an overlay renders; see
  that file and `src/react/trial/utils/debateLogTutorialNeeds.ts`.
- A **Round Analysis Modal** (`src/react/trial/roundAnalysisModal/RoundAnalysisModal.tsx`) lets the player inspect any statement in the log: tag logical fallacies sentence by sentence, or review why their own line was effective or flawed. Three attempts per target by default; a correct solve pays 1 Insight, once per target. A correct tag is also written to `codexStore` (`recordSpottedFallacy`), which marks the fallacy known.
- **Field Notes (the Codex)** is a global React overlay (`src/react/codex/`), not a Phaser scene — routing to a Codex scene would tear down the overworld. It has four sections: who to talk to next (`levelGoals`), fallacies you know, fallacies you have spotted, and important conversations (`dialogFlags`). Opened from the main menu and from `FarmUI` (hidden during a talk). `pointer-events: auto` on its root.
- **Farm talks reuse the debate chrome.** `TrialLayout`, `WizardPanel`, `TrialActionRow` and `TrialChoiceButton` are shared between the debate and the overworld talk. A farm talk runs *on the Farm scene* (no `scene.start`, so `gameStore.currentScene` stays `'Farm'` and `ReactApp` needs no new case); the camera is framed into `TRIAL_STAGE_HOLE` and the log slot is omitted. Leaving a finished Trial back to the farm queues a Leave-only follow-up (`src/data/encounterFollowUps.ts`) on the same animal; `setsDialogFlags` (and therefore Field Notes Next) wait until that pointer's last beat settles.
- Authoring reference — schema, rounds, options, unlock conditions, `mechanics` flags: [`docs/encounters.md`](docs/encounters.md).
- **⚠️ Pointer-events gotcha:** `.react-ui-overlay` is `pointer-events: none`, which inherits to every descendant. Any new interactive element **must** set `pointer-events: auto` on its root, or clicks fall through to the Phaser canvas. This is the most common bug in the codebase — see [`docs/architecture.md`](docs/architecture.md) for why the layout works this way.

## Skills

- **`.claude/skills/animal-emotion-sprites/SKILL.md`** — generating, reviewing and shipping the cast's per-emotion animation clips through the Ludo.ai API. **Read this file** before touching `scripts/ludo/`, the emotion manifest, or anything under `public/assets/characters/emotions/`. Its `references/ludo-api.md` holds the API contract (including the two places the vendor's own prose docs are wrong) and its `references/measuring-animations.md` explains the quality numbers from first principles.

  These are ordinary markdown files in this repository. The `.claude/` path is only where Claude Code auto-loads them from — it does not make them unavailable to any other tool, and Cursor is pointed at the same files from `.cursor/rules/animal-emotion-sprites.mdc`.

## Extra docs in repo

- **[`docs/architecture.md`](docs/architecture.md)** — how the app fits together. The conceptual companion to this file; read it before any structural change.
- `docs/README.md` — index of the docs folder.
- `docs/encounters.md` — authoring reference for scenarios: schema, rounds, options, unlock conditions, overworld gates (`requires`), `mechanics` flags.
- `docs/farm_overworld.md` — the Phaser overworld: the Phaser/React split, the placeholder-art texture contract, how encounters are launched and returned from, how to add an animal.
- `docs/characters-and-animations.md` — how the placeholder animal spritesheets work: atlases, the weighted idle/alert behaviour model, the generated per-emotion clips and their asset pipeline (§9), and how to add a new animal.
- `docs/level_01_the_pond_motion.md` — Level 1 story bible, cast, scenario ladder and authored dialog.
- `docs/to_process/` — older design notes and integration write-ups kept for reference, not yet reconciled with what shipped (`plan_001.md`, `plan_002.md`, the two Zustand integration notes, `random_notes.md`).
- `src/react/AGENTS.md` — detailed guide to the React overlay layer and the Trial/debate workflow.

## Quick checklist for changes

- New **shared UI colour or font step** → extend `uiColors.scss` / `uiColor.ts` or `uiTypography.scss` / `uiFont.ts`, then use `var(--ui-*)` or the TS mirrors in components.
- New **overlay or menu** → `src/react/`, wire via `ReactApp.tsx` if scene-specific.
- New **scene or game logic** → `src/phaser/scenes/` (and register in `main.ts`). For overworld work — new locations, animals, or anything touching the `Farm` scene — read `docs/farm_overworld.md` first; it documents the Phaser/React split and two collision/scene-switch gotchas that do not surface as type or lint errors.
- **Cross-layer signals** → `EventBus` + optional `gameStore` actions.
- Keep **`PHASER_PARENT_ID`** in sync between the Phaser parent div and `ReactRoot` layout logic.
- New **debate content** → author a `DebateScenarioJson` JSON file under `src/data/debates/` and register it once in `src/data/levels.ts` (that file owns the `DebateScenarioKey` union, the `DEBATES` lookup and the main-menu ordering). No engine changes required.
- New **gated encounter** → set `requires` on its `ScenarioEntry` in `levels.ts`. Prefer a `dialog_flag` over `encounter_completed` when the gate is "this conversation happened" — a flag carries player-facing copy. Until it unlocks, the animal still talks: `Meet` if you have never finished one of theirs, or a replay of their last follow-up if you have. Hang the matching beats in `farmTalk.ts` (lengthening an NPC's `scenarios` list silently re-points every existing beat row).
- New **dialog flag** → add the id to `DialogFlagId` in `src/data/dialogFlags.ts`, title/body labels, and declare it on the encounter that sets it via `setsDialogFlags`. Titles are authored as instructions ("hear Hetty out at the trough") because they double as the locked-encounter hint. On a farm Leave the flags wait for the follow-up in `encounterFollowUps.ts`.
- New **post-Trial follow-up** → add an `ENCOUNTER_FOLLOW_UPS` entry (`farm_talk` or `tutorial`) and, for a talk, beats under `followUp:{scenarioKey}` in `farmTalk.ts`. Leave-only; Next moves when the last beat settles.
- A scenario can ship as a **smaller mode** than a full debate via the optional `mechanics` block (`analysisEnabled`, `showInsightPoints`, `showModeratorOpinion`, `showRoundRecap`, `showIntroSummary`, `revealChoiceAssessment`, `targetQuality`, `maxAnalysisAttempts`, and `encounterKind` — which swaps UI copy so a non-debate is not labelled "Debate Log") plus `requiresAnalysis` on an NPC round. Defaults reproduce full-debate behaviour; resolve them with `resolveMechanics()` (`src/react/trial/utils/scenarioMechanics.ts`), never off the raw scenario. Full reference in `docs/encounters.md`; `docs/level_01_the_pond_motion.md` is a worked ladder.
- **Looking at any animal's animations** → main menu → **Animation Gallery** (`AnimalGallery` scene + `AnimalGalleryUI`). Holds one clip on a loop, lists atlas and generated clips together, flags emotions with no art yet, and toggles between a crossfade and a raw cut when switching. `docs/characters-and-animations.md` §9.6.
- New **animal emotion clip** (`talking`, `doubtful`, `angry`, `thinking`, `sneaky`) → **read `.claude/skills/animal-emotion-sprites/SKILL.md`**, the operating manual for this (Claude Code loads it as a skill; every other tool can simply open the file). In short: art is generated, not hand-drawn — `npm run sprites:emotions` drives the Ludo.ai API from `scripts/ludo/emotion-manifest.json` into a gitignored review dir, and `--promote` ships the clips you keep. Needs `LUDO_API_KEY` in `.env.local`, and **costs credits per clip**, so never generate without being asked. Design rationale (and the scale/origin trap that makes an un-normalized clip render at the wrong size) is in `docs/characters-and-animations.md` §9.
- New **fixed UI string** (menus, modals, ARIA, Phaser labels) → add an entry in `src/data/labels.ts` and use `getLabel('yourKey', { replacements: { … } })` when the template has placeholders.
- New **pure rules helper** (gates, unlocks, scoring, analysis grading, workflow reducer) → colocate a `*.test.ts` next to it. `npm test` runs Vitest; `npm run check` is what CI runs.
