/**
 * Shared cast for the farm overworld and the debate UI.
 *
 * Phaser sprites and React busts both read tint + name from here so they cannot
 * drift. Unknown speaker ids (legacy menu debates) fall back to a capitalised
 * name and a neutral tint.
 */
import getLabel, { type Labels } from './labels';

export const PLAYER_CHARACTER_ID = 'rue';

/** Matches the baked `farm-player` fill in `farmPalette` / `farmTextures`. */
export const PLAYER_TINT = 0xe8d8b0;

const FALLBACK_TINT = 0x9ca3af;

/**
 * Placeholder spritesheet cast, copied from the `the_farm` prototype. These are Phaser
 * texture keys, not the character's real species — the art is the nearest available animal,
 * not a match: Cass is a rooster played by a fox, Duchess a goose played by an owl, Tobias a
 * tortoise played by a donkey. Rue is the one exact match, and the only reason the cast is
 * assigned this way: the six sprites with generated emotion clips (`donkey-grey`, `owl`,
 * `raccoon`, `fox`, `white-sheep-1`, `brown-wolf`) map one-to-one onto the six characters, so
 * giving the player the raccoon forces Tobias onto the freed donkey. Frame data and behaviour
 * live in `src/phaser/animals/animalDescriptors.ts`.
 */
export type AnimalSpriteId =
  | 'donkey-grey'
  | 'owl'
  | 'raccoon'
  | 'fox'
  | 'white-sheep-1'
  | 'brown-wolf'
  | 'cow'
  | 'cow-female-001'
  | 'dog'
  | 'mouse'
  | 'pig';

export interface CharacterVisual {
  id: string;
  nameLabel: Labels;
  tint: number;
  kind: 'player' | 'npc';
  /** Omit for characters with no art: they keep the generated placeholder texture. */
  animal?: AnimalSpriteId;
  /**
   * Whether this character uses their sprite's Trial behaviour variants (`idleTrial` /
   * `alertTrial`) once staged in a debate. The variants belong to the sprite, but *wanting*
   * them is a casting decision, so it lives here rather than on the descriptor. Defaults to
   * `true`; set `false` to keep a character on their field idle at the podium.
   */
  usesTrialIdle?: boolean;
}

export const CHARACTERS: Readonly<Record<string, CharacterVisual>> = {
  rue: {
    id: 'rue',
    nameLabel: 'farmNpcRue',
    tint: PLAYER_TINT,
    kind: 'player',
    animal: 'raccoon',
    // Not optional in practice: every raccoon emotion clip was generated from
    // `__raccoon_sitting_up_idle-0.png`, so standing him at the podium would pop him from a
    // four-legged crouch to sitting upright the moment he speaks.
    usesTrialIdle: true,
  },
  hetty: {
    id: 'hetty',
    nameLabel: 'farmNpcHetty',
    tint: 0xf2c9a0,
    kind: 'npc',
    animal: 'white-sheep-1',
  },
  cass: { id: 'cass', nameLabel: 'farmNpcCass', tint: 0xd4623f, kind: 'npc', animal: 'fox' },
  bram: { id: 'bram', nameLabel: 'farmNpcBram', tint: 0x5c8f6b, kind: 'npc', animal: 'brown-wolf' },
  duchess: {
    id: 'duchess',
    nameLabel: 'farmNpcDuchess',
    tint: 0xf5f2e8,
    kind: 'npc',
    animal: 'owl',
  },
  tobias: {
    id: 'tobias',
    nameLabel: 'farmNpcTobias',
    tint: 0x6b8f3f,
    kind: 'npc',
    animal: 'donkey-grey',
  },
};

export function characterById(id: string): CharacterVisual | null {
  return CHARACTERS[id] ?? null;
}

export function phaserTintToCss(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

export interface ResolvedCharacter {
  id: string;
  displayName: string;
  tint: number;
  kind: 'player' | 'npc';
  animal: AnimalSpriteId | null;
  usesTrialIdle: boolean;
}

export function resolveCharacter(id: string): ResolvedCharacter {
  const known = characterById(id);
  if (known) {
    return {
      id: known.id,
      displayName: getLabel(known.nameLabel),
      tint: known.tint,
      kind: known.kind,
      animal: known.animal ?? null,
      usesTrialIdle: known.usesTrialIdle !== false,
    };
  }
  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    tint: FALLBACK_TINT,
    kind: 'npc',
    animal: null,
    usesTrialIdle: true,
  };
}
