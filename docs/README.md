# Docs

Design and implementation notes for **The Farm** — a game about spotting logical fallacies
in a farmyard debate.

Start here; each entry says what question it answers.

---

## The curriculum — what the game teaches

| Doc | What it is |
|---|---|
| [logical_fallacies_intro.md](./logical_fallacies_intro.md) | The catalogue. All 18 fallacies with a definition and an example each, sorted into three complexity tiers: **Level 1** emotional & social, **Level 2** faulty logic & connections, **Level 3** structural & conceptual. The tiers are *fallacy difficulty*, not game chapters. |
| [logical_fallacies_distribution.md](./logical_fallacies_distribution.md) | The teaching rules. One dedicated encounter per newly introduced fallacy, few other types alongside it; alternate Level 1 with Level 2, and hold Level 3 until 70% of the first two are learned. |

> The fallacy ids in code (`LogicalFallacyId` in `src/types/debateEntities.ts`) and the icons
> in `src/static/icons/fallacies/` follow this catalogue's numbering.

## The game — what the player does

| Doc | What it is |
|---|---|
| [mechanics.md](./mechanics.md) | Open questions about the debate systems: moderators with a weakness to particular fallacies, and what analysing your *own* statements should be worth. A brainstorm, not a spec — nothing here is built yet. |
| [level_01_the_pond_motion.md](./level_01_the_pond_motion.md) | Level 1 in full: the story, the cast, the six-encounter ladder from a two-minute gossip up to the ten-beat boss debate, and the authored dialogue for every rung. The source of truth for `src/data/debates/010_*` … `015_*`. |
| [farm_overworld.md](./farm_overworld.md) | How the Phaser gameplay works: the Phaser/React split, the placeholder-art texture contract, how an encounter is launched and returned from, and how to add an animal or a location. Read before touching the `Farm` scene. |

---

## Where to look for a given task

| I want to… | Read |
|---|---|
| Write a new encounter or debate | `level_01_the_pond_motion.md` for the pattern, `logical_fallacies_distribution.md` for which fallacy belongs where |
| Add an animal, a location, or anything in the overworld | `farm_overworld.md` |
| Understand a fallacy well enough to write a line for it | `logical_fallacies_intro.md` |
| Know how the code is laid out | [`AGENTS.md`](../AGENTS.md) at the repo root, and `src/react/AGENTS.md` for the debate UI |

---

## `to_process/`

Older notes kept for reference but **not yet reconciled with what shipped** — read them as
history, not as the current design:

- `plan_001.md` — the original debate domain model, including a target + evidence assembly
  flow that was never built (the game ships a simpler 3-option picker).
- `plan_002.md` — the ten-beat "Simplified Public Forum" round order. Still accurate, and
  still linked from `level_01_the_pond_motion.md`; it belongs in the main set once folded
  into a proper mechanics doc.
- `PHASER_ZUSTAND_INTEGRATION.md`, `SIMPLE_ZUSTAND_INTEGRATION.md` — integration write-ups
  that overlap with `AGENTS.md`.
- `random_notes.md` — scratch. Records that "PF" is Public Forum, and that the game calls
  its debates the **Public Farm**.

---

## Known inconsistencies

Worth knowing before trusting a doc end to end:

- **"Level" is overloaded.** In `logical_fallacies_*.md` it means fallacy difficulty tier;
  in `level_01_the_pond_motion.md` it means a chapter of the game. They are unrelated
  numbers that happen to line up for Level 1.
- **The shipped order does not match the distribution rule.** The four older scenarios teach
  Level-2 False Dilemma first. Level 1's own ladder (`010`–`015`) does follow the rule.
- **Straw Man's tier is an open question** — `logical_fallacies_intro.md` carries the
  author's own "(isn't this level 2 or 3?)" note.
- **`no-true-scotsman` has an icon and a catalogue entry but no `LogicalFallacyId`**, so it
  cannot currently be authored into a scenario.
- **Barnaby is two different animals** — a Border Collie in `pitch/001` and `sample-debate`,
  a Bunny in the Blue Barn tutorial.
