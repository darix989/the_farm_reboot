# Level 1 — The Pond Motion

The authoring source of truth for Level 1: the story, the cast, the ladder of scenarios,
and the intent of every rung. Scenario JSON under `src/data/debates/010_*` … `015_*`,
`020_*` … `022_*` and `030_*` … `031_*` is transcribed from this document — when the two
disagree, this document is wrong and should be corrected to match what shipped.

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
over by Cass in rung 1.2 and paid off in the boss debate, is: **"what I am" versus "what
happened."**

### Cast

Every character is the animal their sprite draws — see
[characters-and-animations.md](./characters-and-animations.md).

| Name | Species | Role | Voice | Running gag |
|---|---|---|---|---|
| **Rue** | Raccoon | Player. Six weeks in; hauling and repairs. | Plain, literal, entirely unembarrassed about the bins. | Volunteers an incriminating detail nobody asked for. It keeps turning out to matter. |
| **Cass** | Fox (she) | Coach. Eleven seasons on the Public Farm floor. | Cranky, dry, fond of Rue in a way she would deny. Runs the sparring post and the Lab. | Pre-empts the fox line herself, and is quietly furious that it still works. |
| **Hetty** | Sheep | The trough. Will not speak until you can name Ad Hominem. | Warm, relentless, entirely without malice or self-awareness. | Asks a question, answers it herself, thanks you for agreeing. |
| **Bram** | Wolf | The fence line. Teaches how a conversation works, then Insight. | Anxious, over-polite, apologises mid-sentence. | "I'm not saying it because I'm a wolf." |
| **Tobias** | Donkey | Boss antagonist. Speaks for the Meadow-Born. | Warm, gracious, never raises his voice. Sincere, and lethal. | Never gets Rue's name right — Roo, Rufus, Ruin. |
| **Duchess** | Owl | Moderator of the Public Farm. Talking to her starts the boss debate. | Old, tired, scrupulously fair. She *is* the moderator gauge. | Declines to hold an opinion about anything, including the weather. |
| **Dot** | Dog | Yard greeter. No encounter. | Direct, breathless, kind. | Starts three sentences, finishes one. |

Antagonists are sincere, not villainous — the house style established in `pitch/001`.
**Cass is the reason Bram works**: two animals with the same problem, one who fought it for
eleven seasons and one who bought his way out by agreeing louder than anybody in the crowd.

### How you arrive

**Dot** stands in the yard just off spawn, and her conversation opens on its own the first
time the farm loads. It is deliberately unhurried — the level's only cold open, so it does
not read as one. She asks after Rue first (six weeks, the hauling, the bins) and notices he
is being talked about three steps away; that is what turns the conversation to the week the
farm is having. Then the motion: Tobias wants the Old Pond drained, filled and forgotten,
heard Sunday in front of Duchess, and **not one animal will speak against it**. Rue
volunteers himself for the floor — the player is not assigned the fight, they take it — and
only then does Dot mention that there are rules nobody has written down, which is where the
goals come from: **Bram** first, at the fence, then Cass at the west post, then Hetty at the
trough, then the barn. Closing her talk early does not count: the `dot-welcomed` flag is set
only when the last beat's reveal settles. She has no encounter; her farm talk advances as you
do those things. She pointedly refuses to warn you about the fox.

### The ladder

Each rung adds exactly one thing. Quickest gameplay first, boss last. The spine is a
mechanics-then-fallacy ladder: Bram teaches how a round works, Cass names Ad Hominem, Hetty
uses it, Cass names Appeal to Popularity, Hetty uses that too, Bram teaches the locked line
and then argues the motion properly, and Tobias requires all of it.

| # | Scenario | Mode | Teaches | Fallacies on the picker | New for the player |
|---|---|---|---|---|---|
| 1.1 | `030_bram_teaches_dialog` | Lesson | **How a round works** / how you speak | — | A conversation is one animal, then the other. Three options, no wrong one. Brief look at the moderator emoji and Field Notes **Next**. |
| 1.2 | `020_cass_teaches_ad_hominem` | Sparring | **The name** of Ad Hominem | ad-hominem | Analysis via the footer magnifying glass. Fallacy known on leave. |
| 1.3 | `021_hetty_ad_hominem_barrage` | Gossip | **Spotting it in the wild**, three times | ad-hominem | Gated on knowing Ad Hominem. Sets the flag the rest of the level hangs off. |
| 1.4 | `023_cass_teaches_appeal_to_popularity` | Sparring | **The name** of Appeal to Popularity | ad-hominem, appeal-to-popularity | Two icons on the picker, and a round carrying **two** fallacies at once. |
| 1.5 | `010_gossip_trough_hetty` | Gossip | A **clean** round; the bent grate | ad-hominem, appeal-to-popularity | Not every sentence is a trap — and the two tricks side by side in one breath. |
| 1.6 | `032_bram_teaches_unlocks` | Lesson | **The locked line** — spotting and speaking meet | ad-hominem | An option that cannot be said until the fallacy in the previous round is tagged. |
| 1.7 | `014_skirmish_bram_fenceline` | Skirmish | Speaking **and** spotting together | ad-hominem, appeal-to-popularity | Full chrome and the moderator gauge, plus the unlock-gated option for real. Sets the grate flag. |
| 1.8 | `015_tobias_vs_rue` | Boss debate | Everything, over 10 beats | + false-dilemma (distractor) | Full Public Farm. Gated on both fallacies **and** Bram's concession. |

**File numbers are creation order, not ladder order.** `020`–`023` were written after
`010`–`015`; `030`–`032` after those. `LEVEL_1_SCENARIOS` in [`src/data/levels.ts`](../src/data/levels.ts) is the
only thing that decides sequence, and it also drives the main menu.

Rung 1.8 follows the 10-beat order in [plan_002.md](./to_process/plan_002.md) exactly; Rue
is the **opposition** (Tobias proposes).

**Insight Points and round-type labels are deferred out of Level 1.** Nothing here unlocks
`insight_points` or `round_types`, so the Insight counter, the Help button and the
`— crossfire` half of the round label never appear. Five encounters were cut with them and
are **parked**, not deleted — `031_bram_teaches_crossfire`, `011_sparring_cass_ad_hominem`,
`012_gossip_trough_bram`, `022_bram_teaches_insight` and `013_lab_cass_dirty_tricks` live in
`LEGACY_SCENARIOS`, off the farm and out of the goal spine, still playable from the main
menu. Their write-ups are kept at the end of Part 2.

Overworld gates: the spine walks Bram → Cass → Hetty → Cass → Hetty → Bram → Bram → Duchess.
Bram will not speak until Dot's welcome has been played to the end (`gateTalk` plus
`dot-welcomed`); Cass will not until Bram has taught rounds; Hetty will not until Ad Hominem
is known. Duchess still talks when locked. Each animal offers its encounters strictly in
list order and never skips ahead (`farmDialogueState.ts`), which is what guarantees Bram's
locked-line lesson lands before the skirmish that needs it. The main menu lists every rung
ungated.

⚠️ **`gateTalk` has one carve-out** (`src/utils/farmTalkGate.ts`): an animal who has already
taught a lesson is never silenced. Bram's 1.6 sits behind a fallacy *Cass* teaches, so
without it he would go quiet for the whole middle of the level and take his lesson-replay
menu with him. He greets you instead, with Talk disabled and the reason on the button.

Field Notes' **Next** tab is that same spine, one main goal per rung (`src/data/levelGoals.ts`,
aligned with Dot's seven `talkStages`). Level 1 has no optional goals, so the Optional
section never renders.

---

## Part 2 — The rungs

### 1.1 — "One at a Time" (Bram teaches dialog)

*Flags: analysis off, insight hidden, moderator visible, recap off, intro summary off,
`revealChoiceAssessment: true`, `encounterKind: 'lesson'`, `showRoundType: false`. Rewards:
`setsDialogFlags: ['bram-taught-rounds']`. Gated on `dot-welcomed`.*

Rue comes to the fence and asks for help — Dot sent him — and Bram is startled that anyone
would walk down to the wolf. He says what he does all day (walks the fence, both ways, and
overhears every conversation on this farm from the far side of a hedge) before he offers the
lesson, and he is still apologising for giving it. A conversation here goes in
**rounds**: one animal says a thing, the other answers, and that pair is a round. Four
beats. He explains (1), you speak (2, three options, no wrong one, `preventOptionsShuffle`;
A is impact 0, B and C are a light +8 so the face can move), he closes (3): *"That was a
round. That is the whole of it."*, then a goodbye (4): he sends Rue on to Cass and
apologises for having kept him. No fallacy appears in this file at all.

Four tutorials, all `medium` — the copy in each is two short paragraphs, and a larger box
frames whitespace: what a round is (`introduction:start`, wizard); now you speak
(`round:start` / `round-2`, interactive); then after confirm, the moderator emoji **on the
collapsed recap chip** (`debate_log_recap_moderator_score`) and the expand arrow
(`debate_log_panel_toggle`); then Field Notes **Next** on `round:start` / `round-4` (no
target — the Codex is a global overlay with no tutorial hook). The log stays collapsed
here, unlike 1.8. Completing the lesson flips Next from Bram to Cass (and reveals the
optional crossfire goal).

### 1.2 — "The Name of the Trick" (Cass)

*Flags: analysis on, insight hidden, moderator hidden, recap off, intro summary off,
`revealChoiceAssessment: true`, `encounterKind: 'sparring'`. Rewards:
`teachesFallacies: ['ad-hominem']`, `setsDialogFlags: ['cass-named-ad-hominem']`.*

Cass spent eleven seasons on the floor and was never once *answered* — only ever met with
"well, she would say that, she's a fox." Then her voice went and she stopped turning up.

Seven rounds. She sets up her own history (1–2), makes Rue commit the fallacy (3), debriefs
what he just did (4), does it back to him in Tobias's voice (5, `requiresAnalysis`), names it
(6) and sends him off her post (7). Round 2 states the deal plainly — the name comes at the
end, once he has felt it, because a name you are handed is gone by Sunday — rather than
teasing a name it will not say. Round 6 also points at Field Notes after Leave: **Fallacies
you know** is the name she just gave; **Fallacies you have spotted** is the line they tagged.
She does not repeat **Next** — Bram already sent them there.

The lines the lesson turns on carry inline
[emphasis](./encounters.md#emphasis-inside-a-spoken-line): the clause about her tail in the
introduction, *"You did not argue with me. You priced me."* and *"That is the trick."* in
round 4, the bins remark inside Tobias's line in round 5, and **Ad Hominem**, **Field Notes**
and the two list names in round 6.

**Round 3 is the load-bearing beat: all three options are personal attacks.** Cass asks for the
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

### 1.3 — "All About You" (Hetty)

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

### 1.4 — "How Many, Not How" (Cass names Appeal to Popularity)

*`sparring`; same flags as 1.2. `teachesFallacies: ['appeal-to-popularity']`,
`setsDialogFlags: ['cass-named-appeal-to-popularity']`. Gated on
`hetty-ad-hominem-witnessed`. Five rounds.*

Rue comes back to the west post already stung, and Cass opens on a number instead of an
argument: **forty-one**. The shape is deliberately the same as 1.2, because the second
naming should feel like the first — she makes him commit the trick before she will name it.

Round 2 is the all-options round: every one of the three argues the motion from the size of
the crowd, so there is no right answer and the lesson is in noticing that. Round 3 says what
he just did. Round 4 is the `requiresAnalysis` beat, and it is the level's real difficulty
step: playing Tobias, she runs **both** tricks back to back in one friendly breath — the
tally, then the jab about the drain — and the picker has two icons on it for the first time.
Round 5 hands over the phrase: *how many, against how do you know*, and sends him to Hetty.

> The forty-one used to be Bram's line, in the gossip rung that is now parked. Cass takes it
> over so the boss's `s-r5-*` callback is still earned.

### 1.5 — "What Hetty Saw" (Hetty)

*Now also `setsDialogFlags: ['hetty-grate-heard']`, which is what opens Bram's last two
rungs — this is the rung that hands over the fact the level turns on, so finishing it has to
be on the record.*

Round 1 dismisses whatever Rue found in the drain on the grounds that only an odd animal
would have been in one — the first time the level attacks the *evidence-gathering* rather
than the animal's origins — and then closes it all down with a headcount (`s-r1-4`,
appeal-to-popularity), which is the practice for what Cass has just named. Round 2 is
**entirely clean** and plants the **bent grate**, which Hetty saw herself, chasing a moth,
and considers roughly as interesting as weather.

> A round with no fallacy in it is deliberate: it teaches that not every sentence is a trap,
> and it is the only way to teach the **Clean** button. Round 1 carrying two different
> fallacies and round 2 carrying none, back to back, is the whole exercise.

### 1.6 — "The Line You Have to Earn" (Bram teaches the locked line)

*`lesson`; `analysisEnabled: true` — the one lesson that needs the magnifying glass —
`maxAnalysisAttempts: 5`, everything else hidden, `revealChoiceAssessment: true`.
`setsDialogFlags: ['bram-taught-unlocks']`. Gated on `fallacy_known: ad-hominem`. Four rounds.*

The mechanic this rung exists for is the only one where spotting and speaking touch: an
option with an `unlockCondition`, greyed out until the player tags a specific fallacy on a
specific sentence. Until now the player met it cold in the skirmish, with a popup for
explanation. Bram teaches it instead, the only way he can — by doing something unkind on
purpose so that there is something to catch.

Round 1 sets it up and apologises in advance. Round 2 is `requiresAnalysis`: Bram plays
somebody at the trough who would rather the pond were not discussed, and puts an Ad Hominem
about drains in the middle of it (`s-r2-3`), then breaks character to say it was meant to be
horrible. Round 3's option C carries
`unlockCondition: { round-2, s-r2-3, ad-hominem }` — it reads `locked` until the tag lands,
and it is the only one of the three that names the move and hands the question back. Round 4
gives the habit to keep: look at what they said before you look at what you want to say.

Four tutorial steps, and the last one is the point: an unlocked option needs **two** clicks —
one to reveal, one to say — which nothing else in the game explains. It fires on
`interactive:statement_unlocked`, so it only appears once the player has actually opened it.

> `maxAnalysisAttempts` is raised from 3 to 5 here. Burning every attempt would leave the
> payoff option shut for good, which is a dead end in the rung that teaches unlocking.

### 1.7 — "The Bent Grate" (skirmish)

*Full chrome: analysis on, `startingInsightPoints: 1`, moderator gauge on, recap on.
3 rounds. `setsDialogFlags: ['bram-grate-conceded']`.*

Bram's rehearsed courtesy at the fence line the evening before. Round 1 (`impact: -10`,
`requiresAnalysis`) is the headcount and the six weeks. Round 2's option **C is locked**
behind `unlockCondition: { round-1, s-r1-3, ad-hominem }` — the mechanic 1.6 exists to
teach, now under full chrome and with nothing prompting you — and offers him a walk to the outflow with Rue's whole case staked on what
they find. He concedes on the spot, tries to keep the other half of his case, and gives up
halfway through the sentence.

### 1.8 — "The Pond Motion" (boss)

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

## Parked — cut from the Level 1 ladder

These five were rungs until Level 1 was trimmed to eight. The JSON, the prose and the
tutorials are all still in the tree and still playable from **Other scenarios** on the main
menu; they are simply off the farm, out of `LEVEL_1_SCENARIOS` and out of the goal spine.
Their write-ups are kept because the next level will want the shapes.

### "Answer Me Now" (Bram teaches crossfire)

*Same lesson flags as 1.1, except `showRoundType: true` and the moderator is hidden again.
Rewards: `setsDialogFlags: ['bram-taught-crossfire']`, `unlocksFeatures: ['round_types']`.
Gated on `bram-taught-rounds`. Available after 1.1 but not required for Cass.*

Some rounds are not speeches. Somebody asks and you answer on your feet. They call that
**crossfire**. Four beats: he names it (1), he asks and you answer (2, NPC-raises), you ask
and he has to answer (3, player-raises), he closes (4). This is where the word first appears
on the round label.

One tutorial on `round:start` / `round-2`, pointing at the round label.

Bram's farm talk offers a lettered **Lessons** menu for any lesson he has already taught.

### "Answer Me" (Cass)

*Analysis **off**, `revealChoiceAssessment: true`. Two player rounds, each an
`opponentPrompt` + 3 options + 3 `opponentResponses`.*

Two prompts: the plain one (six weeks does not buy you an opinion) and Tobias's favourite
soft one (the bin, offered as sympathy). A/B/C is fallacy / ineffective / effective
throughout, and Cass's verdict replaces the score. Her single most useful line lands here:
*"You did not defend yourself, you made me look at the drain. Never defend yourself, Rue.
Redirect."*

### "Forty-One" (Bram)

*Picker now shows two fallacies.*

Bram comes to be fair to you and would rather nobody saw him do it. Round 1 is the
headcount, twice. Round 2 is an Ad Hominem he apologises for mid-sentence, an Appeal to
Popularity he reaches for instead, and then — as an afterthought, filed under "different
thing" — the bent grate.

> The player now has the drain confirmed by the *other side*, from an animal who does not
> think he has said anything.

### "Looking Twice" (Bram teaches Insight)

*`startingInsightPoints: 2`, insight visible, moderator hidden, `encounterKind: 'gossip'`.
`unlocksFeatures: ['insight_points']`. Two NPC rounds, both `requiresAnalysis`.*

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

### "Dirty Paws" (the Lab)

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

---

## Scenario files

| Rung | File | Key mechanics |
|---|---|---|
| 1.1 | `030_bram_teaches_dialog.json` | `lesson`; moderator visible; light +8 on the restatements; `showRoundType: false`; no fallacies; `preventOptionsShuffle`; `setsDialogFlags` |
| 1.2 | `020_cass_teaches_ad_hominem.json` | `sparring`; `teachesFallacies` + `setsDialogFlags`; round 3 all-fallacy options; round 5 `requiresAnalysis` |
| 1.3 | `021_hetty_ad_hominem_barrage.json` | `gossip`; `requires` on `fallacy_known`; `setsDialogFlags` |
| 1.4 | `023_cass_teaches_appeal_to_popularity.json` | `sparring`; `teachesFallacies` + `setsDialogFlags`; round 2 all-fallacy options; round 4 `requiresAnalysis` with **two** fallacies in one statement |
| 1.5 | `010_gossip_trough_hetty.json` | `gossip`; `requiresAnalysis` on both rounds; two fallacies in round 1, round 2 entirely clean; `setsDialogFlags` |
| 1.6 | `032_bram_teaches_unlocks.json` | `lesson` with `analysisEnabled: true` and `maxAnalysisAttempts: 5`; `unlockCondition` on option C of round 3; `setsDialogFlags` |
| 1.7 | `014_skirmish_bram_fenceline.json` | full chrome; `unlockCondition` on option C of round 2; `setsDialogFlags` |
| 1.8 | `015_tobias_vs_rue.json` | full defaults; `requires` on both fallacies **and** Bram's flag; round 6 C ANDs an in-debate spot with that same flag |

Parked, and no longer rungs: `031_bram_teaches_crossfire.json`,
`011_sparring_cass_ad_hominem.json`, `012_gossip_trough_bram.json`,
`022_bram_teaches_insight.json`, `013_lab_cass_dirty_tricks.json`.

## Encounter framing

Only rungs 1.7 and 1.8 are debates. The others set `mechanics.encounterKind`, which swaps
the UI copy so the game stops calling a fence-line conversation a debate:

| kind | log panel | closing line | Proposition / Opposition badges |
|---|---|---|---|
| `debate` | Debate Log | "The debate is finished." | shown |
| `gossip` | Trough Talk | "There is nothing more to overhear." | hidden |
| `sparring` | Sparring Log | "That is the session done." | hidden |
| `lab` | Lab Notes | "That is the exercise done." | hidden |
| `lesson` | Lesson Notes | "That is the lesson done." | hidden |

It also swaps the opening guidance in the wizard, and the introduction card's stripe reads
"Setting" instead of "Moderator" where there is no moderator. `encounterKind` is
presentation only — it never changes behaviour. A skirmish stays a `debate` because it is
one beat of one, using the same chrome.

## Tutorials

Only the **first** encounter of each mechanic type carries one, and each is deliberately
tiny:

| Rung | Steps | Teaches |
|---|---|---|
| 1.1 lesson | 4 (1 + 1 + 2) | What a round is; now you speak, three ways, no wrong one; the moderator emoji; Field Notes **Next**. |
| 1.2 teaching | 4 (1 + 1 + 2) | No score; there is no right answer in round 3; open the magnifying glass; tag the sentence about *you*. Closing dialogue points at the two fallacy tabs. |
| 1.4 teaching | 4 (1 + 1 + 2) | Same three beats as 1.2, and then: **two** sentences are doing something this time, tag both. |
| 1.5 gossip | 4 (1 + 3) | This is not a debate; open a Debate Log card, then its magnifying glass; Continue is locked until you judge, including **Clean**. |
| 1.6 lesson | 5 (1 + 2 + 1 + 1) | Some answers are locked; open the glass and tag him; the third line only exists because you caught him; **one click opens it, a second says it**. |
| 1.7 skirmish | 1 | Full chrome: the moderator emoji and the Insight strip together. |

1.3 and 1.8 carry none: they repeat a mechanic the player has already met. 1.7 used to carry
a second step explaining the locked option; 1.6 now teaches that properly, so the reminder
was removed rather than said twice.

Messages use the tutorial rich-text grammar, which supports only `**bold**` and the six
colour tags (`accent`, `danger`, `warning`, `success`, `info`, `muted`). A lone `*` renders
literally — there is no italic. The same is true of spoken dialogue: the wizard renders
plain text, so an asterisk in a scenario line shows up as an asterisk.

## Notes for future levels

- The **bent outflow grate** is the level's discoverable fact. Planted as gossip (1.5 round
  2), put on the record with a witness (1.7), and cashed in twice in the boss debate (rounds
  6 and 10). It is also the natural first target if the "Investigation Day" mode in
  `pitch/002` is built. It used to be conceded a third time in the parked gossip rung; the
  trimmed ladder gets it from Hetty and then from Bram under pressure, which is enough.
- The teaching phrase **"what I am" versus "what happened"** is handed to the player by Cass
  in 1.2, and **"how many, against how do you know"** in 1.4. Both are paid off in boss round
  6. Later levels should introduce their own.
- **The insult is the evidence.** Rue's answer to "you eat out of the bins" is never a
  denial; it is "yes, and that is why I know." Any later level that teaches a fallacy aimed
  at *who someone is* should look for the same move, because it is the only one that beats
  an Ad Hominem without becoming one.
- **Insight is not in Level 1 at all any more.** Nothing unlocks `insight_points`, so the
  counter, the pill and the Help button stay hidden the whole way through, including in the
  boss. The lesson that taught it is parked, not deleted. Whichever level picks it back up
  inherits the promise it was written with: nothing should ever *require* a spend.
- **Round-type labels go the same way.** `round_types` is never unlocked, so no round is
  labelled `— crossfire`. The lesson that named the word is parked with the rest.
