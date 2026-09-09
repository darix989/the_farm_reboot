# Level 1 — The Pond Motion

The authoring source of truth for Level 1: the story, the cast, the ladder of scenarios,
and the intent of every rung. Scenario JSON under `src/data/debates/010_*` … `015_*` and
`020_*` … `022_*` is transcribed from this document — when the two disagree, this document
is wrong and should be corrected to match what shipped.

Level 1 teaches the two simplest fallacies in the curriculum, both from Level 1 of
[logical_fallacies_intro.md](./logical_fallacies_intro.md): **Ad Hominem** (#1) and
**Appeal to Popularity** (#2). Both are social fallacies, so the fiction is a social one —
a settled majority voting an outsider away from the water.

The ladder follows `pitch/002_gradual_mechanics_onboarding.md`: each rung teaches one verb,
and the full Public Farm debate is the boss. Rungs ship as ordinary `DebateScenarioJson`
values; the smaller modes are expressed with the `mechanics` flags documented in
[`src/types/debateEntities.ts`](../src/types/debateEntities.ts).

---

## Part 1 — The story

### Premise

Green Meadows Farm's only clean water is the **Old Pond**, and it has been going brown.
**Tobias**, a donkey who has pulled the same cart down the same lane for eleven years, puts
a motion to the Public Farm:

> *That the Old Pond be reserved to the Meadow-Born; that every animal who arrived shall
> water at the road trough.*

His case is that the arrivals foul the water. His *method* is the level's two fallacies,
and he is extremely good at both:

- **Appeal to Popularity** — "Forty-one of the Meadow-Born have already put their names to
  it. Forty-one animals are not a mistake."
- **Ad Hominem** — never crude, always sympathetic: "Nobody blames the newcomers. It is only
  that an animal who takes his supper out of a bin has a rather different notion of clean."

The player is **Rue**, a raccoon who arrived six weeks ago and does the hauling and the odd
repair. He is exactly the animal both fallacies are built to dispose of: no crowd behind
him, and a supper anybody can make a face about.

**The level's thesis is that Rue's disqualification is his qualification.** He eats out of
the bins, and he is unembarrassed about it, and that is precisely why he is the only animal
in the meadow who has had his arm in the outflow drain up to the shoulder. The line they
use to throw his evidence away is the reason he has any.

The dividing line is *born here* against *arrived*, not species — which is what lets the
same two fallacies point at Rue, at **Cass** (a fox, so obviously not to be trusted) and at
**Bram** (a wolf, so obviously to be watched). Being outside the group is treated as the
answer.

The actual cause of the mud is a **bent grate on the pond's outflow drain** — a fact the
player picks up as gossip, hears conceded by the other side without their noticing, puts on
the record with a witness, and finally cashes in on the floor. The teaching phrase, handed
over by Cass in rung 1.1 and paid off in the boss debate, is: **"what I am" versus "what
happened."**

### Cast

Every character is the animal their sprite draws — see
[characters-and-animations.md](./characters-and-animations.md).

| Name | Species | Role | Voice | Running gag |
|---|---|---|---|---|
| **Rue** | Raccoon | Player. Six weeks in; hauling and repairs. | Plain, literal, entirely unembarrassed about the bins. | Volunteers an incriminating detail nobody asked for. It keeps turning out to matter. |
| **Cass** | Fox (she) | Coach. Eleven seasons on the Public Farm floor. | Cranky, dry, fond of Rue in a way she would deny. Runs the sparring post and the Lab. | Pre-empts the fox line herself, and is quietly furious that it still works. |
| **Hetty** | Sheep | The trough. Will not speak until you can name Ad Hominem. | Warm, relentless, entirely without malice or self-awareness. | Asks a question, answers it herself, thanks you for agreeing. |
| **Bram** | Wolf | The fence line. Teaches Insight. | Anxious, over-polite, apologises mid-sentence. | "I'm not saying it because I'm a wolf." |
| **Tobias** | Donkey | Boss antagonist. Speaks for the Meadow-Born. | Warm, gracious, never raises his voice. Sincere, and lethal. | Never gets Rue's name right — Roo, Rufus, Ruin. |
| **Duchess** | Owl | Moderator of the Public Farm. Talking to her starts the boss debate. | Old, tired, scrupulously fair. She *is* the moderator gauge. | Declines to hold an opinion about anything, including the weather. |
| **Dot** | Dog | Yard greeter. No encounter. | Direct, breathless, kind. | Starts three sentences, finishes one. |

Antagonists are sincere, not villainous — the house style established in `pitch/001`.
**Cass is the reason Bram works**: two animals with the same problem, one who fought it for
eleven seasons and one who bought his way out by agreeing louder than anybody in the crowd.

### How you arrive

**Dot** stands in the yard just off spawn, and her conversation opens on its own the first
time the farm loads. She welcomes you, names Tobias's motion and Sunday in front of
Duchess, and sends you to Cass first, then Hetty, then the barn. She has no encounter; her
farm talk advances as you do those things. She pointedly refuses to warn you about the fox.

### The ladder

Each rung adds exactly one thing. Quickest gameplay first, boss last. The spine is a
three-beat Ad Hominem ladder: Cass teaches the name, Hetty uses it, Tobias requires both.

| # | Scenario | Mode | Teaches | Fallacies on the picker | New for the player |
|---|---|---|---|---|---|
| 1.1 | `020_cass_teaches_ad_hominem` | Sparring | **The name** of Ad Hominem | ad-hominem | Analysis via the footer magnifying glass. Fallacy known on leave. |
| 1.2 | `021_hetty_ad_hominem_barrage` | Gossip | **Spotting it in the wild**, three times | ad-hominem | Gated on knowing Ad Hominem. Sets the boss flag. |
| 1.3 | `010_gossip_trough_hetty` | Gossip | A **clean** round; the bent grate | ad-hominem | Not every sentence is a trap. |
| 1.4 | `011_sparring_cass_ad_hominem` | Sparring | **Speaking**, alone | — (analysis off) | The 3-option picker. A coach's verdict instead of a score. |
| 1.5 | `012_gossip_trough_bram` | Gossip | A **second** fallacy; telling the two apart | ad-hominem, appeal-to-popularity | Two icons on the picker. |
| 1.6 | `022_bram_teaches_insight` | Gossip | **Insight Points** — the counter and the spend | ad-hominem, appeal-to-popularity | The economy, and permission never to use it. |
| 1.7 | `013_lab_cass_dirty_tricks` | Lab | **Inoculation** — commit the fallacy, then catch it | ad-hominem, appeal-to-popularity | Inverted goal; two fallacies fused in one sentence. |
| 1.8 | `014_skirmish_bram_fenceline` | Skirmish | Speaking **and** spotting together | ad-hominem, appeal-to-popularity | The moderator gauge and an unlock-gated option. Sets the grate flag. |
| 1.9 | `015_tobias_vs_rue` | Boss debate | Everything, over 10 beats | + false-dilemma (distractor) | Full Public Farm. Gated on knowing Ad Hominem **and** finishing Hetty. |

**File numbers are creation order, not ladder order.** `020`–`022` were written after
`010`–`015`. `LEVEL_1_SCENARIOS` in [`src/data/levels.ts`](../src/data/levels.ts) is the
only thing that decides sequence, and it also drives the main menu.

Rung 1.9 follows the 10-beat order in [plan_002.md](./to_process/plan_002.md) exactly; Rue
is the **opposition** (Tobias proposes).

Overworld gates: Hetty will not speak at all until Ad Hominem is known (`gateTalk` plus
`fallacy_known` on 1.2). Duchess offers the boss debate; it requires knowing Ad Hominem
**and** the `hetty-ad-hominem-witnessed` flag, but she still talks when locked. Cass's 1.1
is the only playable door at a fresh start. The main menu lists every rung ungated.

---

## Part 2 — The rungs

### 1.1 — "The Name of the Trick" (Cass)

*Flags: analysis on, insight hidden, moderator hidden, recap off, intro summary off,
`revealChoiceAssessment: true`, `encounterKind: 'sparring'`. Rewards:
`teachesFallacies: ['ad-hominem']`, `setsDialogFlags: ['cass-named-ad-hominem']`.*

Cass spent eleven seasons on the floor and was never once *answered* — only ever met with
"well, she would say that, she's a fox." Then her voice went and she stopped turning up.

Six rounds. She sets up her own history (1–2), makes Rue commit the fallacy (3), debriefs
what he just did (4), does it back to him in Tobias's voice (5, `requiresAnalysis`), and
names it (6).

**Round 3 is the load-bearing beat: all three options are insults.** Cass asks for the
first thing in his head — *about her, pointedly not about the pond* — and every available
answer is an Ad Hominem, `quality: 'logical_fallacy'`, `impact: 0`. There is no way to be
polite, and that is the design:

| | Angle | Line |
|---|---|---|
| **A** | species | "You are a fox. Foxes say whatever suits them…" |
| **B** | record | "You lost. Eleven seasons and you lost every one of them…" |
| **C** | motive | "You only care about any of this because you are bitter." |

Nothing is punished — the moderator is hidden and every impact is zero — so the player
commits the fallacy without being scored for obeying an instruction. Each option has its own
reply from Cass, and round 4 collects all three: *"You did not argue with me. You priced me.
My tail, my record, my mood — three ways of saying she does not count, and not one of them
says why."*

> **The teaching here is carried by dialogue, on purpose.** 1.1 sets both
> `revealChoiceAssessment: true` and `showRoundRecap: false`, and the recap modal is the only
> surface that renders an option's `reason` — so in this rung the assessments never appear.
> That is why round 4 exists as its own beat rather than being folded into round 5. The
> `reason` strings are still authored and still correct (species / record / motive are three
> different ways of pricing an animal); they would surface immediately if the recap were
> switched on, which it is not, because five NPC rounds would each get a "Round complete."
> modal for nothing.

Three tutorials: what this is (`introduction:start`), **there is no right answer here**
(`round:start` / `round-3`), and how to spot it (`round:start` / `round-5`, two steps).
Do **not** add a step targeting an option in round 3 — the point is that any of the three
works — and do not add a fourth step targeting Continue in round 5, because the analysis
modal is covering it by then.

### 1.2 — "All About You" (Hetty)

*Three NPC rounds, all `requiresAnalysis`. `setsDialogFlags: ['hetty-ad-hominem-witnessed']`.
No `teachesFallacies` — the player already knows it by the time they can play this. Gated on
`fallacy_known` / Ad Hominem.*

She never once mentions the water. That is the point, and she says it *to you*, not about
you to somebody else. Three angles, one per round: the bins, the state of his fur, the six
weeks. Every one bookended with warmth — "I say it with love", "I am not a gossip", "that
is the sort of friend I am".

Round 2 carries her gag in full: *"An animal who cannot keep himself tidy is hardly the
animal you would ask about anything that matters, is he. Is he. No."* — then, "There. You
agree with me."

> Finishing this — however badly — is the second key on Duchess's door. Spotting is not
> required. The overworld will not open her conversation at all until Ad Hominem is known.

### 1.3 — "What Hetty Saw" (Hetty)

Round 1 dismisses whatever Rue found in the drain on the grounds that only an odd animal
would have been in one — the first time the level attacks the *evidence-gathering* rather
than the animal's origins. Round 2 is **entirely clean** and plants the **bent grate**,
which Hetty saw herself, chasing a moth, and considers roughly as interesting as weather.

> A round with no fallacy in it is deliberate: it teaches that not every sentence is a trap,
> and it is the only way to teach the **Clean** button.

### 1.4 — "Answer Me" (Cass)

*Analysis **off**, `revealChoiceAssessment: true`. Two player rounds, each an
`opponentPrompt` + 3 options + 3 `opponentResponses`.*

Two prompts: the plain one (six weeks does not buy you an opinion) and Tobias's favourite
soft one (the bin, offered as sympathy). A/B/C is fallacy / ineffective / effective
throughout, and Cass's verdict replaces the score. Her single most useful line lands here:
*"You did not defend yourself, you made me look at the drain. Never defend yourself, Rue.
Redirect."*

### 1.5 — "Forty-One" (Bram)

*Picker now shows two fallacies.*

Bram comes to be fair to you and would rather nobody saw him do it. Round 1 is the
headcount, twice. Round 2 is an Ad Hominem he apologises for mid-sentence, an Appeal to
Popularity he reaches for instead, and then — as an afterthought, filed under "different
thing" — the bent grate.

> The player now has the drain confirmed by the *other side*, from an animal who does not
> think he has said anything.

### 1.6 — "Looking Twice" (Bram teaches Insight)

*`startingInsightPoints: 2`, insight visible, moderator hidden, `encounterKind: 'gossip'`.
Two NPC rounds, both `requiresAnalysis`.*

Bram's survival habit is that he never answers anything the first time he hears it. He
demonstrates the shape he guards against — three true things and then a fourth riding out on
the nodding — first with a bin (Ad Hominem, round 1, four sentences) and then with a
headcount (Appeal to Popularity, round 2).

**Insight is optional in Level 1, and the fiction says so out loud.** Round 2 closes with
*"You will not need any of this on Sunday. You will have had time to think. I need it
because I get one look at a room before it has decided about me."* No rung requires a spend;
this one seeds exactly `HELP_INSIGHT_COST` so a single spend is affordable and the lesson
costs the whole loan.

Three tutorial steps, all on target kinds that already exist: `analysis_resources` (the
counter), then `analysis_action: 'help'`, then `analysis_action: 'help_confirm'`. The
counter step targets `debate_log_moderator_score`, which forces the Debate Log to expand
before the tutorial opens — see `tutorialNeedsDebateLog`.

### 1.7 — "Dirty Paws" (the Lab)

*`targetQuality: 'logical_fallacy'`, `revealChoiceAssessment: true`, analysis on (needed
for round 3), `preventOptionsShuffle: true` on the two lab rounds.*

"You cannot catch a thief without picking a pocket," says Cass, who is aware of how that
sounds coming from a fox. In here the dirty answer is the marked answer.

- **Round 1** — make the yard dislike Bram without touching his argument. A is Ad Hominem
  (**+15**, the goal), B is a structural critique (0, boring), **C is the true, clean,
  evidence-led answer and scores 0 — never negative.** The Lab must never make honesty cost
  something.
- **Round 2** — make a fence feel settled with no reason at all. A is Appeal to Popularity
  (**+15**), B is Ad Hominem (**+8** — right instinct, wrong dirt), C is "personally" (0).
- **Round 3** — the twist. Cass fuses **both** fallacies into one sentence aimed at Rue and
  makes him tag both: *"the whole yard already knows a raccoon cannot be trusted near
  water."*

### 1.8 — "The Bent Grate" (skirmish)

*Full chrome: analysis on, `startingInsightPoints: 1`, moderator gauge on, recap on.
3 rounds. `setsDialogFlags: ['bram-grate-conceded']`.*

Bram's rehearsed courtesy at the fence line the evening before. Round 1 (`impact: -10`,
`requiresAnalysis`) is the headcount and the six weeks. Round 2's option **C is locked**
behind `unlockCondition: { round-1, s-r1-3, ad-hominem }` — the first time speaking and
spotting touch — and offers him a walk to the outflow with Rue's whole case staked on what
they find. He concedes on the spot, tries to keep the other half of his case, and gives up
halfway through the sentence.

### 1.9 — "The Pond Motion" (boss)

*Full defaults. `playerSide: 'opposition'`, `startingInsightPoints: 2`,
`availableLogicalFallacies: ['ad-hominem', 'appeal-to-popularity', 'false-dilemma']` — one
Level-2 distractor, per the "few other fallacy types" rule in
[logical_fallacies_distribution.md](./logical_fallacies_distribution.md). Talking to
**Duchess** starts this; Tobias at the barn will only ever point you at her.*

Duchess is in `characters` and on stage and **speaks not one line** — she is the moderator,
which in this engine means the centre stage slot and the score emoji.

| # | Beat | Content |
|---|---|---|
| 1 | NPC — Tobias, opening | The count (**appeal-to-popularity**) and the bin, offered as sympathy (**ad-hominem**). First wrong name. |
| 2 | Player — opening | **C** *effective:* the pond is the farm's only clean water, the fouling has a cause, the cause can be looked at this evening. |
| 3 | Player — crossfire, Rue asks | **C:** "Of the forty-one — how many have walked down to the outflow?" He has to say he does not know. |
| 4 | Player — crossfire, Tobias asks | `opponentPrompt` fuses **both** fallacies into one gracious sentence. **C** takes it apart and answers only the part about the water. |
| 5 | NPC — Tobias, rebuttal | The set piece: the mud cart and the bin (**ad-hominem**), then two roads and only two (**false-dilemma**). The round the player must analyse. |
| 6 | Player — rebuttal | **C** is gated on tagging the ad-hominem in round 5 *and* on `bram-grate-conceded`. Pays off *"what I am versus what happened"* and quotes Bram — possible only if the player actually went to the fence. |
| 7 | Player — crossfire, Tobias asks | The bandwagon closer. **C:** agreeing is not checking, and nobody has said what they checked. |
| 8 | Player — crossfire, Rue asks | The exit question: if the grate is fixed and the pond clears, does the motion lapse? He cannot say yes without conceding cause. |
| 9 | NPC — Tobias, closing | Pure **appeal-to-popularity** with one last gentle **ad-hominem**, so the last thing the floor holds is a fact about Rue's supper. |
| 10 | Player — closing | **C:** "He is right that I eat out of the bins. Tuesdays are the good day. That is also how I know what is in your water — I have had my arm in that drain up to the shoulder, and not one of the forty-one has. So straighten the grate. If the pond has not run clear by the frost, put the motion again and I will haul the fence posts myself." |

Round 10 carries `opponentResponses`, which is unusual for a closing beat and is there for
one reason: Tobias gets the last word, and against **C** he uses Rue's name correctly for
the first time all evening, works out why he had not been, and offers to hold the lamp.

Round 10's C concedes falsifiability, which is the exact opposite of both fallacies — the
level's thesis in one line, and the answer to the insult rather than a defence against it.

---

## Scenario files

| Rung | File | Key mechanics |
|---|---|---|
| 1.1 | `020_cass_teaches_ad_hominem.json` | `sparring`; `teachesFallacies` + `setsDialogFlags`; round 3 all-fallacy options; round 5 `requiresAnalysis` |
| 1.2 | `021_hetty_ad_hominem_barrage.json` | `gossip`; `requires` on `fallacy_known`; `setsDialogFlags` |
| 1.3 | `010_gossip_trough_hetty.json` | `gossip`; `requiresAnalysis` on both rounds; round 2 entirely clean |
| 1.4 | `011_sparring_cass_ad_hominem.json` | `sparring`; `analysisEnabled: false`, `revealChoiceAssessment: true` |
| 1.5 | `012_gossip_trough_bram.json` | as 1.2, with two fallacies on the picker |
| 1.6 | `022_bram_teaches_insight.json` | `gossip`; `startingInsightPoints: 2`; the Help-spend tutorial |
| 1.7 | `013_lab_cass_dirty_tricks.json` | `lab`; `targetQuality: 'logical_fallacy'`, `preventOptionsShuffle` |
| 1.8 | `014_skirmish_bram_fenceline.json` | full chrome; `unlockCondition` on option C of round 2; `setsDialogFlags` |
| 1.9 | `015_tobias_vs_rue.json` | full defaults; `requires` on Ad Hominem **and** Hetty's flag; round 6 C ANDs an in-debate spot with Bram's flag |

## Encounter framing

Only rungs 1.8 and 1.9 are debates. The others set `mechanics.encounterKind`, which swaps
the UI copy so the game stops calling a fence-line conversation a debate:

| kind | log panel | closing line | Proposition / Opposition badges |
|---|---|---|---|
| `debate` | Debate Log | "The debate is finished." | shown |
| `gossip` | Trough Talk | "There is nothing more to overhear." | hidden |
| `sparring` | Sparring Log | "That is the session done." | hidden |
| `lab` | Lab Notes | "That is the exercise done." | hidden |

It also swaps the opening guidance in the wizard, and the introduction card's stripe reads
"Setting" instead of "Moderator" where there is no moderator. `encounterKind` is
presentation only — it never changes behaviour. A skirmish stays a `debate` because it is
one beat of one, using the same chrome.

## Tutorials

Only the **first** encounter of each mechanic type carries one, and each is deliberately
tiny:

| Rung | Steps | Teaches |
|---|---|---|
| 1.1 teaching | 4 (1 + 1 + 2) | No score; there is no right answer in round 3; open the magnifying glass; tag the sentence about *you*. |
| 1.3 gossip | 4 (1 + 3) | This is not a debate; open a Debate Log card, then its magnifying glass; Continue is locked until you judge, including **Clean**. |
| 1.4 sparring | 2 | Practice bout, nothing at stake; three lines, only one answers her. |
| 1.6 insight | 4 (1 + 1 + 2) | What Insight is and that you never need it; where the counter lives; Help and its confirmation. |
| 1.7 lab | 2 | The dirty answer is the winning answer — and why, plus "never on the floor". |
| 1.8 skirmish | 2 | The moderator emoji and the Insight counter; one line is locked until you spot the fallacy. |

1.2, 1.5 and 1.9 carry none: they repeat a mechanic the player has already met. The lab's
two steps are the one place a tutorial is load-bearing rather than convenience — a mode that
rewards committing a fallacy needs its framing stated outright.

Messages use the tutorial rich-text grammar, which supports only `**bold**` and the six
colour tags (`accent`, `danger`, `warning`, `success`, `info`, `muted`). A lone `*` renders
literally — there is no italic. The same is true of spoken dialogue: the wizard renders
plain text, so an asterisk in a scenario line shows up as an asterisk.

## Notes for future levels

- The **bent outflow grate** is the level's discoverable fact. Planted as gossip (1.3 round
  2), conceded by the opposition without their noticing (1.5 round 2), put on the record
  with a witness (1.8), and cashed in twice in the boss debate (rounds 6 and 10). It is also
  the natural first target if the "Investigation Day" mode in `pitch/002` is built.
- The teaching phrase **"what I am" versus "what happened"** is handed to the player by Cass
  in 1.1 and paid off in boss round 6. Later levels should introduce their own.
- **The insult is the evidence.** Rue's answer to "you eat out of the bins" is never a
  denial; it is "yes, and that is why I know." Any later level that teaches a fallacy aimed
  at *who someone is* should look for the same move, because it is the only one that beats
  an Ad Hominem without becoming one.
- **Insight is optional and stays optional.** Nothing in Level 1 requires a spend, and Bram
  says so in the encounter that teaches it. If a later level makes Insight mandatory, that
  is a promise being broken and it should be broken on purpose.
