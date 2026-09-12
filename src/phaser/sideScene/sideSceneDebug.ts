/**
 * Debug-only overlay for a lateral scene: the walkable road band and the portal markers,
 * drawn once in world space. Gated behind `DEBUG_SIDE_SCENE` in `FarmSide.ts`.
 *
 * Iteration 1's debug walker lived here too, and is gone: the real cast
 * (`sideSceneActors.ts`) carries the traversal contract it was proving now.
 */
import type { Scene } from 'phaser';
import { resolvePortal } from './sideSceneRoad';
import { BAND_DEPTH } from './sideSceneProps';
import type { SideSceneDescriptor } from '../../types/sideScene';

/** Road band + portal markers, drawn once in world space (they never move). */
export function drawDebugOverlay(scene: Scene, descriptor: SideSceneDescriptor): void {
  const overlayDepth = BAND_DEPTH.front + 1;
  const roadHeight = descriptor.road.bottom - descriptor.road.top;

  scene.add
    .graphics()
    .setScrollFactor(1)
    .setDepth(overlayDepth)
    .fillStyle(0x00ff88, 0.12)
    .fillRect(0, descriptor.road.top, descriptor.width, roadHeight)
    .lineStyle(2, 0x00ff88, 0.6)
    .strokeRect(0, descriptor.road.top, descriptor.width, roadHeight);

  descriptor.portals.forEach((portal) => {
    const { x } = resolvePortal(portal, descriptor);

    scene.add
      .graphics()
      .setScrollFactor(1)
      .setDepth(overlayDepth)
      .lineStyle(4, 0xffdd00, 0.9)
      .lineBetween(x, descriptor.road.top - 20, x, descriptor.road.bottom + 20);

    scene.add
      .text(x, descriptor.road.top - 26, `${portal.id} (${portal.side})`, {
        fontFamily: 'Arial Black',
        fontSize: 16,
        color: '#ffdd00',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(1)
      .setDepth(overlayDepth);
  });
}
