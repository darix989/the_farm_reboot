# Level 1 — The Pond Motion

The authoring source of truth for Level 1: the story, the cast, the ladder of scenarios,
and the dialog for every rung. Scenario JSON under `src/data/debates/010_*` … `015_*`
is transcribed from this document — when the two disagree, this document is wrong and
should be corrected to match what shipped.

Level 1 teaches the two simplest fallacies in the curriculum, both from Level 1 of
[logical_fallacies_intro.md](./logical_fallacies_intro.md): **Ad Hominem** (#1) and
**Appeal to Popularity** (#2). Both are social fallacies, so the fiction is a social
one — a popular in-group voting to keep an outsider away from the water.

The ladder follows `pitch/002_gradual_mechanics_onboarding.md`: each rung teaches one
verb, and the full Public Farm debate is the boss. Rungs ship as ordinary
`DebateScenarioJson` values; the smaller modes are expressed with the `mechanics` flags
documented in [`src/types/debateEntities.ts`](../src/types/debateEntities.ts).

---

## Part 1 — The story

### Premise

Green Meadows Farm's only clean water is the **Old Pond**. It has been going muddy. **Duchess**, the farm's prize goose and head of the Flock, puts a motion to the Public Farm:

> *The Old Pond shall be reserved for the Flock. Hoofed animals shall water at the road trough.*

Her case is that hooves foul the water. Her *method* is the level's two fallacies, and she is very good at both:

- **Appeal to Popularity** — "Forty-one of the Flock have already agreed. Forty-one animals are not a mistake."
- **Ad Hominem** — never crude, always gentle: "No one blames the newcomers, dear. They simply weren't raised near water."

The player is **Rue**, a young donkey who arrived six weeks ago and does the hauling. He is exactly the animal both fallacies are built to dispose of: no crowd behind him, and an easy target for "you're a donkey."

The actual cause of the mud is a **bent grate on the pond's outflow drain** — a fact the player picks up as gossip, hears confirmed by the opposition without them noticing, and finally puts on the record in front of the moderator. The level's teaching phrase, given to the player by the coach in rung 2 and paid off in the boss debate, is: **"what I am" versus "what happened."**

### Cast

| Name | Species | Role | Voice |
|---|---|---|---|
| **Rue** | Donkey | Player. Six weeks on the farm, does the hauling. | Plain, literal, hasn't learned the farm's social rules — which is why he keeps asking the question nobody wants asked. |
| **Duchess** | Goose | Boss antagonist. Head of the Flock. | Warm, gracious, never raises her voice. Sincere — she genuinely believes the pond is the Flock's. Lethal. |
| **Tobias** | Tortoise | Moderator of the Public Farm. | Old, tired, scrupulously fair. He *is* the moderator gauge. Names the tortoise the repo has been leaving unnamed. |
| **Cass** | Rooster | Coach. Ran the Public Farm floor for nine seasons before his voice went. | Cranky, impatient, fond of Rue in a way he'd deny. Runs both the sparring post and the Lab. |
| **Hetty** | Hen | The gossip at the trough. | Not malicious — she repeats what she heard and has never once checked. |
| **Bram** | Drake | Duchess's second; the skirmish opponent. | Parrots the Flock line, but he's honest, and honesty is what trips him up. |

Antagonists are sincere, not villainous — the house style established in `pitch/001`.

### The ladder

Each rung adds exactly one thing. Quickest gameplay first, boss last.

| # | Scenario | Mode | Teaches | Fallacies on the picker | New for the player |
|---|---|---|---|---|---|
| 1.1 | `010_gossip_trough_hetty` | Gossip | **Spotting**, alone | ad-hominem | Analysis modal. No speaking, no score. |
| 1.2 | `011_sparring_cass_ad_hominem` | Sparring | **Speaking**, alone | — (analysis off) | The 3-option picker. Coach's verdict instead of a score. |
| 1.3 | `012_gossip_trough_bram` | Gossip | Spotting a **second** fallacy; telling the two apart | ad-hominem, appeal-to-popularity | Two icons on the picker. A "Clean" sentence to reject. |
| 1.4 | `013_lab_cass_dirty_feathers` | Lab | **Inoculation** — commit the fallacy, then catch it | ad-hominem, appeal-to-popularity | Inverted goal; two fallacies fused in one sentence. |
| 1.5 | `014_skirmish_bram_fenceline` | Skirmish | Speaking **and** spotting together | ad-hominem, appeal-to-popularity | Insight, the moderator gauge, an unlock-gated option. |
| 1.6 | `015_duchess_vs_rue` | Boss debate | Everything, over 10 beats | + false-dilemma (distractor) | Full Public Farm. |

Rung 1.6 follows the 10-beat order in [plan_002.md](./plan_002.md) exactly; Rue is the **opposition** (Duchess proposes).

---

## Part 2 — Dialog for the new mechanics

This is the authoring source of truth; it gets committed as `docs/level_01_the_pond_motion.md` and transcribed into the scenario JSONs. Option ordering below is authoring order — the engine shuffles per playthrough unless `preventOptionsShuffle` is set.

### 1.1 — Gossip at the Trough: "What Hetty Heard"

*Flags: analysis on, insight visible, moderator hidden, recap off, intro summary off. Both rounds `requiresAnalysis: true`.*

**Introduction:** "Hetty the Hen has news. She almost always has news. The trough is low again, and she has a theory about whose fault that is. She has not quite worked out yet that you are the donkey she is talking about."

**Round 1 — Hetty** *(gossip)*
1. "Morning! Did you hear? That new donkey — Rue, I think — has been complaining about the pond drain again." — *clean*
2. "I wouldn't put much stock in it, mind. He arrived in a mud cart with straw in his ears; he's hardly the sort who'd know about water." — **ad-hominem**
3. "Anyway, the pond's been going brown since before the frost." — *clean*

**Round 2 — Hetty** *(gossip — entirely clean; teaches the "Clean" button)*
1. "The grate at the outflow is bent, you know. I saw it myself, chasing a beetle." — *clean*
2. "Water backs up behind it, so the mud goes into the pond instead of out of it." — *clean*
3. "Someone ought to tell the Flock. They don't much listen to hens." — *clean*

> Round 2 plants the **bent grate**, the evidence Rue carries all the way to round 10 of the boss. A round with no fallacy in it is deliberate: it teaches that not every sentence is a trap.

### 1.2 — Coach Sparring: "The Sparring Post"

*Flags: analysis **off**, insight hidden, moderator hidden, intro summary off, `revealChoiceAssessment: true`. Two player rounds, each an `opponentPrompt` + 3 options + 3 `opponentResponses`.*

**Introduction:** "Cass ran the Public Farm floor for nine seasons before his voice went. Now he runs a post in the yard and shouts at whoever stands at it. Today that's you. No magnifying glass, no moderator, no score. One question: which line actually answers him?"

**Round 1 — Cass's prompt** *(crossfire)*
> "Let's start easy. I'll be the Flock. *Ahem.* — 'You've been on this farm six weeks, Rue. You haven't earned an opinion about the water.' Well? Answer me."

| | Line | Cass's reaction | Assessment |
|---|---|---|---|
| **A** *fallacy, −10* | "And you've been here so long you've forgotten how to fly, you moulting old windbag." | "Ha! Good sting, terrible answer. You've just agreed this is a contest about who we are. You'll lose that one — they're prettier than you." | "You answered an Ad Hominem with an Ad Hominem. Now there are two attacks on the floor and still nothing about the water." |
| **B** *ineffective, 0* | "Six weeks and two days, actually." | "Six weeks and two days! Marvellous. Now they'll argue about the calendar and never about the drain." | "True and beside the point. Correcting the detail concedes that time-served is what matters." |
| **C** *effective, +15* | "How long I've been here doesn't change what's in the pond. Come and look at the drain, and tell me I'm wrong." | "*That's* it. You didn't defend yourself — you made me look at the drain. Never defend yourself, Rue. Redirect." | "Names the swap — the attack was about you, the question is about the water — and moves the floor to something anyone can check." |

**Round 2 — Cass's prompt** *(crossfire)*
> "Harder. This one's Duchess's favourite, so listen. — 'Nobody's blaming you, dear. It's simply that hooves and clean water don't mix. It isn't personal.' She has just insulted every hoofed animal on this farm and made it sound like weather. Answer."

| | Line | Cass's reaction | Assessment |
|---|---|---|---|
| **A** *fallacy, −10* | "Geese are filthy. Everyone knows what a goose does in a pond." | "Now it's geese against donkeys and nobody's fixing anything. She'd *let* you win that one, and you'd still lose the vote." | "A group attack answered with a group attack. The drain has left the room." |
| **B** *ineffective, 0* | "That's a very rude thing to say, and I'd like an apology." | "You'll get your apology. She's marvellous at apologies. You'll also get the trough by the road." | "It *was* rude. But now the debate is about her manners, not about whether hooves are the cause." |
| **C** *effective, +15* | "It sounds gentle, but it's still a claim about *what I am* instead of *what happened*. If hooves foul the pond, show me the hoofprints. I'll show you the bent grate." | "Good. She dresses it up, so you undress it. 'What I am' against 'what happened.' Say that in front of Tobias and he'll write it down." | "Spots a soft Ad Hominem inside a polite sentence and converts it into a question that can actually be settled." |

### 1.3 — Gossip at the Trough II: "Everyone Says"

*Same flags as 1.1. Picker now shows two fallacies.*

**Introduction:** "Bram the Drake has come to the trough to be fair to you. He thinks that is what he is doing."

**Round 1 — Bram** *(gossip)*
1. "You'll want to hear this before Sunday: the whole Flock has already agreed the pond should be ours." — **appeal-to-popularity**
2. "Forty-one of us. You can't have forty-one animals be wrong about water." — **appeal-to-popularity**
3. "Duchess puts the motion to Tobias at the Public Farm." — *clean*

**Round 2 — Bram** *(gossip)*
1. "And frankly, the only one making a fuss is the donkey, and nobody knew his name a month ago." — **ad-hominem**
2. "Everyone I've asked says the hooves are the problem." — **appeal-to-popularity**
3. "The grate at the outflow's bent, but that's been bent for ages." — *clean*

> Bram concedes the key fact without noticing it matters. The player now has the drain confirmed by the *other side*.

### 1.4 — The Cranky Rooster Lab: "Dirty Feathers"

*Flags: `targetQuality: 'logical_fallacy'`, moderator hidden, intro summary off, `revealChoiceAssessment: true`, analysis on (needed for round 3), `preventOptionsShuffle: true` on the two lab rounds.*

**Introduction (carries the ethical guardrail — pitch idea 5's caution):** "Cass wants you to do something you are not going to do again. 'You can't catch a thief without picking a pocket,' he says. In here, the dirty answer is the winning answer. In front of Tobias it will cost you the farm — and Cass will remind you. Loudly."

**Round 1 — Cass's prompt:** "Right. Make me not want to listen to Bram. Don't argue with him. I want you to make the *yard* dislike him. Go."

| | Line | Cass's reaction | Assessment |
|---|---|---|---|
| **A** *fallacy, **+15** — the goal* | "Bram spent all winter in the warm shed while the rest of us hauled feed. Why take water advice from a duck who's never been thirsty?" | "Filthy. Effective. Feel that little warm feeling? That's the feeling you'll get on Sunday when Duchess does it to you. Remember it." | "That's Ad Hominem, and it worked — you moved the yard without touching his argument. Notice how good it felt." |
| **B** *ineffective, 0* | "Bram's argument about the pond isn't very well structured." | "Nobody's listening. You've bored them. Boring is its own kind of losing, but it isn't the lesson." | "Fair — but no yard has ever changed its mind because an argument was poorly structured." |
| **C** *effective, **0** — never punished* | "Bram says hooves foul the pond, but the outflow grate is bent. That's where the mud comes from." | "Good line. Wrong classroom. Put it in your pocket and give me the dirty one." | "Clean, honest and evidence-led. Correct — and not what this exercise is for. Save it for Sunday." |

> **C scores 0, never negative.** The Lab must never make honesty cost something.

**Round 2 — Cass's prompt:** "Now the other one. I want the yard to believe the pond should be fenced, and I don't want a single reason. Not one. Just make it feel settled."

| | Line | Cass's reaction | Assessment |
|---|---|---|---|
| **A** *fallacy, **+15** — the goal* | "Every farm down the lane fenced their pond two summers ago. We're the only ones still arguing about it." | "Look at them nodding. Not one of them asked what the other farms actually did. That's the whole trick — it's a place to stand, not a thing to think." | "Appeal to Popularity. You gave them a crowd instead of a reason, and a crowd is easier to stand in than a reason is to check." |
| **B** *fallacy, **+8** — right instinct, wrong trick* | "Only the donkeys are against the fence, and donkeys are famously stubborn." | "Wrong dirt. Right instinct. Do that on Sunday and Tobias will name it before I do." | "Also dirty — but that's Ad Hominem. You attacked the objectors instead of inventing a crowd." |
| **C** *ineffective, 0* | "I think a fence would be sensible, personally." | "'Personally.' Nobody has ever won anything with 'personally.'" | "An opinion with no crowd and no reason behind it. Nobody moves." |

**Round 3 — Cass** *(NPC, `requiresAnalysis: true`, `impact: 0`) — the twist:*
1. "Right, that's enough of that. Wash your beak." — *clean*
2. "Now — the whole yard knows a donkey can't be trusted near a pond, so I don't see why we're still talking." — **ad-hominem + appeal-to-popularity** *(both, one sentence)*
3. "Tag it. Both of them. If you can't name what I just did to you, you'll never see it coming." — *clean*

### 1.5 — Fence-line Skirmish: "The Bent Grate"

*Full chrome: analysis on, insight visible (`startingInsightPoints: 1`), moderator gauge on, recap on. 3 rounds.*

**Introduction:** "Bram has caught you at the fence line the evening before the Public Farm. He calls it a courtesy."

**Round 1 — Bram** *(NPC, opening_constructive, `impact: -10`)*
1. "Rue — a courtesy, before Sunday. The Flock is putting the motion regardless." — *clean*
2. "Forty-one birds have already said yes, and forty-one is not a mistake." — **appeal-to-popularity**
3. "You'd be arguing against the whole pond, and you've been on this farm six weeks." — **ad-hominem**

**Round 2 — Rue** *(player, crossfire, with `opponentResponses`)*

| | Line | Bram's response | Impact |
|---|---|---|---|
| **A** *fallacy* | "Every donkey on this farm thinks the grate is the problem — that's four of us, and we're the ones who carry the water." | "Four donkeys against forty-one birds. Thank you, Rue. You've just made my argument for me." | −10 / −5 |
| **B** *ineffective* | "Is forty-one a majority, though? How many animals are on this farm altogether?" | "More than forty-one, I expect. But they didn't turn up, did they." | 0 / 0 |
| **C** *effective, **locked*** | "You said forty-one agreed, and that I've only been here six weeks. Neither of those is about the water. So let's do the one that is: come to the outflow with me now, and if the grate isn't bent, I'll drop it before Sunday." | "…It's bent. It's been bent since before the frost. That doesn't mean the hooves aren't *also* — look. Take it up with Duchess on Sunday." | +20 / −5 |

- **C** carries `unlockCondition: { npcRoundId: "round-1", sentenceId: "s-r1-3", fallacyId: "ad-hominem" }` — the first time speaking and spotting touch.
- **C** assessment: "Names both moves — the crowd and the newcomer jab — as things that aren't about the water, then offers a check anyone can run. Bram concedes the grate on the record."

**Round 3 — Bram** *(NPC, closing_constructive, `impact: -5`)*
1. "Sunday, then. Tobias has the motion. Duchess speaks first." — *clean*
2. "And Rue — she's much better at this than I am." — *clean*

### 1.6 — The Public Farm: "The Pond Motion" (boss)

*Full defaults. `playerSide: 'opposition'`, `startingInsightPoints: 2`, `availableLogicalFallacies: ['ad-hominem', 'appeal-to-popularity', 'false-dilemma']` — one already-taught Level-2 distractor, per the "few other fallacy types" rule in [logical_fallacies_distribution.md](./logical_fallacies_distribution.md).*

**Motion:** *The Old Pond shall be reserved for the Flock; hoofed animals shall water at the road trough.*

Beat sheet for the 10 rounds of [plan_002.md](./plan_002.md). The full 3-option prose for every player round is authored in `src/data/debates/015_duchess_vs_rue.json`, following the A/B/C pattern above; the table below is the structure and the intent of each beat.

| # | Beat | Content |
|---|---|---|
| 1 | NPC — Duchess, opening | Sets the motion. **appeal-to-popularity** ("forty-one of the Flock have already agreed"); soft **ad-hominem** ("no one blames the newcomers — they simply weren't raised near water"). |
| 2 | Player — opening | **A** bandwagon back ("every hoofed animal on this farm…"); **B** the road trough is too far; **C** *effective* — the pond is the farm's only clean water, the fouling has a cause, and the cause can be checked. |
| 3 | Player — crossfire, Rue asks | **C** *effective:* "Of the forty-one, how many have been to the outflow?" Duchess's response has to concede she has not. |
| 4 | Player — crossfire, Duchess asks | `opponentPrompt` fuses both fallacies into one gracious question. **C** separates them and answers only the part about the water. |
| 5 | NPC — Duchess, rebuttal | Her **ad-hominem** set piece: the mud cart, the straw in his ears, the six weeks. This is the round the player must analyze. |
| 6 | Player — rebuttal | **C** is `unlockCondition`-gated on tagging the ad-hominem in round 5. Unlocked line pays off *"what I am versus what happened"* and puts the bent grate on the record. |
| 7 | Player — crossfire, Duchess asks | The bandwagon closer: "Are forty-one animals wrong and one donkey right?" **C** answers that agreeing is not checking. |
| 8 | Player — crossfire, Rue asks | The exit question: "If the grate is fixed and the pond clears, does the motion lapse?" — Duchess cannot say yes without conceding cause. |
| 9 | NPC — Duchess, closing | Pure **appeal-to-popularity** with one last gentle **ad-hominem**. |
| 10 | Player — closing | **C** *effective:* "Forty-one animals agreeing is not forty-one animals checking. Bram checked — he told me the grate was bent before I asked him. Fix the grate. If the pond hasn't cleared by the frost, put the motion again and I'll haul the fence posts myself." |

Round 10's C concedes falsifiability, which is the exact opposite of both fallacies — the level's thesis in one line.

---

## Scenario files

| Rung | File | Key mechanics |
|---|---|---|
| 1.1 | `src/data/debates/010_gossip_trough_hetty.json` | `requiresAnalysis` on both rounds; no moderator, no recap, no intro summary |
| 1.2 | `src/data/debates/011_sparring_cass_ad_hominem.json` | `analysisEnabled: false`, `revealChoiceAssessment: true` |
| 1.3 | `src/data/debates/012_gossip_trough_bram.json` | as 1.1, with two fallacies on the picker |
| 1.4 | `src/data/debates/013_lab_cass_dirty_feathers.json` | `targetQuality: 'logical_fallacy'`, `preventOptionsShuffle` on the two lab rounds |
| 1.5 | `src/data/debates/014_skirmish_bram_fenceline.json` | full chrome; `unlockCondition` on option C of round 2 |
| 1.6 | `src/data/debates/015_duchess_vs_rue.json` | full defaults; `unlockCondition` on option C of round 6 |

The ladder order lives in `LEVEL_1_SCENARIOS` in [`src/data/levels.ts`](../src/data/levels.ts),
which also drives the main menu. Nothing gates progression yet — any rung can be started.

## Notes for future levels

- **Tobias** names the tortoise moderator, who had been referred to only as "a tired old
  Tortoise" in `pitch/001_barnaby_pip_privacy.md`.
- The **bent outflow grate** is the level's discoverable fact. It is planted as gossip
  (1.1 round 2), conceded by the opposition without their noticing (1.3 round 2), put on
  the record with a witness (1.5), and cashed in twice in the boss debate (rounds 6 and 10).
  It is also the natural first target if the "Investigation Day" mode in `pitch/002` is built.
- The teaching phrase **"what I am" versus "what happened"** is handed to the player by
  Cass in 1.2 and paid off in boss round 6. Later levels should introduce their own.
- Rue's closing line concedes falsifiability on purpose. That is the level's thesis, and
  it is the opposite of both fallacies it teaches.
