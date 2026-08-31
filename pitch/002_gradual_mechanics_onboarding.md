# Pitch: Introduce Gameplay Mechanics Little by Little

**Problem:** The debate system is solid, but dropping the player straight into a full Public Farm debate asks them to do everything at once: read a Public Forum–style ping-pong, pick a line, open analysis, spot a fallacy, spend Insight, unlock a better sentence, and watch the moderator gauge. That is a boss fight wearing a tutorial hat.

**Current verbs:**

- Choosing a sentence to speak (effective / ineffective / logical fallacy).
- Spotting fallacies (pays Insight; can unlock a better sentence).
- The overall loop: rebuttal, question, opening, closing — the ping-pong.

**Goal:** Treat a full debate as the boss fight. Before that, ship smaller pieces of gameplay that teach one verb (or one beat of the loop) in a safe setting.

**Useful patterns:** teach → test → twist, then a boss that only *combines* skills already practiced. Ace Attorney uses investigation before trial. Portal uses one-rule chambers. Cranky Uncle practices one fallacy in isolation before it appears “in the wild.” The repo already points this way: one dedicated encounter per new fallacy (`docs/logical_fallacies_distribution.md`), Level 1 → 2 → 3, debate as the high-stakes event.

These pitches reuse what already exists (3-option picker, analysis modal, Insight, unlocks, statement types) as **smaller modes**, not as more overlay copy on the full Trial UI.

---

## 1. Gossip at the Trough (spotting only)

**Quick:** A low-stakes farm conversation where the only verb is “spot the fallacy.” No speaking, no round types, no ping-pong.

**In depth:** An NPC (a hen, a ram, a gossiping goose) drops 1–3 sentences about barn life. The player opens the same analysis UI we already have, picks a sentence, labels the fallacy, and is done. Correct spots pay Insight and add a stamp to a personal “fallacy notebook.” Wrong spots are cheap and reversible.

This is the **antepiece** for analysis: one sentence, one fallacy on the picker, no timer, no moderator, no locked options. Fiction can be mundane on purpose: “Did you hear? If we let ducks in the pond today, they’ll own the whole creek by winter.” That is Slippery Slope without a courtroom.

**Campaign use:** every new fallacy first appears here, matching `docs/logical_fallacies_distribution.md`. After a few troughs, the same fallacy shows up in a skirmish, then in a real debate. The boss is no longer “learn the UI + learn the fallacy + win the round.”

---

## 2. Coach Sparring (speaking only)

**Quick:** A friendly NPC offers three lines. The player picks one. Analysis is disabled. The coach explains why the line was effective, weak, or fallacious.

**In depth:** This isolates **choose-a-sentence**. The 3-option quality model (effective / ineffective / logical fallacy) is the whole game. No Insight economy, no unlocks, no NPC rebuttal chain. The coach (an old tortoise moderator, a retired debate ram) reacts in one beat: praise, a grimace, or “that was a straw man of *me*.”

The quality badge can appear *after* confirm, so the first sessions train “read three lines and feel which one actually answers the point,” not “optimize a resource loop.” Later spars add a locked fourth line that only appears if the player spotted a fallacy in the coach’s prompt — the first time speaking and spotting touch, still in a safe room.

This is the Mario 1-1 jump: the verb exists, nothing else can kill you.

---

## 3. One-Exchange Skirmish (mini-boss, not the raid)

**Quick:** A 60–90 second fight with **one** statement type: one question, or one rebuttal, then stop. Full debate stays the weekly barn event.

**In depth:** Public Forum has ten beats (opening, two crossfires, two rebuttals, two more crossfires, two closings). That loop is the cognitive load. A skirmish is one beat of that loop, with the same UI chrome but a tiny round list.

Examples in farm fiction:

- **Fence-line quarrel:** one Crossfire question from a neighbor, one answer. Teach “question vs statement.”
- **Silo argument:** one Rebuttal against a posted claim. Teach “you are answering *that* sentence, not starting a new speech.”
- **Opening practice:** one Opening Constructive, then the moderator says “enough, we’ll finish this at the Public Farm.”

Failing a skirmish should sting less than a full debate (smaller opinion swing, retry, or just a bruised reputation with one animal). Winning a skirmish can bank Insight or unlock a better line for the upcoming boss debate.

This is Megaman’s antepiece: the press machine appears once in a safe corridor before the real gauntlet.

---

## 4. Investigation Day (ammo before the courtroom)

**Quick:** Before the Public Farm debate, the player walks the farm, collects facts, and optionally spots fallacies in gossip. The debate then uses that case file.

**In depth:** Ace Attorney’s investigation is not a tutorial overlay on the trial. It is a **different mode** with the same mental skills and almost no fail state. You cannot lose while examining the silo; you can only be under-prepared when the trial starts.

On the farm that becomes:

- Examine the broken floorboards (Fact: grain is falling through, not only stolen).
- Talk to the owl, the mouse, the collie.
- Spot a fallacy in a rumor (“everyone on the next farm uses owl-watchers” → Appeal to Popularity) and **file it** as evidence.

In the boss debate, locked options unlock because you **brought** the right fact or the right spotted fallacy, not only because you guessed during the round. Insight can be harvested here so the trial starts with a stockpile the player *earned*, instead of a mysterious number.

This also gives Phaser something to do: walk the barn, talk, examine. React keeps the analysis and choice UIs. The Trial scene becomes the raid instance you enter after prep.

---

## 5. Cranky Rooster Lab (inoculation: use the fallacy first)

**Quick:** A comic training scene where the player is asked to **commit** a named fallacy on purpose, then later to catch it.

**In depth:** Inoculation research (Cranky Uncle, Bad News) shows people get better at spotting a technique after they have used it in a safe, jokey context. Player options that *are* fallacies currently read as traps in a scored debate. Flip that for training.

The rooster coach: “Convince the ducks they must pick *only* pond or *only* puddle.” Player picks the False Dilemma line and is rewarded. Next beat: the same rooster uses False Dilemma about grain, and the player must tag it.

This matches Level 1 fallacies especially well (Ad Hominem, Bandwagon, Appeal to Fear) because they are social and funny on a farm. Level 3 (No True Scotsman, Nothing to Hide) can wait until the player has a notebook of “I have *been* this trick.”

**Caution:** keep this out of the scored Public Farm until the player knows the difference between “I used a fallacy in class” and “I used one in front of the tortoise.” Otherwise the game accidentally teaches that fallacies are a valid winning strategy — a tension already flagged in `docs/mechanics.md`.

---

## 6. Sitting with the Jury (watch, don’t speak)

**Quick:** The player is in the audience. Two NPCs debate. The only job is to mark fallacies and guess who is winning.

**In depth:** Removes “what should *I* say” entirely. The ping-pong still happens, so the player learns the **shape** of a round (opening → question → rebuttal) as a spectator sport, like watching a match before playing.

After each NPC line, the player may Analyze (same modal). After the exchange, they tick: “moderator will lean toward A / B / neither.” Then the real gauge reveals. That trains reading **impact** and **quality** without owning the mistake.

Unlock: after three spectator debates, the tortoise says you may take the floor. The first player debate can still be a skirmish (idea 3), not the full ten-round PF.

This is also a content multiplier: authored NPC rounds can be reused as “radio plays” before those characters become bosses.

---

## 7. Growing the Format (the debate itself unlocks beats)

**Quick:** Early “debates” are not full Public Forum. Structure is unlocked like a skill tree: opening only, then +crossfire, then +rebuttal, then +closing.

**In depth:** The PF outline in `docs/plan_002.md` is the raid checklist. Treat it as endgame rules, not session 1.

| Chapter | Allowed beats | Hidden systems |
|---|---|---|
| 1 | One opening each | No analysis |
| 2 | Openings + one crossfire | Analysis on, one fallacy in the picker |
| 3 | + rebuttals | Unlocks + Insight spend |
| 4 | Full PF + closing | Multiple fallacies, locked lines |

The UI can physically hide panels or footer actions that are not in the current chapter (no magnifying glass until spotting exists; no locked cards until unlocks exist). Tutorials then explain **one new beat**, not the whole machine.

Fiction: the farm’s “Public Farm” used to be just two speeches and a vote. After a crisis, they add questioning. After another, rebuttals. The player grows up with the institution.

This is the strongest “debate is the boss, but a smaller boss first” idea if we want to stay inside TrialUI instead of building many modes.

---

## 8. Chore Economy (Insight as a farm resource, taught alone)

**Quick:** A tiny loop whose only goal is earn / spend Insight, so the debate does not also teach an economy.

**In depth:** Insight is earned by spotting and spent to reveal fallacy locations or unlock speech. That is two systems glued to a third. A chore mode can be: read a posted notice, spot the weak sentence, earn 1 Insight, spend it to “repair a sign” or “reveal which hen is lying” in a non-debate scene.

When the player later sees Insight in Trial, it is already a familiar currency. The debate only has to answer “why would I spend this *now*?” (to unlock the good line before the moderator votes).

The **help reveal** can stay gated until this chore is done, so the first debate is guess-with-your-eyes, not a shop.

---

## 9. Fallacy-of-the-Week Classroom (curriculum as a place, not a full debate)

**Quick:** A dedicated lesson location that introduces one fallacy, then a short test, then the world uses it. Aligns with the distribution doc without using a 10-round PF as the lesson.

**In depth:** `docs/logical_fallacies_distribution.md` already says: when a new fallacy is introduced, a debate is dedicated to it, with few other types. That is good curriculum and still too much *gameplay* if “debate” means the full loop.

Split it:

1. **Lesson:** 30-second definition + farm example (Glittering Generalities: “Freedom, Hope, and more hay!”).
2. **Drill:** 3 trough gossips (idea 1), only that fallacy on the picker.
3. **Application skirmish:** opponent uses it once; player must spot it to unlock the effective reply (ideas 2+3 combined).
4. **Boss debate:** that fallacy is the featured weapon, plus one previously mastered type.

Level 1 and 2 alternate as planned; Level 3 waits until 70% of the first two are in the notebook. The classroom is the safe chamber; the Public Farm is the exam.

---

## 10. Case File / Prep Table (build the speech before the fight)

**Quick:** On a table in the barn, the player matches “target sentence + evidence + draft line.” Confirming stores that line as a locked-in option for the later debate.

**In depth:** `docs/plan_001.md` already described a richer assembly flow (pick target, pick evidence, then choose among 3 generated statements). That is too much *inside* a live round. As **prep**, it is a puzzle with no moderator clock.

Example: Pip lays out Barnaby’s “surveillance or starvation” sentence, tags False Dilemma, attaches the floorboard fact, and the table offers three drafted replies. The player picks one. In the actual debate, that card is already in slot C, unlocked. If they skipped prep, they only get the weaker A/B.

This teaches the **mental model** of rebuttal (target + evidence → speech) without the ping-pong. The boss fight is then “deliver the speech you prepared, and improvise when the opponent surprises you.”

---

## 11. Moderator’s Ear (read the room)

**Quick:** A minigame that only trains the opinion gauge: after a line, predict the swing before it is applied.

**In depth:** The gauge is a third verb (after speak and spot). Players currently see a number move for reasons they cannot yet parse (NPC impact + player impact + prompt impact). A “listening” scene: tortoise reads two lines, player places a token on “toward us / away / no change,” then the needle moves.

Once they can predict, the full debate’s recap modal is a confirmation, not a lecture. Pairs well with idea 6 (jury) and can be a 2-minute warm-up before each boss.

---

## 12. Training Barn with stripped chrome (same code, fewer toys)

**Quick:** Use TrialUI, but author scenarios that disable systems until a flag says they exist.

**In depth:** This is the cheapest engineering path and still counts as “smaller gameplay” if we are ruthless about flags:

- `analysisEnabled: false`
- `availableLogicalFallacies: ['ad-hominem']` (one icon)
- `startingInsightPoints: 0` and hide the counter
- `rounds` length 2
- hide Back/Confirm complexity (auto-confirm in training)
- `preventOptionsShuffle` so tutorials stay stable

The project already has tutorial overlays, `availableLogicalFallacies`, unlock conditions, and short scenarios (`000_tutorial_the_blue_barn`). The missing piece is **not more overlay copy**. It is permission to ship a scenario that is *allowed* to be incomplete as a debate.

Think of the Blue Barn as a **dojo**: same floor, fewer weapons on the wall.

---

## Campaign spine

A farm-week loop that makes the Public Farm feel like a boss without new lore:

1. **Morning chores** — Gossip (1) and/or Insight chores (8). New fallacy of the week (9).
2. **Afternoon prep** — Investigation (4) and/or Case file (10). Optional sparring (2).
3. **Dusk skirmish** — One-exchange fight (3) using this week’s fallacy.
4. **Night of the Public Farm** — Full (or growing) debate (7). Jury mode (6) for weeks the player is not the speaker.

That is the same two verbs we already have — **choose a line**, **spot a fallacy** — plus the loop, but the loop is only assembled after the verbs are automatic.

**Suggested first slice** (small, true to current code): Gossip (spotting) + Sparring (speaking) + one Crossfire skirmish + Blue Barn as a 2-round dojo. Keep Monty/Penny and Bella/Woolsey as the first real bosses. Investigation and the growing PF format are the bigger production bets.
