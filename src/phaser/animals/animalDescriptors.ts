/**
 * Frame data and weighted idle/alert behaviour for the placeholder animal cast.
 *
 * Ported from `the_farm/src/phaser/utils/animalDescriptors.ts` (see its
 * `docs/characters-and-animations.md` for the full design rationale). Two renames from
 * that source: `CharacterAnimation.id` -> `frameStem` (it was both the Phaser animation
 * key AND the frame-name prefix there, which is the root of a global-key collision risk
 * fixed here by `animalAnimKey` namespacing — see `animalAnimations.ts`), and
 * `prefix` -> `framePrefix`. `CharacterInfo` -> `AnimalDescriptor`.
 *
 * Dropped from the source shape: `scale` (moves to `animalStaging.ts` — the source values
 * were tuned for a Tiled world at camera zoom 0.6 and don't apply here) and `manualPivot`
 * (dog-only in the source, because that atlas exports TexturePacker `anchor` fields at the
 * frame centre). `applyAtlasFeetOrigin` ignores those anchors and measures the trim, so a
 * per-animal pivot is not needed. `isFlipped` is used by the mouse, whose art faces right;
 * `variantOf` is kept for parity but unused.
 */
import type { AnimalSpriteId } from '../../data/characters';

export const FRAME_SUFFIX = '.png';
export const FRAME_INDEX_SEPARATOR = '-';

/** One contiguous run of atlas frames. */
export interface AnimalAnimation {
  /** Logical name used in behaviour sequences ('idle', 'eat_start'). Unique per animal. */
  name: string;
  /** Frame-name stem from the art export (e.g. '__grey_donkey_idle'). NOT the Phaser key. */
  frameStem: string;
  /** Override when frame filenames don't follow `${frameStem}-`. The owl atlas needs this. */
  framePrefix?: string;
  startFrameIndex?: number;
  /** INCLUSIVE last frame index. `endFrameIndex: 9` is ten frames, 0..9. */
  endFrameIndex: number;
  /** Defaults to 12. */
  frameRate?: number;
}

/** `[weight, sequence]` pairs. Weights are cumulative over `Math.random()` and should sum to 1. */
export type AnimalBehaviour = readonly (readonly [
  number,
  readonly Phaser.Types.Animations.PlayAnimationConfig[],
])[];

export interface AnimalDescriptor {
  id: AnimalSpriteId;
  /** Reuse another animal's texture and animations instead of loading its own atlas. */
  variantOf?: AnimalSpriteId;
  /** The source art faces the opposite way from the rest of the cast. */
  isFlipped?: boolean;
  baseAnimations: readonly AnimalAnimation[];
  idle?: AnimalBehaviour;
  /** Replaces `idle` when the sprite is staged in a Trial. */
  idleTrial?: AnimalBehaviour;
  alert?: AnimalBehaviour;
  /** Replaces `alert` when the sprite is staged in a Trial. Unused today. */
  alertTrial?: AnimalBehaviour;
  /**
   * Locomotion cycle, held for as long as the character is translating — see
   * `AnimalAnimator.playMove`. Sequences here should loop (`repeat: -1`): unlike `idle`,
   * which re-rolls when it finishes, movement ends when the character stops, not when the
   * clip does. An animal with no `move` keeps standing still while it slides, which is what
   * the whole cast did before movement was wired up.
   */
  move?: AnimalBehaviour;
  /** `[fromName, [animsToPlayFirst]]` — mandatory exit poses. The dog stands up before barking. */
  transitions?: readonly (readonly [string, readonly string[]])[];
}

// tobias -> donkey-grey
const DONKEY_GREY: AnimalDescriptor = {
  id: 'donkey-grey',
  baseAnimations: [
    { name: 'buck', frameStem: '__grey_donkey_buck', endFrameIndex: 14 },
    { name: 'die', frameStem: '__grey_donkey_die', endFrameIndex: 9 },
    { name: 'eating', frameStem: '__grey_donkey_eating', endFrameIndex: 19 },
    { name: 'idle', frameStem: '__grey_donkey_idle', endFrameIndex: 24 },
    { name: 'run', frameStem: '__grey_donkey_run', endFrameIndex: 14 },
    { name: 'eat_end', frameStem: '__grey_donkey_transition_from_eat', endFrameIndex: 9 },
    { name: 'eat_start', frameStem: '__grey_donkey_transition_to_eat', endFrameIndex: 9 },
    { name: 'walk_to_left', frameStem: '__grey_donkey_walk_to_left', endFrameIndex: 14 },
  ],
  idle: [
    [0.3, [{ key: 'idle', repeat: 6 }]],
    [
      0.7,
      [
        { key: 'idle', repeat: 1 },
        { key: 'eat_start' },
        { key: 'eating', repeat: 6 },
        { key: 'eat_end' },
      ],
    ],
  ],
  // The field idle grazes 70% of the time, which is wrong for anyone standing at the podium.
  // Tobias wears this sprite; this is also the pose the donkey's emotion clips were
  // generated from (`__grey_donkey_idle-0.png`), so the cut into a clip holds.
  idleTrial: [[1, [{ key: 'idle', repeat: -1 }]]],
  alert: [[1, [{ key: 'buck', repeat: -1 }]]],
  // The clip is named `walk_to_left` because that is the direction the art was drawn
  // walking; the whole cast faces left and the scene flips X to walk right (`Farm.update`).
  move: [[1, [{ key: 'walk_to_left', repeat: -1 }]]],
};

// tobias -> owl. Foldered + underscore frame naming: every animation needs `framePrefix`.
const OWL: AnimalDescriptor = {
  id: 'owl',
  baseAnimations: [
    {
      name: 'idle_awake',
      frameStem: '__owl_no_tail_idle_awake',
      framePrefix: '__owl_no_tail_idle_awake/__owl_no_tail_idle_awake_',
      endFrameIndex: 19,
    },
    {
      name: 'idle_asleep',
      frameStem: '__owl_no_tail_idle_asleep',
      framePrefix: '__owl_no_tail_idle_asleep/__owl_no_tail_idle_asleep_',
      endFrameIndex: 19,
      frameRate: 8,
    },
    {
      name: 'idle_sleepy_face',
      frameStem: '__owl_no_tail_idle_sleepy_face',
      framePrefix: '__owl_no_tail_idle_sleepy_face/__owl_no_tail_idle_sleepy_face_',
      endFrameIndex: 19,
      frameRate: 8,
    },
    {
      name: 'flap_wings',
      frameStem: '__owl_no_tail_flap_wings',
      framePrefix: '__owl_no_tail_flap_wings/__owl_no_tail_flap_wings_',
      endFrameIndex: 9,
    },
    {
      name: 'rotate_head',
      frameStem: '__owl_no_tail_rotate_head',
      framePrefix: '__owl_no_tail_rotate_head/__owl_no_tail_rotate_head_',
      endFrameIndex: 9,
    },
  ],
  idle: [[1, [{ key: 'idle_awake', repeat: -1 }]]],
  alert: [[1, [{ key: 'rotate_head', repeat: -1 }]]],
  // The owl atlas has no walk cycle, and an owl covering ground flies rather than walks.
  move: [[1, [{ key: 'flap_wings', repeat: -1 }]]],
};

// rue -> raccoon (exact match). Sits up on the trial stand, crouches on all fours in the
// field. Every raccoon emotion clip was generated from `sitting_up_idle`, so the trial variant
// is load-bearing rather than decorative — see `usesTrialIdle` in `src/data/characters.ts`.
const RACCOON: AnimalDescriptor = {
  id: 'raccoon',
  baseAnimations: [
    { name: 'confused', frameStem: '__raccoon_confused', endFrameIndex: 15 },
    { name: 'sleep', frameStem: '__raccoon_die_sleep', endFrameIndex: 2 },
    { name: 'idle', frameStem: '__raccoon_idle', endFrameIndex: 19 },
    { name: 'jump', frameStem: '__raccoon_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__raccoon_run', endFrameIndex: 15 },
    { name: 'eat_nut', frameStem: '__raccoon_sitting_eat_nut', endFrameIndex: 19 },
    { name: 'sitting_up_confused', frameStem: '__raccoon_sitting_up_confused', endFrameIndex: 15 },
    { name: 'sitting_up_idle', frameStem: '__raccoon_sitting_up_idle', endFrameIndex: 19 },
    { name: 'throw_nut', frameStem: '__raccoon_throw_nut', endFrameIndex: 9 },
    { name: 'wake', frameStem: '__raccoon_wake', endFrameIndex: 2 },
    { name: 'walk', frameStem: '__raccoon_walk', endFrameIndex: 15 },
  ],
  idle: [[1, [{ key: 'idle' }]]],
  idleTrial: [[1, [{ key: 'sitting_up_idle' }]]],
  // No `repeat` here (matches the source): a single jump completes and re-rolls continuously.
  alert: [[1, [{ key: 'jump' }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// cass -> fox. The source declares no `idle` for the fox and relies on a runtime fallback
// (see AnimalAnimator); Cass is a debate opponent rather than background herd, so give her
// an explicit one instead of depending on that fallback ever firing.
const FOX: AnimalDescriptor = {
  id: 'fox',
  baseAnimations: [
    { name: 'die', frameStem: '__red_fox_die', endFrameIndex: 9 },
    { name: 'idle', frameStem: '__red_fox_idle', endFrameIndex: 24 },
    { name: 'jump', frameStem: '__red_fox_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__red_fox_run', endFrameIndex: 14 },
    { name: 'walk', frameStem: '__red_fox_walk', endFrameIndex: 14 },
  ],
  idle: [[1, [{ key: 'idle', repeat: -1 }]]],
  alert: [[1, [{ key: 'jump', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// hetty -> white-sheep-1
const WHITE_SHEEP_1: AnimalDescriptor = {
  id: 'white-sheep-1',
  baseAnimations: [
    { name: 'die', frameStem: '__white_sheep_1_die', endFrameIndex: 4 },
    { name: 'eating', frameStem: '__white_sheep_1_eating', endFrameIndex: 24 },
    { name: 'eat_end', frameStem: '__white_sheep_1_eating_transition_end', endFrameIndex: 9 },
    { name: 'idle', frameStem: '__white_sheep_1_idle', endFrameIndex: 24 },
    { name: 'jump', frameStem: '__white_sheep_1_jump_simple', endFrameIndex: 4, frameRate: 5 },
    { name: 'run', frameStem: '__white_sheep_1_run', endFrameIndex: 14 },
    { name: 'eat_start', frameStem: '__white_sheep_1_transition_to_eat', endFrameIndex: 9 },
    { name: 'walk', frameStem: '__white_sheep_1_walk', endFrameIndex: 14 },
  ],
  idle: [
    [0.3, [{ key: 'idle', repeat: 6 }]],
    [
      0.7,
      [
        { key: 'idle', repeat: 1 },
        { key: 'eat_start' },
        { key: 'eating', repeat: 6 },
        { key: 'eat_end' },
      ],
    ],
  ],
  alert: [[1, [{ key: 'jump', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// bram -> brown-wolf
const BROWN_WOLF: AnimalDescriptor = {
  id: 'brown-wolf',
  baseAnimations: [
    { name: 'bite', frameStem: '__wolf_brown_bite', endFrameIndex: 9 },
    { name: 'die', frameStem: '__wolf_brown_die', endFrameIndex: 3 },
    { name: 'howl', frameStem: '__wolf_brown_howl', endFrameIndex: 9 },
    { name: 'idle', frameStem: '__wolf_brown_idle', endFrameIndex: 19 },
    { name: 'jump', frameStem: '__wolf_brown_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__wolf_brown_run', endFrameIndex: 15 },
    { name: 'sit', frameStem: '__wolf_brown_sit', endFrameIndex: 4 },
    { name: 'sitting', frameStem: '__wolf_brown_sitting', endFrameIndex: 19 },
    { name: 'stand', frameStem: '__wolf_brown_stand', endFrameIndex: 4 },
    { name: 'walk', frameStem: '__wolf_brown_walk', endFrameIndex: 15 },
  ],
  idle: [
    [0.3, [{ key: 'idle', repeat: 6 }]],
    [
      0.7,
      [{ key: 'idle', repeat: 1 }, { key: 'sit' }, { key: 'sitting', repeat: 5 }, { key: 'stand' }],
    ],
  ],
  alert: [[1, [{ key: 'howl' }, { key: 'idle' }, { key: 'bite' }, { key: 'idle' }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// Foldered + dash-separated frame names: every animation needs `framePrefix`. The atlas
// also ships a walk cycle the source descriptor never registered.
const COW: AnimalDescriptor = {
  id: 'cow',
  baseAnimations: [
    {
      name: 'eat',
      frameStem: '__black_and_white_cow_eat',
      framePrefix: '__black_and_white_cow_eat/__black_and_white_cow_eat-',
      endFrameIndex: 24,
    },
    {
      name: 'idle',
      frameStem: '__black_and_white_cow_idle',
      framePrefix: '__black_and_white_cow_idle/__black_and_white_cow_idle-',
      endFrameIndex: 24,
    },
    {
      name: 'die',
      frameStem: '__black_and_white_cow_die',
      framePrefix: '__black_and_white_cow_die/__black_and_white_cow_die-',
      endFrameIndex: 4,
    },
    {
      name: 'eat_start',
      frameStem: '__black_and_white_cow_transition_to_eat',
      framePrefix:
        '__black_and_white_cow_transition_to_eat/__black_and_white_cow_transition_to_eat-',
      endFrameIndex: 14,
    },
    // Same frames as `eat` — idle sequences and alert key them separately, and this
    // architecture looks up by logical name so the source's `getAnimNameById` collision
    // (first match wins) does not apply.
    {
      name: 'eating',
      frameStem: '__black_and_white_cow_eat',
      framePrefix: '__black_and_white_cow_eat/__black_and_white_cow_eat-',
      endFrameIndex: 24,
    },
    {
      name: 'eat_end',
      frameStem: '__black_and_white_cow_transition_out_of_eat',
      framePrefix:
        '__black_and_white_cow_transition_out_of_eat/__black_and_white_cow_transition_out_of_eat-',
      // Atlas has 15 frames (0..14). The source truncated this at 4, which snapped the cow
      // out of eating instead of easing out.
      endFrameIndex: 14,
    },
    {
      name: 'walk',
      frameStem: '__black_and_white_cow_walk',
      framePrefix: '__black_and_white_cow_walk/__black_and_white_cow_walk-',
      endFrameIndex: 14,
    },
  ],
  idle: [
    [0.4, [{ key: 'idle', repeat: 4 }]],
    [
      0.6,
      [
        { key: 'idle' },
        { key: 'eat_start' },
        { key: 'eating', repeat: 6 },
        { key: 'eat_end' },
        { key: 'idle' },
      ],
    ],
  ],
  alert: [[1, [{ key: 'eat', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// dot -> dog (exact match). Farm greeter; emotion clips feed her dialogue portraits.
const DOG: AnimalDescriptor = {
  id: 'dog',
  baseAnimations: [
    { name: 'bark', frameStem: '__alsation_bark', endFrameIndex: 9 },
    { name: 'die', frameStem: '__alsation_die', endFrameIndex: 4 },
    { name: 'idle', frameStem: '__alsation_idle', endFrameIndex: 19 },
    { name: 'sit', frameStem: '__alsation_sit', endFrameIndex: 4 },
    { name: 'sit_idle', frameStem: '__alsation_sit_idle', endFrameIndex: 19 },
    { name: 'stand', frameStem: '__alsation_stand', endFrameIndex: 4 },
    { name: 'walk', frameStem: '__alsation_walk', endFrameIndex: 14 },
  ],
  idle: [
    [0.5, [{ key: 'idle', repeat: 7 }]],
    [0.5, [{ key: 'sit' }, { key: 'sit_idle', repeat: 10 }, { key: 'stand' }]],
  ],
  alert: [[1, [{ key: 'bark', repeat: 10 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
  transitions: [
    ['sit', ['sit_idle', 'stand']],
    ['sit_idle', ['stand']],
  ],
};

const PIG: AnimalDescriptor = {
  id: 'pig',
  baseAnimations: [
    { name: 'die', frameStem: '__pig_die', endFrameIndex: 4 },
    { name: 'idle', frameStem: '__pig_idle', endFrameIndex: 24 },
    { name: 'jump', frameStem: '__pig_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__pig_walk_run', endFrameIndex: 14 },
  ],
  // The source declared no `idle` and relied on a runtime fallback; give it an explicit one
  // the way the fox got one.
  idle: [[1, [{ key: 'idle', repeat: -1 }]]],
  alert: [[1, [{ key: 'jump', repeat: -1 }]]],
  move: [[1, [{ key: 'run', repeat: -1 }]]],
};

const MOUSE: AnimalDescriptor = {
  id: 'mouse',
  isFlipped: true, // source art faces right; the rest of the cast faces left
  baseAnimations: [
    {
      name: 'idle',
      frameStem: 'mouse-idle-spritesheet-746px-by-469px-per-frame',
      endFrameIndex: 11,
    },
    { name: 'lie', frameStem: 'mouse-lie-spritesheet-1095px-by-680px-per-frame', endFrameIndex: 7 },
    {
      name: 'run',
      frameStem: 'mouse-run-spritesheet-1009px-by-748px-per-frame',
      endFrameIndex: 15,
    },
    {
      name: 'stand',
      frameStem: 'mouse-stand-spritesheet-1103px-by-658px-per-frame',
      endFrameIndex: 7,
    },
    {
      name: 'walk',
      frameStem: 'mouse-walk-spritesheet-1124px-by-439px-per-frame',
      endFrameIndex: 15,
    },
  ],
  idle: [[1, [{ key: 'idle', repeat: -1 }]]],
  alert: [[1, [{ key: 'stand' }, { key: 'lie' }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// ---------------------------------------------------------------------------------------
// Imported from GameDeveloperStudio packs of loose keyframes, repacked into multiatlases by
// `scripts/build-animal-atlas.mjs` (the eleven above arrived pre-packed from the prototype).
// Frame names are the source stems with a dash index, so none of these needs a `framePrefix`.
// No character wears them yet: they exist to be previewed in the Animation Gallery and to
// give the emotion generator a reference frame.
// ---------------------------------------------------------------------------------------

// The pack ships five recolours (black, brown, grey, white, plus a `confused` variant sheet);
// only brown is imported. `stomp_to_charge` is renamed `charge_start` to read as the
// transition it is — it ends head-down in the charge pose, so nothing idle should roll it.
const BROWN_BULL: AnimalDescriptor = {
  id: 'brown-bull',
  baseAnimations: [
    { name: 'back_kick', frameStem: '__brown_bull_back_kick', endFrameIndex: 9 },
    { name: 'charge', frameStem: '__brown_bull_charge', endFrameIndex: 7 },
    { name: 'charge_start', frameStem: '__brown_bull_stomp_to_charge', endFrameIndex: 9 },
    { name: 'die', frameStem: '__brown_bull_die', endFrameIndex: 4 },
    { name: 'head_flick', frameStem: '__brown_bull_head_flick', endFrameIndex: 7 },
    { name: 'idle', frameStem: '__brown_bull_idle', endFrameIndex: 19 },
    { name: 'jump', frameStem: '__brown_bull_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__brown_bull_run', endFrameIndex: 7 },
    { name: 'snort', frameStem: '__brown_bull_snort', endFrameIndex: 9 },
    { name: 'stomp', frameStem: '__brown_bull_stomp', endFrameIndex: 9 },
    { name: 'walk', frameStem: '__brown_bull_walk', endFrameIndex: 7 },
    { name: 'whacked', frameStem: '__brown_bull_whacked', endFrameIndex: 15 },
  ],
  idle: [
    [0.5, [{ key: 'idle', repeat: 6 }]],
    [0.3, [{ key: 'idle', repeat: 1 }, { key: 'head_flick' }, { key: 'idle', repeat: 2 }]],
    [0.2, [{ key: 'idle', repeat: 1 }, { key: 'stomp' }, { key: 'idle', repeat: 2 }]],
  ],
  // `snort` draws two visible puffs at the nose ring — the one clip that reads as a reaction
  // at farm scale, where a hoof stomp is lost under the body.
  alert: [[1, [{ key: 'snort', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// Five recolours in the pack (black, brown, orange, white, yellow); white is imported.
// `fying` is the source's own typo in the frame stem, kept character-for-character because
// the atlas is the authority; the logical name here is `fly`.
const WHITE_CHICKEN: AnimalDescriptor = {
  id: 'white-chicken',
  baseAnimations: [
    { name: 'die', frameStem: '__white_chicken_die', endFrameIndex: 4 },
    { name: 'throw_egg', frameStem: '__white_chicken_egg_projectile', endFrameIndex: 9 },
    { name: 'fly', frameStem: '__white_chicken_fying', endFrameIndex: 9 },
    { name: 'idle', frameStem: '__white_chicken_idle', endFrameIndex: 19 },
    { name: 'jump', frameStem: '__white_chicken_jump', endFrameIndex: 9 },
    { name: 'lay_egg', frameStem: '__white_chicken_lay_egg', endFrameIndex: 9 },
    { name: 'peck', frameStem: '__white_chicken_peck', endFrameIndex: 9 },
    { name: 'walk', frameStem: '__white_chicken_walk', endFrameIndex: 11 },
  ],
  idle: [
    [0.55, [{ key: 'idle', repeat: 6 }]],
    [
      0.45,
      [
        { key: 'idle', repeat: 1 },
        { key: 'peck', repeat: 2 },
        { key: 'idle', repeat: 2 },
      ],
    ],
  ],
  // Wing-flapping in place, which is what a startled chicken does; `fly` does not translate.
  alert: [[1, [{ key: 'fly', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// `squirt_start` raises the tail and `squirt` holds it there — neither returns to the resting
// crouch and the pack ships no reverse, so the idle rolls stay clear of both. The spray cloud
// ships as a separate VFX sprite sheet in the pack and is deliberately not imported.
const SKUNK: AnimalDescriptor = {
  id: 'skunk',
  baseAnimations: [
    { name: 'confused', frameStem: '__skunk_confused', endFrameIndex: 15 },
    { name: 'die', frameStem: '__skunk_die', endFrameIndex: 4 },
    { name: 'idle', frameStem: '__skunk_idle', endFrameIndex: 19 },
    { name: 'jump', frameStem: '__skunk_jump', endFrameIndex: 9 },
    { name: 'run', frameStem: '__skunk_run', endFrameIndex: 11 },
    { name: 'squirt', frameStem: '__skunk_squirt', endFrameIndex: 9 },
    { name: 'squirt_start', frameStem: '__skunk_squirt_position_transition', endFrameIndex: 9 },
    { name: 'walk', frameStem: '__skunk_walk', endFrameIndex: 11 },
  ],
  idle: [
    [0.6, [{ key: 'idle', repeat: 6 }]],
    [0.4, [{ key: 'idle', repeat: 1 }, { key: 'confused' }, { key: 'idle', repeat: 2 }]],
  ],
  alert: [[1, [{ key: 'confused', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

const SEAGULL: AnimalDescriptor = {
  id: 'seagull',
  baseAnimations: [
    { name: 'flying', frameStem: '__seagull_flying', endFrameIndex: 11 },
    { name: 'flying_hover', frameStem: '__seagull_flying_hover', endFrameIndex: 11 },
    { name: 'idle', frameStem: '__seagull_idle', endFrameIndex: 19 },
    { name: 'peck', frameStem: '__seagull_peck', endFrameIndex: 7 },
    { name: 'squark', frameStem: '__seagull_squark', endFrameIndex: 4 },
    { name: 'walk', frameStem: '__seagull_walk', endFrameIndex: 11 },
  ],
  idle: [
    [0.55, [{ key: 'idle', repeat: 6 }]],
    [
      0.45,
      [
        { key: 'idle', repeat: 1 },
        { key: 'peck', repeat: 2 },
        { key: 'idle', repeat: 2 },
      ],
    ],
  ],
  // Five frames of open beak and thrown-back head — the pack's own reaction clip.
  alert: [[1, [{ key: 'squark', repeat: -1 }]]],
  move: [[1, [{ key: 'walk', repeat: -1 }]]],
};

// Cut from the pack's strip spritesheets rather than loose keyframes (see the builder script).
// The green variant is the pack's unprefixed default; blue and red are recolours of the same
// frames. `die` is four frames, not the five every other animal here ships.
const SNAKE: AnimalDescriptor = {
  id: 'snake',
  baseAnimations: [
    { name: 'bite', frameStem: '__snake_bite', endFrameIndex: 11 },
    { name: 'die', frameStem: '__snake_die', endFrameIndex: 3 },
    { name: 'idle', frameStem: '__snake_idle', endFrameIndex: 19 },
    { name: 'slither', frameStem: '__snake_slither', endFrameIndex: 11 },
  ],
  idle: [[1, [{ key: 'idle', repeat: -1 }]]],
  alert: [[1, [{ key: 'bite', repeat: -1 }]]],
  move: [[1, [{ key: 'slither', repeat: -1 }]]],
};

export const ANIMAL_DESCRIPTORS: Readonly<Record<AnimalSpriteId, AnimalDescriptor>> = {
  'donkey-grey': DONKEY_GREY,
  owl: OWL,
  raccoon: RACCOON,
  fox: FOX,
  'white-sheep-1': WHITE_SHEEP_1,
  'brown-wolf': BROWN_WOLF,
  cow: COW,
  dog: DOG,
  mouse: MOUSE,
  pig: PIG,
  'brown-bull': BROWN_BULL,
  'white-chicken': WHITE_CHICKEN,
  skunk: SKUNK,
  seagull: SEAGULL,
  snake: SNAKE,
};

export const ANIMAL_SPRITE_IDS = Object.keys(ANIMAL_DESCRIPTORS) as AnimalSpriteId[];
