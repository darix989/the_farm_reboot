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
 * (dog-only in the source; the dog is not ported). `isFlipped` and `variantOf` are kept in
 * the type for parity but unused by the six ported animals.
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
  /** Replaces `alert` when the sprite is staged in a Trial. Unused by these six. */
  alertTrial?: AnimalBehaviour;
  /**
   * Locomotion cycle, held for as long as the character is translating — see
   * `AnimalAnimator.playMove`. Sequences here should loop (`repeat: -1`): unlike `idle`,
   * which re-rolls when it finishes, movement ends when the character stops, not when the
   * clip does. An animal with no `move` keeps standing still while it slides, which is what
   * the whole cast did before movement was wired up.
   */
  move?: AnimalBehaviour;
  /** `[fromName, [animsToPlayFirst]]` — mandatory exit poses. Unused by these six. */
  transitions?: readonly (readonly [string, readonly string[]])[];
}

// rue -> donkey-grey (exact match)
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
  alert: [[1, [{ key: 'buck', repeat: -1 }]]],
  // The clip is named `walk_to_left` because that is the direction the art was drawn
  // walking; the whole cast faces left and the scene flips X to walk right (`Farm.update`).
  move: [[1, [{ key: 'walk_to_left', repeat: -1 }]]],
};

// duchess -> owl. Foldered + underscore frame naming: every animation needs `framePrefix`.
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

// tobias -> raccoon. Only user of `idleTrial`: sits up on the trial stand, stands in the field.
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

export const ANIMAL_DESCRIPTORS: Readonly<Record<AnimalSpriteId, AnimalDescriptor>> = {
  'donkey-grey': DONKEY_GREY,
  owl: OWL,
  raccoon: RACCOON,
  fox: FOX,
  'white-sheep-1': WHITE_SHEEP_1,
  'brown-wolf': BROWN_WOLF,
};

export const ANIMAL_SPRITE_IDS = Object.keys(ANIMAL_DESCRIPTORS) as AnimalSpriteId[];
