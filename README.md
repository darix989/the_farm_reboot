# The Farm

A browser game about **spotting logical fallacies** in a farmyard debate.

You play Rue, a raccoon six weeks new to Green Meadows Farm. The Old Pond is going muddy, and
Tobias the donkey has put a motion to the Public Farm: the pond should be kept for the
Meadow-Born, and everyone who arrived later can walk half a mile to the trough by the road.
He is warm, he is gracious, he has forty-one animals behind him, and almost none of his
argument is about the water.

Walk the farm, talk to the animals, and learn to tell the difference between what someone
*is* and what actually *happened* — first with Bram at the fence, then Cass at the post, then
in gossip at the trough, and finally on the floor of the Public Farm with Duchess the owl
moderating and Tobias across from you.

<img src="screenshot.png" alt="Screenshot" width="600" />

---

## Running it

Requires [Node.js](https://nodejs.org).

```bash
npm install
npm run dev-nolog      # http://localhost:8080
```

| Command | What it does |
|---|---|
| `npm run dev` / `dev-nolog` | Dev server on port 8080 (`-nolog` skips the Phaser telemetry ping) |
| `npm run build` / `build-nolog` | Production build into `dist/` |
| `npm run lint` / `lint:fix` | ESLint over `src` |
| `npm run lint:styles` | Stylelint over SCSS |
| `npm run lint:scenarios` | Authoring lint for debate JSON |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `test:watch` | Vitest unit tests |
| `npm run test:e2e` / `test:e2e:ui` | Playwright Chromium smokes (`e2e/`). Not part of `npm run check`. |
| `npm run check` | Typecheck, lint, format, Vitest, and a production build |
| `npm run format` / `format:check` | Prettier |
| `npm run sprites:emotions` | Generate/promote the cast's emotion animation art. **Spends Ludo.ai credits** — `-- --dry-run` is free. Note the `--` |

Unit tests live next to the module they cover (`*.test.ts`) and run on the debate rules layer — gates, option unlocks, analysis grading, the round workflow reducer. Playwright smokes in `e2e/` boot the real game (menu, a Trial from the menu, farm intro talk). Phaser canvas behaviour still needs a running stage for anything those smokes do not cover: `npm run dev-nolog`, then drive the 16:9 viewport. See [docs/architecture.md](docs/architecture.md#build-and-verification).

CI runs `npm run check` and a separate Playwright `e2e` job on every pull request and push to `main`.

> `npm run dev` and `npm run build` send an anonymous ping to Phaser Studio recording the
> template name, dev-or-prod, and the Phaser version. The `-nolog` variants skip it; deleting
> `log.js` and its `scripts` entries removes it entirely.

---

## How it is built

**Phaser 3.90 and React 19 as siblings**, both drawn over one letterboxed 16:9 stage. Phaser
runs the overworld — walking, collision, camera. React runs everything the player reads or
clicks, including the entire debate system. They meet through Zustand stores and a typed
event bus.

The Phaser scene key decides which React overlay renders, so "changing screen" means starting
a scene.

| | |
|---|---|
| Engine | Phaser 3.90 |
| UI | React 19 + SCSS modules |
| State | Zustand |
| Build | Vite 6, TypeScript 5.7 (strict) |

```
src/
  types/    the content schema (scenarios, rounds, options, tutorials)
  data/     UI copy, the scenario registry, the farm map, the encounter JSON
  store/    six zustand stores
  phaser/   game config, scenes, the overworld
  react/    the debate UI, the tutorial system, the overworld overlay
```

All game content is authored as **data**, not code: an encounter is a JSON file plus one line
in `src/data/levels.ts`.

---

## Documentation

Start at **[docs/README.md](docs/README.md)**.

| If you want to… | Read |
|---|---|
| Understand how the app fits together | [docs/architecture.md](docs/architecture.md) |
| Write a new debate or encounter | [docs/encounters.md](docs/encounters.md) |
| Work on the overworld | [docs/farm_overworld.md](docs/farm_overworld.md) |
| Know what the game teaches | [docs/logical_fallacies_intro.md](docs/logical_fallacies_intro.md) |
| See a level built end to end | [docs/level_01_the_pond_motion.md](docs/level_01_the_pond_motion.md) |
| Generate or fix a character's animation art | [.claude/skills/animal-emotion-sprites/SKILL.md](.claude/skills/animal-emotion-sprites/SKILL.md) — a plain markdown manual any tool can read |
| Find your way around the code | [AGENTS.md](AGENTS.md), and [src/react/AGENTS.md](src/react/AGENTS.md) for the debate UI |

---

## Credits

Built on the [Phaser React TypeScript template](https://github.com/phaserjs/template-react-ts).
Phaser is © Phaser Studio Inc., released under the MIT licence.
