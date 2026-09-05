# Measuring a generated animation — from scratch

Every clip this pipeline generates gets measured, and the numbers are printed, stored and shown
on the review page. This file explains what each number is, in plain terms, assuming you have
never worked with sprite animation before. Nothing is taken as read — including the words.

If you only remember one thing: **the numbers cannot tell you whether a clip looks good. They
tell you whether it is broken in a way that is hard to see.** Judging whether `angry` looks
angry is still your eyes' job.

---

## Part 1 — The vocabulary

Read this first. Every later section leans on it.

### Frame

One still picture. An animation is just a stack of stills shown in quick succession, the way a
flip-book works. Our clips are 25 frames each.

### Spritesheet (or "sheet")

All the frames of one animation packed into a **single image file**, laid out in a grid, rather
than 25 separate files. It is one download and one texture in memory instead of 25.

Ours are 5 columns × 5 rows = 25 cells, each cell 512×512 pixels, so the whole file is
2560×2560. The game is told the cell size and works out where each frame sits.

### Cell

One square of that grid — the space one frame occupies. Note the difference between the **cell**
(always 512×512) and the **character drawn inside it** (much smaller, and a different size in
every frame). Almost every metric below is about the character, not the cell.

### Loop

Our clips play forever while a character holds an emotion. When the last frame finishes, the
animation jumps straight back to the first frame and runs again. That is *looping*.

### Seam

A word borrowed from sewing: the line where two pieces of fabric are **joined**. Sew two edges
that do not match and you can see the join.

An animation loop has a seam too — the join between the **last frame and the first frame**,
which sit next to each other in time every time the clip repeats. If those two pictures do not
match, you see the join: the character visibly jumps. Because the clip repeats forever, you see
that jump over and over.

This is why our clips are generated with `closeLoop`, which asks the generator to end the clip
in the same pose it started. A seam you cannot see is the goal.

*(In code the field is named `loopPop` — "pop" being the visible jump at a bad seam. The
console and review page label it "loop seam". Same number, two names.)*

### Transparency and "alpha"

A pixel has four numbers: **R**ed, **G**reen, **B**lue and **A**lpha. RGB is its colour. Alpha
is how opaque it is, from 0 (fully see-through) to 255 (fully solid).

Our sprites sit on transparent backgrounds so the stage shows through behind them. So in any
frame, alpha tells you **where the character is**: solid pixels are character, transparent
pixels are empty space.

We treat alpha of 8 or less as empty (`ALPHA_THRESHOLD` in `normalize.mjs`). Not zero, because
generated edges are slightly soft and fade out rather than stopping dead.

### Silhouette

The character's outline — its shape with all interior detail ignored, as if it were a shadow.
It matters because at stage size (~300px tall) the outline is most of what a player can
actually make out.

### Bounding box

The **smallest rectangle that contains every non-transparent pixel** in a frame. Imagine
shrink-wrapping a rectangle around the character.

It gives four numbers: `x`, `y` (top-left corner, in pixels from the cell's top-left), `width`
and `height`. From those you can ask "how tall is the character in this frame" and "where is it
horizontally", which is exactly what two of the three metrics need.

### Union bounding box

One box that contains **all** the per-frame boxes at once — the outermost edges across the whole
clip. "Union" in the set-theory sense: everything covered by any of them.

Used when the clip needs a single answer for the whole animation rather than a per-frame one.

---

## Part 2 — The three quality metrics

Computed by [`scripts/ludo/qualityCheck.mjs`](../../../scripts/ludo/qualityCheck.mjs), printed
after each clip generates, stored in that clip's `meta.json`, and shown on the review contact
sheet.

### 1. Loop seam — a percentage

**Question it answers:** when this clip restarts, will you see the join?

**How it is computed.** Take frame 0 and the last frame. Lay them on top of each other and
compare **the same pixel position in each**. For every pixel, add up two differences:

- how different the **red** values are, and
- how different the **alpha** values are.

Each of those can be at most 255, so the worst possible score for one pixel is 510. Average
across all pixels, divide by 510, express as a percentage.

**Why red and alpha, and not all four channels?** Alpha catches *the shape moved* — a pixel that
was character is now empty space. Red catches *the shape changed or recoloured* while staying in
the same place. Together they are enough to rank clips against each other, which is all this
needs to do. Including green and blue would shift the absolute numbers without changing the
ranking, and the threshold below is calibrated to this specific measure — so do not "improve"
the formula without recalibrating it.

**Reading the number:**

- **0%** — the two frames are pixel-identical. Invisible seam.
- **under ~1%** — invisible in practice. Every good clip here lands around 0.1–0.3%.
- **~2%** — starts to read as a hitch.
- **5%+** — the clip is ending somewhere it did not start.

**Threshold: warns above 2%.**

**Real example.** The donkey's first `sneaky` scored **5.88%**. The generator had read "crouched
low" as an instruction to lie down, and the donkey never got back up: the clip started standing
and ended lying down, so it snapped upright every 2 seconds. Pinning the final frame to the same
reference image took it to **0.22%**.

**What it cannot tell you.** It only compares the *first and last* frames. Flicker in the middle
of a clip — a tail or a mouth changing shape frame to frame — scores perfectly clean. That is a
different defect, and you find it with the zoom check in Part 4.

---

### 2. Height swing — a percentage

**Question it answers:** does the character stay roughly the same height, or does it change
size and shape as the clip plays?

**"Swing"** here means the spread between the extremes, the way a pendulum swings between two
ends. Not an average — the gap between the smallest and the largest.

**How it is computed.** Take the bounding box of every frame and note its **height**. Then:

```
(tallest − shortest) ÷ tallest × 100
```

So if the character is 300px tall at its tallest and 240px at its shortest, that is
(300−240)/300 = **20%**.

**Why it matters — this is the non-obvious one.** When a clip is shipped, the pipeline works out
one single size multiplier for it, based on the **union** bounding box (Part 3). One number, for
the whole clip. That number is driven by the *tallest* extent the character ever reaches.

So if the character is only that tall in two frames out of 25, the multiplier is set by those
two frames, and the character renders slightly **too small for the other 23**. The bigger the
swing, the more of the clip is under-sized.

**Threshold: warns above 20%.**

**This threshold produces false alarms, by design.** A high swing can mean two completely
different things:

- **Legitimate motion** — a head dipping, a body stretching forward. Fine.
- **A pose collapse** — the character crouching, sitting or lying down partway through and not
  recovering. Broken.

The number cannot tell them apart. **You have to look.** Two real cases from this project:

| Clip | Swing | Verdict |
|---|---|---|
| fox `angry` | 32% | **Fine.** The fox drops into a low stalking crouch on all fours — real, expressive motion |
| donkey `sneaky` (before fix) | 23% | **Broken.** The donkey lay down and stayed down |

Note the broken one scored *lower*. And after that clip was fixed its swing went **up** to 28%
while the clip got dramatically better. Height swing is the weakest of the three metrics and can
move in the opposite direction to quality. Treat it strictly as "go and look at this one".

---

### 3. Horizontal drift — in pixels

**Question it answers:** does the character stay put, or slide sideways?

**"Drift"** as in a boat drifting from its mooring — slow, unintended movement away from where
something should be.

**How it is computed.** For every frame, find the **horizontal centre** of the bounding box
(`x + width ÷ 2`). Take the spread between the leftmost and rightmost of those centres, and
**halve it**.

**Why halved, and what "±" means.** The result is reported as `±8px`, read "plus or minus 8
pixels". If the centre wanders across a total span of 16 pixels, it sits at most 8 pixels either
side of the middle. Halving turns a total span into a "how far off-centre does it get" figure,
which is the more intuitive one.

**Which pixels?** Pixels **of the 512px cell**, not of the screen. On the actual stage the
character is drawn smaller, so the on-screen wander is smaller than the number suggests.

**Why it matters.** Each character stands in a fixed slot on the Trial stage. One that slides
around inside its slot looks unmoored — untethered — next to neighbours that hold still.

**Threshold: warns above 20px** (of 512, so about 4% of the cell width).

---

## Part 3 — The two placement measurements

Different purpose. The three above are *quality checks* — they might warn you. These two are
*calculations whose results the game actually uses*, worked out by
[`scripts/ludo/normalize.mjs`](../../../scripts/ludo/normalize.mjs) when a clip is promoted, and
written into `emotionSheets.generated.ts`.

**Why they are needed at all.** The original hand-drawn art and the generated art live on
completely different canvases. The donkey's atlas frame is 784×702 with the donkey filling most
of it. A generated frame is a 512×512 cell with the donkey somewhere inside at whatever size the
generator chose. The game's staging code was tuned for the first and knows nothing about the
second, so a generated clip played raw renders about **3× too small and floating above the floor
line**. These two numbers correct for that.

### `scale` — a multiplier

The character's bounding-box **height in the original atlas frame**, divided by the **height of
the union bounding box across the whole generated clip**.

Multiply the staged size by this and the generated character comes out the same height as the
hand-drawn one. Typical values here are around 2.1–2.5, meaning the generated character was
roughly half the size it needed to be. The sheep's is ~1.1, because its source art is on a much
smaller canvas to begin with.

Height rather than width, because the cast is staged standing on a floor line and sized against
each other vertically — measuring width would let a clip that gestures sideways shrink itself.

### `originX` / `originY` — two fractions

The **origin** is the anchor point of a sprite: the spot the game holds it by when positioning
it. Expressed as a fraction of the frame, so `(0.5, 1)` means "halfway across, all the way down"
— bottom-centre of the *canvas*.

That is **not** where the atlas art's feet are. TexturePacker leaves empty padding below every
animal except the owl (the raccoon has ~198px of it). Phaser sizes the sprite to that untrimmed
canvas, so `setOrigin(0.5, 1)` planted Farm shadows and the Trial floor line in the padding.
Atlas staging now uses `applyAtlasFeetOrigin`, which pins `originY` at the rest-frame's
visible bottom. These two generated numbers do the same for a cell: `originX` still matches
the atlas canvas centre (walk cycles were authored around it); `originY` is the bottom of the
union bounding box, i.e. the feet. Typical values here are around `0.51 / 0.70`.

**Both come from the union box, not per-frame boxes** — deliberately. A per-frame origin would
re-anchor the sprite every frame and make the character twitch. One anchor for the clip means
the character moves *within* a stable frame of reference, which is what an animation is.

**Never hand-edit these.** They are measured. If they look wrong, the measurement is wrong —
fix `normalize.mjs` and run `npm run sprites:emotions -- --remeasure` against the shipped
PNGs. Re-promote is only needed when the PNG itself changed.

---

## Part 4 — What none of these numbers measure

Four real defects this project shipped or nearly shipped, none of which any metric caught:

1. **Whether the emotion reads.** The owl's `angry` scored beautifully — 0.23% seam — and looked
   like a surprised owl talking. Nothing but your eyes will catch that.

2. **Tempo.** For fifteen clips, everything played **1.5× too fast**, because the frame rate had
   been hard-coded to 12 while the clips contained 2 seconds of motion in 16 frames. The metrics
   examine the frames, not the speed they are shown at. See the frame-rate section in `SKILL.md`.
   The arithmetic: playback time = `frames ÷ frame rate`, and it must equal the `duration` the
   clip was generated with.

3. **Per-frame detail flicker.** The sheep's `angry` grew a different set of teeth in every
   frame — a white wedge, then split blocks, then a tooth-and-tongue. Loop seam was clean
   (first and last frames both had the mouth shut) and swing was fine.

   **To catch this: crop the head out of six *consecutive* frames, scale them up ~4×, and lay
   them side by side.** It is invisible in a full spritesheet and unmistakable at that
   magnification. Consecutive matters — sampling every fourth frame hides exactly the frame-to-
   frame instability you are hunting. And what you are looking for is a shape that *changes*,
   not a shape you dislike: the wolf's snarl shows fangs in every open-mouth frame and is
   correct, because they hold their shape and scale with the jaw.

4. **Things that should not be there at all.** A perch under the owl, a nut in the raccoon's
   paws. Nothing measures "is there an object in this picture that should not exist".

---

## Part 5 — Where to find the numbers

- **During generation** — printed under each clip as it completes.
- **In the review directory** — `.ludo-review/<animal>/<emotion>/meta.json`, under `quality`.
- **On the contact sheet** — `.ludo-review/index.html`, under each clip, green when clean and
  amber when something is over threshold.
- **For clips already shipped** — `scripts/ludo/promoted-clips.json` stores each promoted clip's
  `quality` alongside its `scale`, `originX`, `originY` and the prompt it came from.

To measure a sheet that is already in `public/assets/`, run this from the repo root:

```js
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { measureClipQuality } from './scripts/ludo/qualityCheck.mjs';

const ANIMAL = 'fox', EMOTION = 'angry';

const record = JSON.parse(await readFile('scripts/ludo/promoted-clips.json', 'utf8'));
const clip = record[ANIMAL][EMOTION];
const path = `public/assets/characters/emotions/${clip.file}`;

// `cols` is not stored, so derive it: sheet width ÷ cell width.
const { width } = await sharp(path).metadata();
const grid = {
  cols: width / clip.frameWidth,
  frameWidth: clip.frameWidth,
  frameHeight: clip.frameHeight,
  frameCount: clip.frameCount,
};

console.log(await measureClipQuality(await readFile(path), grid));
```

**Do not hard-code the grid.** Not every clip has the same shape — the ones generated before the
frame-rate fix are 16 frames in a 4×4 grid, the rest are 25 in a 5×5. Passing the wrong grid
does not error: it slices the sheet at the wrong offsets and quietly measures the wrong
rectangles, giving you plausible nonsense. Reading `frameWidth`, `frameHeight` and `frameCount`
from `promoted-clips.json` and deriving `cols` from the image, as above, is always right.

Sanity check: the output should match that clip's stored `quality` block exactly. If it does
not, your grid is wrong.
