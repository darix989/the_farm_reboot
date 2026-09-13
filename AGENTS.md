# AGENTS.md — Repository guide for automated assistants

> **Read [`docs/architecture.md`](docs/architecture.md) first** for the conceptual model
> (Phaser/React sibling layout, scene-key routing, stores, event buses, content flow).
> This file owns the file map and agent-facing gotchas. Where they overlap, this file defers.
> **Also read [`src/react/AGENTS.md`](src/react/AGENTS.md)** for the React/Trial layer.

## What this project is

- **The Farm** — browser game about spotting logical fallacies in farmyard debates. Overworld (Phaser), talks and debate encounters (React).
- Built from the [Phaser React TypeScript + Vite template](https://github.com/phaserjs/template-react-ts), extended with Zustand and scene-keyed React overlays.

## Tech stack

| Area | Choice |
|------|--------|
| Runtime UI | React 19 |
| Game engine | Phaser 3.90 |
| Bundler | Vite 6 (`vite/config.dev.mjs`, `vite/config.prod.mjs`) |
| Language | TypeScript 5.7 (strict, `noUnusedLocals` / `noUnusedParameters`) |
| Global UI state | Zustand v5 (`src/store/`) |
| Styling | SCSS modules; shared design tokens for fonts (`uiTypography.scss`/`uiFont.ts`) and colors (`uiColors.scss`/`uiColor.ts`). No Tailwind. |
| Lint | ESLint 9 + Stylelint (SCSS) + custom scenario linter |
| Format | Prettier (single-quote, trailing comma, 100 print width) |
| Tests | Vitest (`*.test.ts` colocated); Playwright smokes in `e2e/` |

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite on **8080** (with template telemetry) |
| `npm run dev-nolog` | Vite on **8080** (no telemetry — prefer this) |
| `npm run build-nolog` | Production build to `dist/` (no telemetry) |
| `npm test` | Vitest (`*.test.ts` colocated with modules) |
| `npm run test:e2e` | Playwright Chromium smokes; auto-starts `dev-nolog` on 8080 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `src/` |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run lint:styles` | Stylelint on `src/**/*.{css,scss}` |
| `npm run lint:styles:fix` | Stylelint with auto-fix |
| `npm run lint:scenarios` | Custom scenario JSON linter (`scripts/lint-scenarios.mjs`) |
| `npm run format` | Prettier write on `src/` |
| `npm run format:check` | Prettier check (no write) |
| `npm run check` | **Full pipeline**: typecheck → lint → lint:styles → lint:scenarios → format:check → test → build-nolog |
| `npm run sprites:emotions` | Ludo.ai API — **costs credits**, never run without being asked |

**After any code change, run `npm run check`** (or at minimum: typecheck, lint, lint:styles, format:check, test).

## Critical gotchas

1. **pointer-events** — `.react-ui-overlay` is `pointer-events: none`, inheriting to all descendants. Every new interactive element **must** set `pointer-events: auto` on its root or clicks fall through to the Phaser canvas. This is the #1 bug source.

2. **Readiness** — `isGameReady` flips only when the first playable scene emits `current-scene-ready`; `new Phaser.Game()` returns long before that. `isSceneLoading` gates the overlay while per-scene character atlases load. Never make an overlay interactive on anything weaker. Never call `game.scene.start()` to route — use `GameManager.switchScene`.

3. **Zustand v5** — `GameManager.whenReady` / `whenSceneReady` compare against zustand v5's previous-state argument (the v3/v4 `(selector, listener)` pair was silently dropped). They return an unsubscribe function — use it as effect cleanup.

4. **Scene registration** — Adding a Phaser scene requires a matching `case` in `ReactApp.tsx`, or `BoilerPlateUI` paints over it.

## Source layout

```
src/
  main.tsx              # React bootstrap
  App.tsx               # PhaserGame + ReactApp siblings on the 16:9 stage
  types/                # DebateScenarioJson + content types
  data/
    labels.ts           # Central UI strings + getLabel()
    levels.ts           # Scenario registry: DebateScenarioKey, DEBATES, menu order
    farmMap.ts          # Overworld zones + NPCs
    farmTalk.ts         # Talk beats keyed by {npcId}{suffix}
    sideScenes/         # Lateral farm scene descriptors
    characters.ts       # Cast roster
    debateCast.ts       # Per-scenario stage cast
    dialogFlags.ts      # Named conversation flags
    levelGoals.ts       # Field Notes Next tab goals
    debates/            # One DebateScenarioJson file per encounter
    logicalFallacies.json
  phaser/
    PhaserGame.tsx      # Creates/destroys Phaser Game, wires Zustand + EventBus
    main.ts             # Game config: scene list, scale, physics
    EventBus.ts         # Phaser→React bus (5 events)
    scenes/             # Boot, Preloader, MainMenu, Farm, FarmSide, Game, Trial, AnimalGallery, GameOver
    farm/               # Overworld: textures, palette, input, joystick
    sideScene/          # Lateral world: layers, props, fences, actors, talk camera
    animals/            # Animal spritesheets: descriptors, animation builder, per-scene packs
  react/                # See src/react/AGENTS.md for the full guide
    screens/            # One overlay per scene key (MainMenuUI, TrialUI, FarmUI, etc.)
    hooks/              # useTrialRoundWorkflow, useGame, useScrollFade, etc.
    trial/              # TrialLayout, panels, modals, components, utils
    codex/              # Field Notes overlay
    farm/               # Overworld talk screen
    tutorial/           # Tutorial overlay + spotlight
    characters/         # AnimalFace DOM dialogue portrait
  store/                # Zustand stores (gameStore, farmStore, progressStore, codexStore, etc.)
  utils/                # constants, gameManager, gameConditions, encounterRewards
```

## Design tokens

Fonts and colors are mirrored SCSS + TypeScript so CSS modules and inline `style` stay aligned:

- **Fonts** — `uiTypography.scss` sets `--ui-font-*` on `.react-root`; `uiFont.ts` exports them for TSX.
- **Colors** — `uiColors.scss` sets `--ui-color-*` on `html`; `uiColor.ts` exports them for TSX.
- Per-file-only values can stay as `$variables` at the top of a single SCSS module.

## UI copy (`getLabel`)

All user-visible strings in [`src/data/labels.ts`](src/data/labels.ts). Add new keys to the `LABELS` object; call sites are type-checked via the `Labels` type. Supports `{word}` placeholder replacements and optional trailing period for TTS pauses.

## React ↔ Phaser integration

| File | Role |
|---|---|
| `src/phaser/PhaserGame.tsx` | Mounts the game once; emits `game-ready` / `game-destroyed` |
| `src/phaser/EventBus.ts` | Phaser→React bus (5 events) |
| `src/store/gameStore.ts` | `currentScene`, `isGameReady`, `isSceneLoading`, `loadProgress` |
| `src/react/ReactApp.tsx` | Switches on `currentScene` to pick the overlay |
| `src/react/ReactRoot.tsx` | Mirrors canvas margins/size on resize |
| `src/utils/gameManager.ts` | Imperative: `switchScene`, `getScene`, `whenReady`, `whenSceneReady` |

**Phaser scenes** (registration order in `main.ts`): Boot → Preloader → **MainMenu** → **Farm** → **FarmSide** → Game → **Trial** → **AnimalGallery** → GameOver. Bold = live. Design resolution **1920×1080**, `Scale.FIT`.

## Debate / Trial system

- Content declared as `DebateScenarioJson` (`src/types/debateEntities.ts`); `TrialUI` drives the interaction, Phaser draws the animated cast behind a transparent panel.
- State machine: `useTrialRoundWorkflow.ts` (reducer hook; `reduceWorkflow` exported for tests).
- Debate Log: collapsed by default (recap chip), expanded paints over right 2fr of cast. State in `debateLogStore.ts` (tutorial layer must expand it synchronously).
- Farm talks reuse `TrialLayout`, `WizardPanel`, `TrialActionRow`, `TrialChoiceButton` — no scene switch, `currentScene` stays `'Farm'`.
- Authoring reference: [`docs/encounters.md`](docs/encounters.md).
- Full React-layer detail: [`src/react/AGENTS.md`](src/react/AGENTS.md).

## Browser verification

- Playwright config: Chromium, 1920×1080, `prefers-reduced-motion: reduce`, auto-starts `dev-nolog` on 8080.
- Drive React via role / accessible name from `getLabel` or `data-tutorial-*` hooks. Never chase hashed CSS-module class names.
- Drive Farm movement with WASD / arrows, not canvas clicks.
- Click only controls with `pointer-events: auto`.
- Keep e2e thin (boot, menu, Trial, farm). Debate rules and grading stay in Vitest.

## Docs in repo

| Doc | When to read |
|-----|-------------|
| `docs/architecture.md` | Before any structural change |
| `docs/encounters.md` | Authoring scenarios, `mechanics` flags, unlock conditions |
| `docs/farm_overworld.md` | Overworld Phaser/React split, adding animals, collision gotchas |
| `docs/farm_side_scenes.md` | Lateral farm scenes, portals, scene descriptors |
| `docs/characters-and-animations.md` | Spritesheets, emotion clips, adding animals |
| `docs/level_01_the_pond_motion.md` | Level 1 story, cast, scenario ladder |
| `src/react/AGENTS.md` | React/Trial layer detail (wired via `opencode.json` instructions) |
| `.claude/skills/animal-emotion-sprites/SKILL.md` | Before touching emotion sprites, Ludo scripts, or character art |

## Quick checklist for changes

- New **UI color or font step** → extend `uiColors.scss`/`uiColor.ts` or `uiTypography.scss`/`uiFont.ts`; use `var(--ui-*)` or TS mirrors.
- New **overlay or menu** → `src/react/`, wire via `ReactApp.tsx` if scene-specific.
- New **Phaser scene** → `src/phaser/scenes/`, register in `main.ts`, add `case` in `ReactApp.tsx`.
- New **debate content** → author `DebateScenarioJson` JSON in `src/data/debates/`, register in `src/data/levels.ts`. No engine changes needed.
- New **gated encounter** → set `requires` on `ScenarioEntry` in `levels.ts`. Prefer `dialog_flag` over `encounter_completed`.
- New **dialog flag** → add to `DialogFlagId` in `src/data/dialogFlags.ts`, add title/body labels, declare on the encounter via `setsDialogFlags`.
- New **post-Trial follow-up** → add `ENCOUNTER_FOLLOW_UPS` entry + beats under `followUp:{scenarioKey}` in `farmTalk.ts`.
- New **lateral farm scene** → author under `src/data/sideScenes/`, read `docs/farm_side_scenes.md`.
- New **fixed UI string** → add to `src/data/labels.ts`, use `getLabel('key', { replacements: {…} })`.
- New **pure rules helper** → colocate `*.test.ts` next to it.
- New **browser smoke** → add spec under `e2e/`. Do not fold Playwright into `npm run check`.
- New **animal emotion clip** → read `.claude/skills/animal-emotion-sprites/SKILL.md` first. **Costs credits**, never generate without being asked.
- **Smaller-than-debate encounter** → use optional `mechanics` block on scenario; resolve with `resolveMechanics()` (`src/react/trial/utils/scenarioMechanics.ts`), never off the raw scenario.
