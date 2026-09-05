/**
 * Which animal assets a scene actually needs, derived from the data that already names
 * the cast so the lists cannot drift.
 *
 * Farm and Trial both load atlases *and* emotion sheets: the overworld does not play
 * emotions, but every farm NPC can be a Trial opponent, and prefetching here is what
 * makes Farm → Trial a cache hit. The gallery loads the whole descriptor list on open.
 * MainMenu loads none.
 *
 * Textures stay in Phaser's game-wide cache once fetched, so a second visit queues
 * nothing and `queueAnimalAssets` returns false.
 */
import type { Scene } from 'phaser';
import { FARM_NPCS } from '../../data/farmMap';
import { PLAYER_CHARACTER_ID, resolveCharacter, type AnimalSpriteId } from '../../data/characters';
import { DEBATES, type DebateScenarioKey } from '../../data/levels';
import { debateParticipantIds } from '../../data/debateCast';
import { ANIMAL_SPRITE_IDS } from './animalDescriptors';
import { loadAnimalAtlases } from './animalAtlases';
import { ensureAnimalAnimations } from './animalAnimations';
import {
  ensureAnimalEmotionAnimations,
  emotionTextureKey,
  generatedEmotions,
  loadAnimalEmotionSheets,
} from './animalEmotionAnimations';
import { useGameStore } from '../../store/gameStore';

export interface AnimalAssetOptions {
  emotions?: boolean;
}

export interface AnimalPack {
  ids: readonly AnimalSpriteId[];
  emotions: boolean;
}

function uniqueIds(ids: readonly (AnimalSpriteId | null)[]): AnimalSpriteId[] {
  const seen = new Set<AnimalSpriteId>();
  const out: AnimalSpriteId[] = [];
  for (const id of ids) {
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Level 1 overworld: Rue plus every farm NPC that has art. */
export function farmAnimalIds(): AnimalSpriteId[] {
  return uniqueIds([
    resolveCharacter(PLAYER_CHARACTER_ID).animal,
    ...FARM_NPCS.map((npc) => resolveCharacter(npc.id).animal),
  ]);
}

/** The staged cast of one debate. Legacy speakers with no `animal` contribute nothing. */
export function trialAnimalIds(debateId: DebateScenarioKey): AnimalSpriteId[] {
  const debate = DEBATES[debateId];
  if (!debate) return [];
  return uniqueIds(debateParticipantIds(debate).map((id) => resolveCharacter(id).animal));
}

/** Every descriptor — the gallery is the place that needs the unused imports too. */
export function galleryAnimalIds(): AnimalSpriteId[] {
  return [...ANIMAL_SPRITE_IDS];
}

/** Pack for a scene key, or null when that scene does not load animal art. */
export function animalPackForScene(
  sceneKey: string,
  debateId: DebateScenarioKey,
): AnimalPack | null {
  switch (sceneKey) {
    case 'Farm':
      return { ids: farmAnimalIds(), emotions: true };
    case 'Trial':
      return { ids: trialAnimalIds(debateId), emotions: true };
    case 'AnimalGallery':
      return { ids: galleryAnimalIds(), emotions: true };
    default:
      return null;
  }
}

export function animalAssetsMissing(
  textures: Scene['textures'],
  ids: readonly AnimalSpriteId[],
  options: AnimalAssetOptions = {},
): boolean {
  for (const id of ids) {
    if (!textures.exists(id)) return true;
    if (!options.emotions) continue;
    for (const emotion of generatedEmotions(id)) {
      if (!textures.exists(emotionTextureKey(id, emotion))) return true;
    }
  }
  return false;
}

/**
 * Queues missing atlases (and, optionally, emotion sheets) on `scene`'s loader.
 * Returns whether anything was actually queued — callers skip the progress overlay
 * when this is false, so a cached revisit does not flash the loading screen.
 */
export function queueAnimalAssets(
  scene: Scene,
  ids: readonly AnimalSpriteId[],
  options: AnimalAssetOptions = {},
): boolean {
  const atlasQueued = loadAnimalAtlases(scene, ids);
  const emotionQueued = options.emotions ? loadAnimalEmotionSheets(scene, ids) : false;
  return atlasQueued || emotionQueued;
}

export function queueAnimalPackForScene(scene: Scene): boolean {
  const pack = animalPackForScene(scene.scene.key, useGameStore.getState().activeDebateId);
  if (!pack) return false;
  return queueAnimalAssets(scene, pack.ids, { emotions: pack.emotions });
}

export function ensureAnimalPackForScene(scene: Scene): void {
  const pack = animalPackForScene(scene.scene.key, useGameStore.getState().activeDebateId);
  if (!pack) return;
  ensureAnimalAnimations(scene, pack.ids);
  if (pack.emotions) ensureAnimalEmotionAnimations(scene, pack.ids);
}
