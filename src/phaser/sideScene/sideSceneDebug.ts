/**
 * Debug-only overlay for a lateral scene: the walkable road band, the portal markers (plus
 * each one's `PORTAL_INTERACT_RADIUS` ring), and the default entry spawn point, drawn once
 * in world space. Gated behind `DEBUG_SIDE_SCENE` in `FarmSide.ts`. Pays for itself while
 * tuning a scene's portal placements and spawn — no need to walk to a portal and watch the
 * store to see where its arm radius actually reaches.
 *
 * Iteration 1's debug walker lived here too, and is gone: the real cast
 * (`sideSceneActors.ts`) carries the traversal contract it was proving now.
 */
import type { Scene } from 'phaser';
import { resolveEntrySpawn, resolvePortal } from './sideSceneRoad';
import { PORTAL_INTERACT_RADIUS } from './sideSceneInteractions';
import { BAND_DEPTH } from './sideSceneProps';
import type { SideSceneDescriptor } from '../../types/sideScene';

/** Road band + portal markers + spawn point, drawn once in world space (they never move). */
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
    const { x, y } = resolvePortal(portal, descriptor);

    scene.add
      .graphics()
      .setScrollFactor(1)
      .setDepth(overlayDepth)
      .lineStyle(4, 0xffdd00, 0.9)
      .lineBetween(x, descriptor.road.top - 20, x, descriptor.road.bottom + 20)
      .lineStyle(2, 0xff66cc, 0.8)
      .strokeCircle(x, y, PORTAL_INTERACT_RADIUS);

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

  const spawn = resolveEntrySpawn(descriptor);
  scene.add
    .graphics()
    .setScrollFactor(1)
    .setDepth(overlayDepth)
    .fillStyle(0x00ffff, 0.9)
    .fillCircle(spawn.x, spawn.y, 8)
    .lineStyle(2, 0x00ffff, 1)
    .strokeCircle(spawn.x, spawn.y, 16);

  scene.add
    .text(spawn.x, descriptor.road.bottom + 26, `spawn (${spawn.facing})`, {
      fontFamily: 'Arial Black',
      fontSize: 16,
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 0)
    .setScrollFactor(1)
    .setDepth(overlayDepth);
}
