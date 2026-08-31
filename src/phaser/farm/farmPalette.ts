/**
 * Numeric colours for the overworld.
 *
 * The React UI palette in `uiColors.scss` / `uiColor.ts` is CSS custom properties,
 * which Phaser cannot consume — it needs numbers. These are picked to sit beside
 * that palette rather than duplicate it: the accent and status hues are the same
 * values (`--ui-color-accent` #0ec3c9, `--ui-color-warning` #facc15, …) so the farm
 * and the debate screens read as one game.
 *
 * Terrain colours are placeholder art. See `farmTextures.ts` for the texture-key
 * contract that lets real art replace them.
 */
export const farmPalette = {
  /** Terrain. */
  grass: 0x3f6b3a,
  grassAlt: 0x477a41,
  path: 0x8a7856,
  water: 0x1f5f7a,
  waterAlt: 0x2a7a96,
  barn: 0x7a3b2e,
  barnRoof: 0x5a2b21,
  fence: 0x9c8f6a,
  trough: 0x6b7280,
  post: 0x8a6a3f,

  /** Actors. */
  player: 0xe8d8b0,
  playerOutline: 0x2a2118,

  /** Shared with the React palette. */
  accent: 0x0ec3c9,
  warning: 0xfacc15,
  success: 0x4ade80,
  danger: 0xf87171,
  info: 0x22d3ee,

  /** Text drawn into the world (zone captions, NPC names). */
  worldLabel: '#ffffff',
  worldLabelStroke: '#000000',
} as const;
