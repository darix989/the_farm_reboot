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

export interface CharacterVisual {
  id: string;
  nameLabel: Labels;
  tint: number;
  kind: 'player' | 'npc';
}

export const CHARACTERS: Readonly<Record<string, CharacterVisual>> = {
  rue: { id: 'rue', nameLabel: 'farmNpcRue', tint: PLAYER_TINT, kind: 'player' },
  hetty: { id: 'hetty', nameLabel: 'farmNpcHetty', tint: 0xf2c9a0, kind: 'npc' },
  cass: { id: 'cass', nameLabel: 'farmNpcCass', tint: 0xd4623f, kind: 'npc' },
  bram: { id: 'bram', nameLabel: 'farmNpcBram', tint: 0x5c8f6b, kind: 'npc' },
  duchess: { id: 'duchess', nameLabel: 'farmNpcDuchess', tint: 0xf5f2e8, kind: 'npc' },
  tobias: { id: 'tobias', nameLabel: 'farmNpcTobias', tint: 0x6b8f3f, kind: 'npc' },
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
}

export function resolveCharacter(id: string): ResolvedCharacter {
  const known = characterById(id);
  if (known) {
    return {
      id: known.id,
      displayName: getLabel(known.nameLabel),
      tint: known.tint,
      kind: known.kind,
    };
  }
  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    tint: FALLBACK_TINT,
    kind: 'npc',
  };
}
