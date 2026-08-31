# Encounters — the authoring reference

Everything the player plays is an **encounter**: a `DebateScenarioJson` file in
`src/data/debates/`, rendered by `TrialUI`. A two-minute gossip at the water trough and a
ten-beat Public Farm debate are the same schema with different flags.

The schema itself is [`src/types/debateEntities.ts`](../src/types/debateEntities.ts) — that
is the source of truth. This is the guide to using it. For the UI that renders it, see
[`src/react/AGENTS.md`](../src/react/AGENTS.md); for a worked example of six encounters,
[`level_01_the_pond_motion.md`](./level_01_the_pond_motion.md).

---

## Adding an encounter

1. Write `src/data/debates/NNN_slug.json`.
2. Register it once in [`src/data/levels.ts`](../src/data/levels.ts) — that file owns the
   `DebateScenarioKey` union, the `DEBATES` lookup and the menu ordering.
3. Add its menu title to `labels.ts`.

To hang it on an animal in the overworld, add the key to that NPC's `scenarios` in
`src/data/farmMap.ts`. No engine changes for any of this.

---

## The scenario

| Field | Meaning |
|---|---|
| `id` | Internal id — **not** the `DebateScenarioKey`. `015_duchess_vs_rue` is the key, `level1-boss-pond-motion` is the id. Progress is tracked by key. |
| `introduction` | Sets the scene. Its presence is what creates the `debate_intro` phase. |
| `playerSide` | `proposition` or `opposition`. |
| `characters` | `speakerId` → display name. |
| `logicalFallacies` | The fallacies this scenario uses, each with an `explanation` shown after a guess. **Write real prose** — several older scenarios still say `"TBD"`, and the player sees it. |
| `availableLogicalFallacies` | Which icons appear on the picker. **This is the difficulty dial** — one icon is a tutorial, thirteen is a wall. |
| `startingInsightPoints` | Insight to start with. Defaults to 0. |
| `mechanics` | Mode flags, below. Omit for a full debate. |
| `rounds` | The sequence. |
| `tutorials` | Overlays triggered off the debate event bus. |

---

## Rounds

`rounds` is a flat sequence. Each entry is an NPC turn or a player turn.

**NPC round** — the opponent speaks, the player reads and continues. `impact` is a signed
delta in player perspective: negative when the NPC lands a point. Set `requiresAnalysis: true`
to hold Continue until the player has analysed the statement — that turns a round into a
spotting exercise, and is the whole gameplay of a gossip encounter.

**Player round** — exactly **three** options, always. Two optional shapes:

- `opponentPrompt` — the NPC speaks first and the player answers. Add
  `opponentPromptImpact` for what that prompt costs.
- `opponentResponses` — one reply per option, matched by `forOptionId`, so the NPC reacts to
  whichever line was picked. Exactly three.

Options are shuffled deterministically per playthrough. Set `preventOptionsShuffle: true`
when position must be stable — scripted rounds, or a lab where the tutorial says "option A".

### Options

| Field | Meaning |
|---|---|
| `quality` | `effective` \| `ineffective` \| `logical_fallacy`. Presentation only — scoring comes from `impact`. |
| `impact` | Signed integer, capped at ±50 (`PLAYER_OPTION_IMPACT_ABS_MAX`). |
| `reason` | Why this line works or fails. Shown in the analysis modal, and in the recap when `revealChoiceAssessment` is on. **Always write one.** |
| `unlockCondition` + `unlockedSentences` | Gate the line behind spotting a fallacy. Paired — set both or neither. |

House style for the three options, from `pitch/001`: **A is a tempting fallacy** (it should
feel satisfying), **B is plausible but beside the point** (never stupid), **C is effective**.

### Unlock conditions

```json
"unlockCondition": { "npcRoundId": "round-5", "sentenceId": "s-r5-2", "fallacyId": "ad-hominem" },
"sentences":         [{ "id": "…-locked", "text": "locked", "logicalFallacies": [] }],
"unlockedSentences": [{ "id": "…-1", "text": "The real line.", "logicalFallacies": [] }]
```

The player must tag *that fallacy* on *that sentence*; a partial guess still unlocks it. Then
they click once to reveal, and again to select. `npcRoundId` also accepts a **statement** id
(for an `opponentPrompt`), because the matcher compares against whatever analysis target was
solved.

This is the only mechanic where spotting and speaking touch. Use it for the payoff line.

---

## Mechanics flags

`mechanics` lets a scenario ship as something smaller than a debate. Every field is optional
and defaults to full-debate behaviour, so omitting the block changes nothing. Read them
through `resolveMechanics()` (`src/react/trial/utils/scenarioMechanics.ts`), never off the
raw scenario.

| Flag | Default | Effect |
|---|---|---|
| `analysisEnabled` | `true` | Magnifying glasses and the analysis modal. |
| `showInsightPoints` | `true` | The Insight counter. |
| `showModeratorOpinion` | `true` | Gauge, opinion emoji, per-round impact. |
| `showRoundRecap` | `true` | The recap modal between rounds. |
| `showIntroSummary` | `true` | The pre-round-1 briefing modal. |
| `revealChoiceAssessment` | `false` | Recap shows the chosen option's quality + `reason`. |
| `targetQuality` | `'effective'` | Which quality reads as the win. |
| `maxAnalysisAttempts` | `3` | Guesses per analysis target. |
| `encounterKind` | `'debate'` | Swaps UI copy — see below. |

There is deliberately **no behavioural `mode` enum**. Each flag is consumed independently,
which is what keeps the engine from forking per encounter type.

**`revealChoiceAssessment` is load-bearing whenever `analysisEnabled` is false.** With
analysis off, an option's `reason` is otherwise unreachable and the player gets no feedback
at all.

**`targetQuality: 'logical_fallacy'`** is for inoculation exercises where committing the
fallacy on purpose is the lesson. It only changes which badge paints as success; scoring is
still the authored `impact`. Two rules if you build one: never give the honest option a
negative impact, and say in the introduction that this is a training exercise — otherwise
the game teaches that fallacies win.

### `encounterKind`

Presentation only; it never changes behaviour.

| kind | Log panel | Closing line | Prop/Opp badges |
|---|---|---|---|
| `debate` | Debate Log | "The debate is finished." | shown |
| `gossip` | Trough Talk | "There is nothing more to overhear." | hidden |
| `sparring` | Sparring Log | "That is the session done." | hidden |
| `lab` | Lab Notes | "That is the exercise done." | hidden |

It also swaps the opening guidance and makes the intro card read "Setting" rather than
"Moderator". A one-beat skirmish stays a `debate` — it is one beat of one, using the same
chrome on purpose.

---

## Fixed constants

Not authorable per scenario; change them in code if you must.

| Constant | Value | Where |
|---|---|---|
| `PLAYER_OPTION_IMPACT_ABS_MAX` | 50 | `types/debateEntities.ts` |
| `DEFAULT_MAX_ANALYSIS_ATTEMPTS` | 3 | `trial/utils/fallacyGuessTypes.ts` |
| `HELP_INSIGHT_COST` | 2 | `trial/roundAnalysisModal/RoundAnalysisModal.tsx` |

Insight is earned **+1 per analysis target solved correctly, once each**, and spent 2 at a
time to reveal which sentences contain fallacies.

---

## Checking your work

There is no schema validation at load — the JSON is cast, not parsed. Before shipping an
encounter, confirm by hand:

- exactly 3 options per player round, and exactly 3 `opponentResponses` if present, with
  `forOptionId` matching the option ids
- `roundNumber` sequential from 1
- every `speakerId` present in `characters`
- every tagged fallacy also in `availableLogicalFallacies`
- sentence ids unique across the file
- `unlockCondition` naming a fallacy that is actually authored on that sentence
- no `"TBD"` explanations
- best-case and worst-case totals give the spread you intended

Then play it: `npm run dev-nolog`, and launch it from the main menu.
