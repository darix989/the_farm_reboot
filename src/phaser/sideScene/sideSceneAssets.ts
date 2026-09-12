/**
 * Which farm-kit images a descriptor actually needs, and queuing them.
 *
 * Mirrors `animalPacks.ts`'s `queueAnimalAssets` shape: `queueSideSceneAssets` returns
 * whether anything was actually queued, so `reportSceneLoadProgress` (and therefore the
 * React loading overlay) only fires on a cold visit.
 */
import type { Scene } from 'phaser';
import { FARM_KIT_ASSETS, type FarmKitAssetId } from './farmKit.generated';
import type { SideSceneDescriptor } from '../../types/sideScene';

export const FARM_KIT_ASSET_PATH = 'assets/farm-kit';

function textureKey(id: FarmKitAssetId): string {
  return `farm-kit-${id}`;
}

/** Every side scene draws a sky, but it is not part of `descriptor.layers` — see
 *  `sideSceneLayers.ts` — so it has to be added here by hand or it never gets queued. */
const SKY_ASSET: FarmKitAssetId = 'bg/sky';

/** Every asset id a descriptor references, deduped. */
export function sideSceneAssetIds(descriptor: SideSceneDescriptor): FarmKitAssetId[] {
  const ids = new Set<FarmKitAssetId>([SKY_ASSET]);
  descriptor.layers.forEach((layer) => ids.add(layer.asset));
  descriptor.props.forEach((prop) => ids.add(prop.asset));
  descriptor.fences.forEach(() => ids.add('fence/repeating-piece'));
  descriptor.fences.forEach((fence) =>
    fence.gaps.forEach((gap) => {
      if (gap.gate === 'open') ids.add('fence/gate-open');
      if (gap.gate === 'closed') ids.add('fence/gate-closed');
      if (gap.gate === 'complete') ids.add('fence/gate-complete');
    }),
  );
  return [...ids];
}

export function sideSceneTextureKey(id: FarmKitAssetId): string {
  return textureKey(id);
}

export function sideSceneAssetsMissing(
  textures: Scene['textures'],
  descriptor: SideSceneDescriptor,
): boolean {
  return sideSceneAssetIds(descriptor).some((id) => !textures.exists(textureKey(id)));
}

/** Queues every missing asset from `descriptor`. Returns whether anything was queued. */
export function queueSideSceneAssets(scene: Scene, descriptor: SideSceneDescriptor): boolean {
  const previousPath = scene.load.path;
  scene.load.setPath('');

  let queued = false;
  sideSceneAssetIds(descriptor).forEach((id) => {
    const key = textureKey(id);
    if (scene.textures.exists(key)) return;
    scene.load.image(key, `${FARM_KIT_ASSET_PATH}/${FARM_KIT_ASSETS[id].file}`);
    queued = true;
  });

  scene.load.setPath(previousPath);
  return queued;
}

export interface DescriptorIssue {
  message: string;
}

/**
 * Validity checks a descriptor should never fail: every fence gap sits inside its own
 * run, and every portal's x sits inside the scene. Cheap enough to run once at
 * `create()` time in dev, or from a test.
 */
export function validateSideSceneDescriptor(descriptor: SideSceneDescriptor): DescriptorIssue[] {
  const issues: DescriptorIssue[] = [];

  descriptor.fences.forEach((fence, fi) => {
    fence.gaps.forEach((gap, gi) => {
      if (gap.x < fence.fromX || gap.x > fence.toX) {
        issues.push({
          message: `fences[${fi}].gaps[${gi}] at x=${gap.x} is outside its run [${fence.fromX}, ${fence.toX}]`,
        });
      }
    });
  });

  descriptor.portals.forEach((portal, pi) => {
    if (portal.side !== 'back' && portal.side !== 'front') return;
    if (portal.x === undefined || portal.x < 0 || portal.x > descriptor.width) {
      issues.push({
        message: `portals[${pi}] "${portal.id}" x=${portal.x} is outside [0, ${descriptor.width}]`,
      });
    }
  });

  return issues;
}
