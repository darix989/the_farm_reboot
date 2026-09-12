/**
 * Which farm-kit images a descriptor actually needs, and queuing them.
 *
 * Mirrors `animalPacks.ts`'s `queueAnimalAssets` shape: `queueSideSceneAssets` returns
 * whether anything was actually queued, so `reportSceneLoadProgress` (and therefore the
 * React loading overlay) only fires on a cold visit.
 */
import type { Scene } from 'phaser';
import { FARM_KIT_ASSETS, type FarmKitAssetId } from './farmKit.generated';
import type { SideSceneDescriptor, SideSceneId } from '../../types/sideScene';

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
 * run; every portal's x sits inside the scene; every portal id is unique within the
 * scene; the scene has at least one portal; and every portal that names a `to` target
 * points at a real scene and portal that link straight back — a one-way door is a soft
 * lock. Cheap enough to run once at `create()` time in dev, or from a test.
 *
 * `scenes` is a required second argument rather than defaulting to `SIDE_SCENES`: doing
 * that would add a value import from `data/` into the one module here that is testable
 * precisely because it has none.
 */
export function validateSideSceneDescriptor(
  descriptor: SideSceneDescriptor,
  scenes: Readonly<Record<SideSceneId, SideSceneDescriptor>>,
): DescriptorIssue[] {
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

  if (descriptor.portals.length === 0) {
    issues.push({ message: `${descriptor.id} has no portals` });
  }

  const seenPortalIds = new Set<string>();
  descriptor.portals.forEach((portal, pi) => {
    if (seenPortalIds.has(portal.id)) {
      issues.push({
        message: `portals[${pi}] "${portal.id}" duplicates another portal id in ${descriptor.id}`,
      });
    }
    seenPortalIds.add(portal.id);

    if (portal.side === 'back' || portal.side === 'front') {
      if (portal.x === undefined || portal.x < 0 || portal.x > descriptor.width) {
        issues.push({
          message: `portals[${pi}] "${portal.id}" x=${portal.x} is outside [0, ${descriptor.width}]`,
        });
      }
    }

    if (!portal.to) return;
    const targetScene = scenes[portal.to.scene];
    if (!targetScene) {
      issues.push({
        message: `portals[${pi}] "${portal.id}" targets unknown scene "${portal.to.scene}"`,
      });
      return;
    }

    const targetPortal = targetScene.portals.find(
      (candidate) => candidate.id === portal.to?.portal,
    );
    if (!targetPortal) {
      issues.push({
        message: `portals[${pi}] "${portal.id}" targets "${portal.to.scene}:${portal.to.portal}", which does not exist`,
      });
      return;
    }

    const linksBack =
      targetPortal.to?.scene === descriptor.id && targetPortal.to?.portal === portal.id;
    if (!linksBack) {
      issues.push({
        message: `portals[${pi}] "${portal.id}" -> "${portal.to.scene}:${portal.to.portal}" is one-way — the target does not link back`,
      });
    }
  });

  return issues;
}
