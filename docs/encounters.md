# Encounters — the authoring reference

Everything the player plays is an **encounter**: a `DebateScenarioJson` file in
`src/data/debates/`, rendered by `TrialUI`. A two-minute gossip at the water trough and a
ten-beat Public Farm debate are the same schema with different flags.

The schema itself is [`src/types/debateEntities.ts`](../src/types/debateEntities.ts) — that
is the source of truth. This is the guide to using it. For the UI that renders it, see
[`src/react/AGENTS.md`](../src/react/AGENTS.md); for a worked example of eight encounters,
[`level_01_the_pond_motion.md`](./level_01_the_pond_motion.md).

---

## Adding an encounter

1. Write `src/data/debates/NNN_slug.json`.
2. Register it once in [`src/data/levels.ts`](../src/data/levels.ts) — that file owns the
   `DebateScenarioKey` union, the `DEBATES` lookup and the menu ordering.
3. Add its menu title to `labels.ts`.
4. Run `npm run lint:scenarios` — it checks the recap summaries every scenario owes
   ([Recap summaries](#recap-summaries)).

To hang it on an animal in the overworld, add the key to that NPC's `scenarios` in
`src/data/farmMap.ts`, and add matching beats in `src/data/farmTalk.ts`. To gate it, set
`requires` on the `ScenarioEntry`. No engine changes for any of this.

---

## The scenario

| Field | Meaning |
|---|---|
| `id` | Internal id — **not** the `DebateScenarioKey`. `015_tobias_vs_rue` is the key, `level1-boss-pond-motion` is the id. Progress is tracked by key. |
| `introduction` | Sets the scene. Its presence is what creates the `debate_intro` phase. May carry inline [emphasis](#emphasis-inside-a-spoken-line). |
| `introductionSummary` | Two-line paraphrase shown in the pre-round-1 briefing modal. **Required** whenever there is an `introduction` — see [Recap summaries](#recap-summaries). |
| `playerSide` | `proposition` or `opposition`. |
| `characters` | `speakerId` → display name. |
| `logicalFallacies` | The fallacies this scenario uses, each with an `explanation` shown after a guess. **Write real prose** — several older scenarios still say `"TBD"`, and the player sees it. |
| `availableLogicalFallacies` | Which icons appear on the picker. **This is the difficulty dial** — one icon is a tutorial, thirteen is a wall. |
| `startingInsightPoints` | Insight to start with. Defaults to 0. |
| `teachesFallacies` | Fallacies added to the Codex as known when the player **leaves a finished encounter**. Walking out halfway teaches nothing. |
| `setsDialogFlags` | Dialog flags set on the same leave. Prefer these over `encounter_completed` for "this conversation happened" gates — a flag carries player-facing copy. |
| `unlocksFeatures` | Features granted on the same leave (`insight_points`, `round_types`). Walking out halfway unlocks nothing. The teaching encounter can still show the feature during play. |
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
| `summary` | Two-line paraphrase of the line, shown in the round recap. **Always write one** — see [Recap summaries](#recap-summaries). |
| `unlockCondition` + `unlockedSentences` | Gate the line behind spotting a fallacy *in this debate*. Paired — set both or neither. |
| `unlockConditions` | Gate the line behind the rest of the game (`GameCondition[]`). ANDed with `unlockCondition` when both are present. |

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

A gated letter stays clickable while it is still shut. It shows a lock badge; clicking it
does not select the line — it shakes, writes *why* it is shut into the Actions hint, and
pulses Analyze when the missing piece is an in-debate tag. Once the condition is met the
same letter glows (ready). First click opens it (lock drops); second click says it. Reduced
motion keeps the colours and drops the motion.

This is the only mechanic where spotting and speaking touch. Use it for the payoff line.

### Cross-encounter unlocks

```json
"unlockConditions": [{ "kind": "dialog_flag", "flagId": "bram-grate-conceded" }]
```

`unlockConditions` is a list of `GameCondition`s (see `src/utils/gameConditions.ts`) and is
**ANDed** with `unlockCondition`. "You caught her doing it just now *and* Bram told you at
the fence" is one option with both fields set. Presentation is shared: either field makes
the option locked, and unlocking still goes through the click-to-reveal step.

Kinds: `fallacy_known`, `fallacy_spotted` (optionally scoped to a scenario),
`encounter_completed`, `dialog_flag`, `feature_unlocked`. Prefer a `dialog_flag` when the requirement is "this
conversation happened" — `encounter_completed` can only name the encounter by key, which is
not player-facing.

A gated option's `summary` still describes the **unlocked** copy.

### Overworld gates (`ScenarioEntry.requires`)

The encounter itself can be gated, independently of any option inside it. Set `requires` on
the entry in [`src/data/levels.ts`](../src/data/levels.ts):

```ts
requires: [
  { kind: 'fallacy_known', fallacyId: 'ad-hominem' },
  { kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' },
],
```

This disables Talk on the farm and shows `conditionHint` as the reason. The animal still
talks — only the button is locked. The main menu is not gated. Hang the matching beats in
`farmTalk.ts`; lengthening an NPC's `scenarios` list silently re-points every existing beat
row (`cass1` becomes the new first encounter, not the old one).

Greeters with no encounter use `talkStages`. Set `completesFlag` on a stage to write a
dialog flag when the last beat's reveal settles — that is "a real dialog happened till the
end". Closing early sets nothing. Dot's welcome is the one that needs it.

---

## Emphasis inside a spoken line

A sentence's `text` — and `introduction` — may carry the same inline markup the tutorial
overlay uses: `**bold**` and `[accent]…[/accent]` (also `danger`, `warning`, `success`, `info`,
`muted`). Use it to make the one clause a line turns on impossible to miss:

```json
{ "text": "[accent]You did not argue with me. You priced me.[/accent] My tail, my record, my mood — three ways of saying she does not count." }
```

Only the **wizard panel** renders it — the box the player is reading, one sentence at a time,
with the typewriter counting the plain characters so the tags cost the reveal nothing. Every
other surface shows the line as prose: the debate log, the recap modals, the analysis modal's
sentence cards, the option previews and the screen-reader announcer all strip it first
(`plainSpokenText`, `src/react/trial/utils/spokenMarkup.ts`).

**A span must stay inside one authored sentence.** The reveal maps `Sentence[]` 1:1 onto its
chunks, so a tag opened in one sentence and closed in the next leaves both unbalanced and the
markup prints literally. Prose in `introduction` is split by `splitIntoSentences`, so keep a
span inside one sentence of it too. Spend it on one clause per statement at most; a line with
three accents in it has emphasised nothing.

---

## Recap summaries

The briefing modal and the round recap exist to tell the player *what just happened*. If they
quote the introduction and the round verbatim, they are a scroll-back, not a recap — the
player reads the same paragraph twice and learns nothing the second time.

So every line those two modals show has an authored paraphrase beside the spoken copy:

| Field | Recapped surface |
|---|---|
| `introductionSummary` on the scenario | Briefing modal, under "Introduction". |
| `summary` on a `Statement` | NPC round, `opponentPrompt`, and each `opponentResponses[].statement`. |
| `summary` on a `PlayerOption` | The line the player picked. |

Rules:

- **Paraphrase, never trim.** Say what the statement *did* — "Tobias opens on the forty-one
  who already agreed" — not what it said. Copying the wording back defeats the point, and
  `lint:scenarios` rejects a summary that repeats or prefixes the spoken text.
- **Two lines, ~160 characters** (`RECAP_SUMMARY_MAX_LINES` / `RECAP_SUMMARY_MAX_CHARS` in
  `debateEntities.ts`). The recap clamps to two lines, so a longer one is silently cut.
- A gated option's `summary` describes its **unlocked** copy. While the option is still
  locked the recap keeps showing the placeholder `sentences` instead.
- Both fields are optional in the type, and the modal falls back to the spoken text when one
  is missing — that fallback exists so a half-written scenario still runs, not as a licence
  to skip them. `npm run lint:scenarios` fails on any that are missing, and skips the ones a
  scenario cannot reach (`showIntroSummary: false`, `showRoundRecap: false`).

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
| `showRoundType` | `true` | The `— crossfire` half of the wizard round label, the type line on debate-log cards, and the analysis-modal subtitle. Hidden globally until `round_types` is unlocked. |

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
| `lesson` | Lesson Notes | "That is the lesson done." | hidden |

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
- `unlockConditions` naming a flag / fallacy / scenario that exists
- `teachesFallacies` / `setsDialogFlags` / `unlocksFeatures` / `requires` agreeing with the fiction (the player
  cannot be taught a fallacy they never hear named, and a flag must be set by the encounter
  the copy describes)
- no `"TBD"` explanations
- best-case and worst-case totals give the spread you intended

Then play it: `npm run dev-nolog`, and launch it from the main menu.
