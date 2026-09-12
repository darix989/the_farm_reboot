/**
 * The animals standing on (and walking along) a lateral farm scene: Rue, who the player
 * drives, and the scene's authored NPCs.
 *
 * This replaces iteration 1's debug walker. Same contract it proved — stay on the road,
 * scale and sort by how far down the road you are — now carried by the real cast, so the
 * two numbers that decide how big an animal reads here (`SIDE_SCALE`, and the road's own
 * depth ramp) live in one place rather than in the scene.
 *
 * Sizing does not reuse `ANIMAL_STAGING.farmScale` unchanged: that multiplier was fit
 * against the top-down farm's 56px placeholder NPCs, and this world is drawn from the
 * Megafarm kit at a scale where a picket fence is ~190 stage px tall. `SIDE_SCALE` is the
 * one flat factor on top, chosen so Rue stands a little under the fence line — a raccoon is
 * small, and the fence is the only prop in the scene at a human-readable scale.
 */
import type { Scene } from 'phaser';
import { movementVector, type FarmKeys } from '../farm/farmInput';
import { clampToRoad, roadDepthScale } from './sideSceneRoad';
import { resolveBandDepth } from './sideSceneProps';
import { PLAYER_CHARACTER_ID, resolveCharacter, type AnimalSpriteId } from '../../data/characters';
import { animalSetup } from '../animals/animalAnimations';
import { attachAnimalAnimator, type AnimalAnimator } from '../animals/AnimalAnimator';
import { animalArtFacesLeft, ANIMAL_STAGING, applyAtlasFeetOrigin } from '../animals/animalStaging';
import type { SideSceneDescriptor, SideSceneNpcSpec } from '../../types/sideScene';

/** Flat multiplier on `ANIMAL_STAGING.farmScale` for this world's much larger art. */
const SIDE_SCALE = 1.6;

const PLAYER_SPEED = 260;

const PLACEHOLDER_TEXTURE_KEY = 'farm-side-placeholder-actor';
const PLACEHOLDER_SIZE = 48;

/**
 * Fallback body for a character with no atlas loaded — the iteration-1 walker's own baked
 * rectangle, kept so a cast member added to a scene before their art exists still walks
 * the road instead of crashing the scene. Same "bake a placeholder with Graphics" pattern
 * as `farmTextures.ts`.
 */
function ensurePlaceholderTexture(scene: Scene): void {
  if (scene.textures.exists(PLACEHOLDER_TEXTURE_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1c1c1c, 1);
  g.fillRoundedRect(2, 2, PLACEHOLDER_SIZE - 4, PLACEHOLDER_SIZE - 4, 12);
  g.fillStyle(0xf4b942, 1);
  g.fillRoundedRect(5, 5, PLACEHOLDER_SIZE - 10, PLACEHOLDER_SIZE - 10, 10);
  g.generateTexture(PLACEHOLDER_TEXTURE_KEY, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
  g.destroy();
}

/** One animal on the road. The sprite is textured, never a shape: `render.roundPixels`
 *  floors textured objects at render time and explicitly leaves shapes alone, so a
 *  `Rectangle` stand-in would snap differently from every prop around it. */
export class SideSceneActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly animal: AnimalSpriteId | null;
  private readonly animator: AnimalAnimator | null = null;

  constructor(
    scene: Scene,
    protected readonly descriptor: SideSceneDescriptor,
    readonly characterId: string,
    x: number,
    y: number,
  ) {
    const visual = resolveCharacter(characterId);
    this.animal = visual.animal && scene.textures.exists(visual.animal) ? visual.animal : null;

    if (this.animal) {
      const setup = animalSetup(this.animal);
      this.sprite = applyAtlasFeetOrigin(
        scene.add.sprite(x, clampToRoad(y, descriptor.road), setup.textureKey, setup.restFrameName),
      );
      this.applyDepthAndScale();
      this.animator = attachAnimalAnimator(this.sprite, setup, { staging: 'farm' });
      this.animator?.playIdle();
      return;
    }

    ensurePlaceholderTexture(scene);
    this.sprite = scene.add
      .sprite(x, clampToRoad(y, descriptor.road), PLACEHOLDER_TEXTURE_KEY)
      .setOrigin(0.5, 1);
    this.applyDepthAndScale();
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /**
   * The box this animal actually *draws* into, in world px — what the talk camera fits two
   * of into the game hole.
   *
   * Not `sprite.getBounds()`: that measures the untrimmed export canvas, which on this cast
   * is 25-100% bigger than the animal (the raccoon's crouch fills under half its own
   * height), so a camera fit to it would frame a lot of empty air. `frame.x` / `frame.y` are
   * the trim offsets *within* that canvas — the same numbers `applyAtlasFeetOrigin` uses to
   * find the feet — and `cutWidth` / `cutHeight` the drawn size.
   */
  get visualBounds(): { left: number; right: number; top: number; bottom: number } {
    const frame = this.sprite.frame;
    const scaleX = Math.abs(this.sprite.scaleX);
    const scaleY = Math.abs(this.sprite.scaleY);
    const width = frame.cutWidth * scaleX;
    const height = frame.cutHeight * scaleY;
    // Offset of the drawn region from the sprite's own position, before any flip.
    const offsetX = (frame.x - this.sprite.originX * frame.realWidth) * scaleX;
    // A flip mirrors the drawn region about the origin, so the offset flips with it.
    const left = this.sprite.flipX ? this.sprite.x - offsetX - width : this.sprite.x + offsetX;
    const top = this.sprite.y + (frame.y - this.sprite.originY * frame.realHeight) * scaleY;
    return { left, right: left + width, top, bottom: top + height };
  }

  /** Turns to look at a world x. A no-op for a character whose art has no facing. */
  faceTowards(x: number): void {
    if (x === this.sprite.x) return;
    this.faceDirection(x < this.sprite.x ? -1 : 1);
  }

  protected faceDirection(dirX: number): void {
    if (!this.animal) return;
    const facesLeft = animalArtFacesLeft(this.animal);
    this.sprite.setFlipX(facesLeft ? dirX > 0 : dirX < 0);
  }

  protected playIdle(immediate = false): void {
    this.animator?.playIdle(immediate);
  }

  protected playMove(speed01: number): void {
    this.animator?.playMove(speed01);
  }

  /**
   * Pseudo-depth: further down the road is nearer the camera, so bigger and sorted in
   * front. Re-applied every frame for the player, once at spawn for everyone else.
   */
  protected applyDepthAndScale(): void {
    const base = this.animal ? ANIMAL_STAGING[this.animal].farmScale * SIDE_SCALE : 1;
    this.sprite.setScale(base * roadDepthScale(this.sprite.y, this.descriptor.road));
    this.sprite.setDepth(resolveBandDepth('ground', this.sprite.y));
  }

  destroy(): void {
    this.animator?.destroy();
    this.sprite.destroy();
  }
}

/** An authored NPC: stands where the descriptor put them, looking the way it says. */
export class SideSceneNpc extends SideSceneActor {
  constructor(scene: Scene, descriptor: SideSceneDescriptor, spec: SideSceneNpcSpec) {
    super(
      scene,
      descriptor,
      spec.characterId,
      spec.x,
      spec.y ?? (descriptor.road.top + descriptor.road.bottom) / 2,
    );
    this.faceDirection(spec.facing === 'right' ? 1 : -1);
  }
}

/** Rue. Walks the road on the same keys as the top-down farm; frozen while a talk is up. */
export class SideScenePlayer extends SideSceneActor {
  private readonly moveVector = new Phaser.Math.Vector2();
  /** Whether the walk cycle is running, so it starts and stops on the frame the player
   *  actually starts and stops moving rather than being re-triggered every frame. */
  private walking = false;

  constructor(
    scene: Scene,
    descriptor: SideSceneDescriptor,
    x: number,
    private readonly keys: FarmKeys | null,
  ) {
    super(
      scene,
      descriptor,
      PLAYER_CHARACTER_ID,
      x,
      (descriptor.road.top + descriptor.road.bottom) / 2,
    );
  }

  /**
   * Nothing on this road is solid — not the props, and not the animals. The road is a lane,
   * not a maze, and a clearance ring around each NPC was worse than what it prevented: it
   * reads as an invisible wall a step before the animal you are walking up to.
   */
  update(deltaMs: number, canMove: boolean): void {
    const dir = canMove ? movementVector(this.keys, null, this.moveVector) : this.moveVector.set(0);
    const dt = deltaMs / 1000;

    const nextY = clampToRoad(this.sprite.y + dir.y * PLAYER_SPEED * dt, this.descriptor.road);
    const nextX = Phaser.Math.Clamp(
      this.sprite.x + dir.x * PLAYER_SPEED * dt,
      0,
      this.descriptor.width,
    );
    this.sprite.setPosition(nextX, nextY);
    if (dir.x !== 0) this.faceDirection(dir.x);
    this.applyDepthAndScale();

    // `dir` is <= 1 and keeps its magnitude, so it doubles as the fraction of top speed to
    // pace the walk cycle at — same contract as `Farm.update`.
    const speed = dir.length();
    if (speed > 0) {
      this.playMove(speed);
      this.walking = true;
      return;
    }
    if (!this.walking) return;
    // `immediate`, or he marches on the spot for the rest of the stride after the key is up.
    this.walking = false;
    this.playIdle(true);
  }
}
