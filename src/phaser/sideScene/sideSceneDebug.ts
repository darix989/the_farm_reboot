/**
 * Debug-only rig for iteration 1: a walker that proves the traversal contract (walk on
 * the road only, from one entrance to one or more exits) and an overlay that draws the
 * road band and portal markers. Gated behind `DEBUG_SIDE_SCENE` in `FarmSide.ts` — flip
 * it off once real characters land.
 *
 * The walker is a textured `Image`, not `add.rectangle`: `render.roundPixels` floors
 * the position of textured game objects at render time but explicitly does not touch
 * shape objects (`Rectangle`, `Graphics`) — a rectangle walker would snap differently
 * from every real prop and the eventual character sprite.
 */
import type { Scene } from 'phaser';
import { createFarmKeys, movementVector, type FarmKeys } from '../farm/farmInput';
import { clampToRoad, resolvePortal, roadDepthScale } from './sideSceneRoad';
import { BAND_DEPTH, resolveBandDepth } from './sideSceneProps';
import type { SideSceneDescriptor } from '../../types/sideScene';

const WALKER_TEXTURE_KEY = 'farm-side-debug-walker';
const WALKER_SIZE = 48;
const WALKER_SPEED = 260;

/** Same "bake a placeholder with Graphics" pattern as `farmTextures.ts`'s `ensureFarmTextures`. */
function ensureWalkerTexture(scene: Scene): void {
  if (scene.textures.exists(WALKER_TEXTURE_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1c1c1c, 1);
  g.fillRoundedRect(2, 2, WALKER_SIZE - 4, WALKER_SIZE - 4, 12);
  g.fillStyle(0xf4b942, 1);
  g.fillRoundedRect(5, 5, WALKER_SIZE - 10, WALKER_SIZE - 10, 10);
  g.fillStyle(0x1c1c1c, 1);
  g.fillCircle(WALKER_SIZE / 2, WALKER_SIZE - 12, 5);
  g.generateTexture(WALKER_TEXTURE_KEY, WALKER_SIZE, WALKER_SIZE);
  g.destroy();
}

export class SideSceneDebugWalker {
  readonly sprite: Phaser.GameObjects.Image;
  private keys: FarmKeys | null;
  private moveVector = new Phaser.Math.Vector2();

  constructor(
    scene: Scene,
    private readonly descriptor: SideSceneDescriptor,
    startX: number,
  ) {
    ensureWalkerTexture(scene);
    const startY = (descriptor.road.top + descriptor.road.bottom) / 2;
    this.sprite = scene.add.image(startX, startY, WALKER_TEXTURE_KEY).setOrigin(0.5, 1);
    this.keys = createFarmKeys(scene);
    this.applyDepthAndScale();
  }

  update(deltaMs: number): void {
    const dir = movementVector(this.keys, null, this.moveVector);
    const dt = deltaMs / 1000;

    const nextX = Phaser.Math.Clamp(
      this.sprite.x + dir.x * WALKER_SPEED * dt,
      0,
      this.descriptor.width,
    );
    const nextY = clampToRoad(this.sprite.y + dir.y * WALKER_SPEED * dt, this.descriptor.road);
    this.sprite.setPosition(nextX, nextY);

    if (dir.x !== 0) this.sprite.setFlipX(dir.x < 0);
    this.applyDepthAndScale();
  }

  private applyDepthAndScale(): void {
    const scale = roadDepthScale(this.sprite.y, this.descriptor.road) * this.descriptor.scale;
    this.sprite.setScale(scale);
    this.sprite.setDepth(resolveBandDepth('ground', this.sprite.y));
  }
}

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
