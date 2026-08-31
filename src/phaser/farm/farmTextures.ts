/**
 * Placeholder art, generated at runtime.
 *
 * The repo ships no character or terrain art, so every farm texture is drawn with
 * `Graphics` and baked into the texture manager. This keeps the overworld playable
 * with zero binary assets.
 *
 * TEXTURE KEY CONTRACT — replacing this with real art means loading images under
 * these exact keys in `Preloader` and deleting this file. No scene code changes.
 *
 *   farm-zone-<kind>    64x64, tiled across a zone   (kind: FarmZoneKind)
 *   farm-player         56x56, origin centred        tinted per facing
 *   farm-npc            56x56, origin centred        tinted per NPC
 *   farm-shadow         56x16, origin centred
 *   farm-stick-base     160x160, origin centred
 *   farm-stick-thumb    72x72, origin centred
 */
import type { FarmZoneKind } from '../../data/farmMap';
import { farmPalette } from './farmPalette';

export const FARM_TILE_SIZE = 64;
const PLAYER_SIZE = 56;
const NPC_SIZE = 56;

export function farmZoneTextureKey(kind: FarmZoneKind): string {
  return `farm-zone-${kind}`;
}

const ZONE_COLORS: Record<FarmZoneKind, { base: number; accent: number }> = {
  grass: { base: farmPalette.grass, accent: farmPalette.grassAlt },
  path: { base: farmPalette.path, accent: farmPalette.grassAlt },
  water: { base: farmPalette.water, accent: farmPalette.waterAlt },
  barn: { base: farmPalette.barn, accent: farmPalette.barnRoof },
  barnRoof: { base: farmPalette.barnRoof, accent: farmPalette.barn },
  fence: { base: farmPalette.fence, accent: farmPalette.post },
  trough: { base: farmPalette.trough, accent: farmPalette.water },
  post: { base: farmPalette.post, accent: farmPalette.barnRoof },
};

/**
 * Generates every farm texture. Idempotent — safe to call on each `create()`,
 * which matters because React StrictMode tears the game down and rebuilds it in dev.
 */
export function ensureFarmTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const bake = (key: string, width: number, height: number, draw: () => void) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, width, height);
  };

  // --- Terrain tiles: flat colour with a little texture so edges are readable ---
  (Object.keys(ZONE_COLORS) as FarmZoneKind[]).forEach((kind) => {
    const { base, accent } = ZONE_COLORS[kind];
    bake(farmZoneTextureKey(kind), FARM_TILE_SIZE, FARM_TILE_SIZE, () => {
      g.fillStyle(base, 1);
      g.fillRect(0, 0, FARM_TILE_SIZE, FARM_TILE_SIZE);
      g.fillStyle(accent, 0.35);
      // A fixed dither rather than random, so tiles line up seamlessly.
      g.fillRect(0, 0, FARM_TILE_SIZE / 2, FARM_TILE_SIZE / 2);
      g.fillRect(FARM_TILE_SIZE / 2, FARM_TILE_SIZE / 2, FARM_TILE_SIZE / 2, FARM_TILE_SIZE / 2);
    });
  });

  // --- Player: a rounded body with a nose, so facing is legible ---
  bake('farm-player', PLAYER_SIZE, PLAYER_SIZE, () => {
    g.fillStyle(farmPalette.playerOutline, 1);
    g.fillRoundedRect(2, 2, PLAYER_SIZE - 4, PLAYER_SIZE - 4, 14);
    g.fillStyle(farmPalette.player, 1);
    g.fillRoundedRect(5, 5, PLAYER_SIZE - 10, PLAYER_SIZE - 10, 12);
    g.fillStyle(farmPalette.playerOutline, 1);
    g.fillCircle(PLAYER_SIZE / 2, PLAYER_SIZE - 14, 6);
  });

  // --- NPC: a circle, tinted per animal at runtime ---
  bake('farm-npc', NPC_SIZE, NPC_SIZE, () => {
    g.fillStyle(0x000000, 1);
    g.fillCircle(NPC_SIZE / 2, NPC_SIZE / 2, NPC_SIZE / 2 - 1);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(NPC_SIZE / 2, NPC_SIZE / 2, NPC_SIZE / 2 - 4);
  });

  // --- Soft contact shadow so actors sit on the ground ---
  bake('farm-shadow', PLAYER_SIZE, 16, () => {
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(PLAYER_SIZE / 2, 8, PLAYER_SIZE - 8, 12);
  });

  // --- Virtual joystick ---
  bake('farm-stick-base', 160, 160, () => {
    g.fillStyle(0xffffff, 0.12);
    g.fillCircle(80, 80, 78);
    g.lineStyle(4, 0xffffff, 0.35);
    g.strokeCircle(80, 80, 76);
  });
  bake('farm-stick-thumb', 72, 72, () => {
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(36, 36, 34);
    g.lineStyle(3, 0xffffff, 0.7);
    g.strokeCircle(36, 36, 33);
  });

  g.destroy();
}
