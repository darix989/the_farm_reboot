/**
 * Green Meadows Farm — the Level 1 overworld, authored as plain rectangles.
 *
 * Deliberately not a Tiled tilemap: there is no tileset to build one against, and
 * a handful of rectangles is enough for a farm with four locations. If real art
 * arrives, this file is what a `.tmx` would replace.
 *
 * Coordinates are world-space pixels. The world is larger than the 1920x1080 stage
 * so the camera has somewhere to travel.
 *
 * Story and cast: `docs/level_01_the_pond_motion.md`.
 */
import type { DebateScenarioKey } from './levels';
import type { Labels } from './labels';

export const FARM_WORLD_WIDTH = 2400;
export const FARM_WORLD_HEIGHT = 1600;

/** Where Rue stands the first time the farm loads (the yard, outside the barn). */
export const FARM_SPAWN = { x: 1120, y: 720 } as const;

/** How close Rue must be to an animal before the talk prompt appears. */
export const FARM_INTERACT_RADIUS = 170;

export type FarmZoneKind =
  | 'grass'
  | 'path'
  | 'water'
  | 'barn'
  | 'barnRoof'
  | 'fence'
  | 'trough'
  | 'post';

export interface FarmZone {
  id: string;
  kind: FarmZoneKind;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Blocks the player. Water and buildings do; grass and paths do not. */
  solid?: boolean;
  /** Optional caption drawn over the zone in world space. */
  label?: Labels;
}

export interface FarmNpc {
  /** Must match a key in `CHARACTERS` (`src/data/characters.ts`). */
  id: string;
  x: number;
  y: number;
  /**
   * Encounters this animal owns, in the order they should be offered. The player
   * is given the first one they have not completed. Typed as `DebateScenarioKey`,
   * so a typo here is a compile error against `levels.ts`.
   */
  scenarios: readonly DebateScenarioKey[];
}

/**
 * Painted back-to-front: later zones draw over earlier ones. Grass is the base
 * layer covering the whole world.
 */
export const FARM_ZONES: readonly FarmZone[] = [
  { id: 'ground', kind: 'grass', x: 0, y: 0, width: FARM_WORLD_WIDTH, height: FARM_WORLD_HEIGHT },

  // Paths joining the four locations through the central yard.
  { id: 'path-spine', kind: 'path', x: 1060, y: 260, width: 130, height: 1080 },
  { id: 'path-east', kind: 'path', x: 1180, y: 420, width: 520, height: 120 },
  { id: 'path-west', kind: 'path', x: 520, y: 780, width: 560, height: 120 },
  { id: 'path-south', kind: 'path', x: 1180, y: 1180, width: 620, height: 120 },

  // The Big Barn (north-west) — Duchess and Tobias.
  {
    id: 'barn-body',
    kind: 'barn',
    x: 300,
    y: 160,
    width: 620,
    height: 400,
    solid: true,
    label: 'farmZoneBarn',
  },
  { id: 'barn-roof', kind: 'barnRoof', x: 300, y: 100, width: 620, height: 80, solid: true },

  // The water trough (north-east) — Hetty.
  { id: 'trough', kind: 'trough', x: 1700, y: 330, width: 380, height: 110, solid: true },

  // The sparring post (west) — Cass.
  { id: 'post', kind: 'post', x: 360, y: 800, width: 90, height: 90, solid: true },

  // The Old Pond (south-east) and its outflow drain — the level's key fact.
  {
    id: 'pond',
    kind: 'water',
    x: 1620,
    y: 700,
    width: 620,
    height: 400,
    solid: true,
    label: 'farmZonePond',
  },
  { id: 'drain', kind: 'fence', x: 2180, y: 860, width: 70, height: 70, solid: true },

  // The fence line (south) — Bram.
  { id: 'fence-line', kind: 'fence', x: 900, y: 1360, width: 900, height: 40, solid: true },
];

export const FARM_NPCS: readonly FarmNpc[] = [
  {
    id: 'hetty',
    x: 1800,
    y: 570,
    scenarios: ['010_gossip_trough_hetty'],
  },
  {
    id: 'cass',
    x: 520,
    y: 860,
    scenarios: ['011_sparring_cass_ad_hominem', '013_lab_cass_dirty_feathers'],
  },
  {
    id: 'bram',
    x: 1360,
    y: 1250,
    scenarios: ['012_gossip_trough_bram', '014_skirmish_bram_fenceline'],
  },
  {
    id: 'duchess',
    x: 700,
    y: 620,
    scenarios: ['015_duchess_vs_rue'],
  },
  {
    id: 'tobias',
    x: 880,
    y: 640,
    // The moderator presides; he does not hand out encounters.
    scenarios: [],
  },
];

export function farmNpcById(id: string): FarmNpc | null {
  return FARM_NPCS.find((n) => n.id === id) ?? null;
}
