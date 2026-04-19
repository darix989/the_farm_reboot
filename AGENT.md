# AGENT.md — Repository guide for automated assistants

This document summarizes how **the_farm_reboot** is structured, how React and Phaser interact, and where to put new code. It reflects the tree as of the `feature/upgrading_tech_stack` branch.

## What this project is

- A **browser game shell** built from the [Phaser React TypeScript + Vite template](https://github.com/phaserjs/template-react-ts), extended with **Zustand** and scene-specific React overlays (`MainMenu`, `Trial`, etc.).
- `package.json` still names the package `template-react-ts` and points at the upstream template metadata; the working tree is the reboot project under `the_farm_reboot`.

## Tech stack

| Area | Choice |
|------|--------|
| Runtime UI | React 19 |
| Game engine | Phaser 3.90 |
| Bundler | Vite 6 (`vite/config.dev.mjs`, `vite/config.prod.mjs`) |
| Language | TypeScript 5.7 (strict, `noUnusedLocals` / `noUnusedParameters`) |
| Global UI state | Zustand (`src/store/gameStore.ts`) |
| Styling | SCSS — `src/react/index.scss` (global) + `*.module.scss` (per feature); shared **design tokens** for fonts (`uiTypography.scss` / `uiFont.ts`) and colors (`uiColors.scss` / `uiColor.ts`). Tailwind has been removed. |
| Lint | ESLint 9 + TypeScript ESLint (`.eslintrc.cjs`) |

## How to run and build

- `npm install` — install dependencies.
- `npm run dev` — Vite on port **8080**; prepends `node log.js dev` (see below).
- `npm run build` — production build to `dist/`.
- `npm run dev-nolog` / `npm run build-nolog` — same without Phaser template telemetry.

## Source layout (authoritative)

All application code lives under **`src/`**. Cursor rule **`.cursor/rules/project-architecture.mdc`** applies:

- **React UI** → `src/react/` (components, hooks, CSS).
- **Phaser-only** (no React components) → `src/phaser/` (`main.ts`, `PhaserGame.tsx` bridge, scenes, `EventBus.ts`).
- **Shared** → `src/store/`, `src/utils/`, `src/data/` (UI copy), top-level `src/App.tsx`, `src/main.tsx`.

See also the root **README.md** for commands, structure, and the React–Phaser bridge.

```
src/
  main.tsx              # React bootstrap
  App.tsx               # PhaserGame + ReactApp siblings
  types/
    debateEntities.ts   # DebateScenarioJson and all debate domain types
  data/
    labels.ts           # Central UI strings + default export getLabel()
  phaser/
    PhaserGame.tsx      # Creates/destroys Phaser Game, wires Zustand + EventBus
    main.ts             # Game config, scene list, scale (1920×1080 FIT)
    EventBus.ts         # Phaser.Events.EventEmitter singleton
    scenes/             # Boot, Preloader, MainMenu, Game, Trial, GameOver
  react/
    AGENT.md            # React-layer guide (TrialUI, debate workflow)
    uiTypography.scss   # @mixin font-scale → --ui-font-* on `.react-root`
    uiFont.ts             # var(--ui-font-*) for inline styles in TSX
    uiColors.scss         # @mixin color-palette → --ui-color-* on `html`
    uiColor.ts            # var(--ui-color-*) for inline styles in TSX
    ReactApp.tsx        # Scene-based UI switch; loading gate on isGameReady
    ReactRoot.tsx       # Overlay aligned to Phaser canvas (resize sync)
    screens/            # Scene-keyed overlays (imported by ReactApp)
      MainMenuUI.tsx
      TrialUI.tsx       # Debate/trial overlay (rounds, player choices, score)
      BoilerPlateUI.tsx # Fallback overlay for unmapped scenes
    hooks/
      useGame.ts              # Hooks around GameManager + store
      useTrialRoundWorkflow.ts # Reducer hook driving the debate state machine
      useScrollFade.ts        # Scroll edges for animated fade overlays
    trial/
      TrialLayout.tsx           # Three-column layout (Feedback | Wizard | Interactive)
      roundAnalysisModal/       # Round analysis modal (component + styles)
      panels/                   # Feedback, Wizard, Interactive column components
      components/               # Shared trial widgets (ScrollFadeContainer, etc.)
      utils/                    # trialHelpers, optionUnlock, fallacy guess types/utils
  store/gameStore.ts    # Zustand + EventBus listeners (current scene, game ref)
  utils/
    constants.ts        # PHASER_PARENT_ID = "phaser-parent"
    gameManager.ts      # Static helpers: switchScene, pause, whenReady, etc.
```

## React UI design tokens (fonts and colors)

React overlays share a small token system (mirrored SCSS + TypeScript so CSS modules and inline `style` stay aligned):

- **Fonts** — [`src/react/uiTypography.scss`](src/react/uiTypography.scss) defines `@mixin font-scale`, which sets `--ui-font-*` custom properties. [`src/react/index.scss`](src/react/index.scss) applies it on **`.react-root`**. [`src/react/uiFont.ts`](src/react/uiFont.ts) exports `var(--ui-font-*)` strings for TSX.
- **Colors** — [`src/react/uiColors.scss`](src/react/uiColors.scss) defines `@mixin color-palette` with `--ui-color-*` (neutrals, borders, brand accent, status colours). It is included on **`html`** in `index.scss` so `body` and all descendants inherit tokens. [`src/react/uiColor.ts`](src/react/uiColor.ts) exports `var(--ui-color-*)` for TSX (e.g. `trialHelpers.qualityColor`, panels).
- **Per-file only** — colours or values used in a single SCSS module can stay as **`$variables` at the top** of that file instead of growing the global palette.

Details and Trial-specific styling notes: [`src/react/AGENT.md`](src/react/AGENT.md).

## UI copy (`getLabel`)

User-visible strings for React overlays and Phaser scenes live in one place: [`src/data/labels.ts`](src/data/labels.ts).

- **Default export** — `getLabel(label, options?)` where `label` is a key of the `LABELS` map (TypeScript type **`Labels`**).
- **Options** (`GetLabelOptions`, optional) — **`replacements`**: map placeholder keys to `string | number` (templates use `{word}` tokens, e.g. `'Round {roundNumber}'`). **`addPeriod`**: when `true`, appends a trailing `.` for TTS-style pauses; otherwise omit for normal UI copy.
- **Adding copy** — extend the `LABELS` object with a new key and string; call sites get type-checked via `Labels`.

## React ↔ Phaser integration

1. **`PhaserGame`** (`src/phaser/PhaserGame.tsx`) mounts once, calls `StartGame(PHASER_PARENT_ID)`, stores the instance in Zustand, and emits **`game-ready`** / **`game-destroyed`** on `EventBus`.
2. **`EventBus`** is a shared `EventEmitter`; scenes should emit **`current-scene-ready`** with the scene instance when React needs that scene (see upstream README pattern). `gameStore` subscribes and updates `currentScene` + `currentSceneInstance`.
3. **`ReactApp`** reads `useGameStore()` (`isGameReady`, `currentScene`) and renders **`MainMenuUI`**, **`TrialUI`**, or **`BoilerPlateUI`** from `src/react/screens/` for the matching scene keys.
4. **`ReactRoot`** positions the overlay to match the Phaser canvas margins/size on resize.
5. **`GameManager`** (`src/utils/gameManager.ts`) centralizes imperative access (scene switch, pause, `whenReady` / `whenSceneReady`) using the store.

## Phaser scenes (registration order)

Defined in `src/phaser/main.ts`: **Boot** → **Preloader** → **MainMenu** → **Game** → **Trial** → **GameOver**. Design resolution **1920×1080**, `Scale.FIT`, centered.

## Assets and HTML

- Entry: `index.html` → `/src/main.tsx`, `#root`.
- Favicon referenced: `/favicon.png` (ensure it exists under `public/` or root when deploying).
- Template docs mention `public/assets` for static loads; add that folder as needed for `this.load.*` paths like `assets/...`.

## Telemetry (`log.js`)

Default `npm run dev` / `build` run `log.js`, which performs an anonymous GET to `gryzor.co` with template/package metadata (see README). Use `*-nolog` scripts or remove the hook if that must be avoided in CI or sensitive environments.

## Debate / Trial system

The Trial scene uses a turn-based debate loop driven entirely by React state (no Phaser logic):

- All debate content is declared in a **`DebateScenarioJson`** value (see `src/types/debateEntities.ts`).
- The `TrialUI` overlay (see `src/react/AGENT.md`) reads this value and drives the full interaction.
- The game state machine lives in `src/react/hooks/useTrialRoundWorkflow.ts`.
- A **Round Analysis Modal** (`src/react/trial/roundAnalysisModal/RoundAnalysisModal.tsx`) lets the player inspect any completed round: guess logical fallacies in NPC statements (one guess per player turn), or review why their own choice was effective/flawed.
- **⚠️ Pointer-events gotcha:** `.react-ui-overlay` has `pointer-events: none` which inherits to all descendants. Any new interactive element outside an existing panel (modal, tooltip, etc.) **must** set `pointer-events: auto` on its root — otherwise clicks and hover silently fall through to the Phaser canvas.

## Extra docs in repo

- `PHASER_ZUSTAND_INTEGRATION.md`, `SIMPLE_ZUSTAND_INTEGRATION.md` — integration notes (may overlap with this file).
- `src/react/AGENT.md` — detailed guide to the React overlay layer and the Trial/debate workflow.

## Quick checklist for changes

- New **shared UI colour or font step** → extend `uiColors.scss` / `uiColor.ts` or `uiTypography.scss` / `uiFont.ts`, then use `var(--ui-*)` or the TS mirrors in components.
- New **overlay or menu** → `src/react/`, wire via `ReactApp.tsx` if scene-specific.
- New **scene or game logic** → `src/phaser/scenes/` (and register in `main.ts`).
- **Cross-layer signals** → `EventBus` + optional `gameStore` actions.
- Keep **`PHASER_PARENT_ID`** in sync between the Phaser parent div and `ReactRoot` layout logic.
- New **debate content** → author a `DebateScenarioJson` object and pass it to `TrialUI` as the `debate` prop; no code changes required.
- New **fixed UI string** (menus, modals, ARIA, Phaser labels) → add an entry in `src/data/labels.ts` and use `getLabel('yourKey', { replacements: { … } })` when the template has placeholders.
