/**
 * Animation gallery — one animal, one clip, on demand.
 *
 * Every other scene plays animations the way the *game* wants them: weighted, random,
 * interrupted by whatever the debate is doing (`AnimalAnimator`). That makes it a poor place
 * to judge a clip. Reviewing generated art means holding exactly one clip on a loop, next to
 * the atlas clips it has to sit beside, and switching between them faster than a debate ever
 * would. So this scene deliberately does **not** use `AnimalAnimator` — it plays a single key
 * and holds it.
 *
 * What it does share is staging: `applyEmotionStaging` / `restoreStaging` are the same
 * functions `AnimalAnimator` calls, so a clip previewed here is placed exactly as the Trial
 * will place it. A gallery that staged clips its own way would be worse than no gallery.
 *
 * Switching clip is a plain cut. A crossfade would hide exactly the scale/origin jump between
 * an atlas clip and a generated one that a reviewer needs to see.
 *
 * React draws the controls (`AnimalGalleryUI`) over the right-hand side of the stage; this
 * scene keeps the animal inside `ANIMAL_GALLERY_STAGE` so the two never overlap.
 */
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { ANIMAL_GALLERY_STAGE } from '../../utils/constants';
import { useAnimalGalleryStore } from '../../store/animalGalleryStore';
import { animalSetup } from '../animals/animalAnimations';
import { ensureAnimalPackForScene, queueAnimalPackForScene } from '../animals/animalPacks';
import { animalClips, type AnimalClip } from '../animals/animalClipCatalogue';
import { animalArtFacesLeft, ANIMAL_STAGING, applyAtlasFeetOrigin } from '../animals/animalStaging';
import {
  applyEmotionStaging,
  captureStaging,
  emotionClipForAnimKey,
  restoreStaging,
  type SpriteStaging,
} from '../animals/animalEmotionAnimations';
import { prefersReducedMotion } from '../../utils/reducedMotion';
import type { AnimalSpriteId } from '../../data/characters';
import { reportSceneLoadProgress } from '../bootProgress';

/**
 * Preview size relative to the Trial's staging. Larger than the Trial (which has to fit three
 * animals in a 540px hole) because judging a clip means seeing it bigger than the game shows
 * it — but derived from `trialScale` rather than picked freely, so the cast keeps the relative
 * size hierarchy the art direction encodes (see `animalStaging.ts`).
 */
const GALLERY_SCALE_OF_TRIAL = 1.6;

/** Fraction of the stage height the animal stands on. */
const FLOOR_RATIO = 0.82;

/**
 * How long an ease-in or ease-out holds its last frame before replaying. A one-way phase
 * looped back-to-back pops from its end pose to its start pose every cycle, which hides the
 * one thing worth judging about it: where it lands. Long enough to read the landing, short
 * enough that the replay does not feel like waiting.
 */
const PHASE_HOLD_MS = 700;

const BACKGROUND = 0x2f2f33;
const FLOOR_LINE = 0x4a4a52;

export class AnimalGallery extends Scene {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private baseStaging: SpriteStaging | null = null;
  /** The `@sequence` chain being played, restarted each time it runs out. */
  private sequence: AnimalClip['sequence'] | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('AnimalGallery');
  }

  preload() {
    if (queueAnimalPackForScene(this)) reportSceneLoadProgress(this);
  }

  create() {
    ensureAnimalPackForScene(this);
    this.cameras.main.setBackgroundColor(BACKGROUND);
    this.drawStage();

    const state = useAnimalGalleryStore.getState();
    this.buildSprite(state.animalId);
    this.applyClip(this.findClip(state.animalId, state.clipName));

    // Vanilla zustand `subscribe` takes a single (state, prevState) listener, not a selector —
    // see `gameManager.ts` for the selector-style call that does NOT type-check here.
    this.unsubscribe = useAnimalGalleryStore.subscribe((next, prev) => {
      if (next.animalId !== prev.animalId) {
        this.buildSprite(next.animalId);
        this.applyClip(this.findClip(next.animalId, next.clipName));
        return;
      }
      if (next.clipName !== prev.clipName) {
        this.applyClip(this.findClip(next.animalId, next.clipName));
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    EventBus.emit('current-scene-ready', this);
  }

  /** A floor line and nothing else: anything more competes with the thing being judged. */
  private drawStage(): void {
    const floorY = ANIMAL_GALLERY_STAGE.y + ANIMAL_GALLERY_STAGE.height * FLOOR_RATIO;
    this.add
      .rectangle(ANIMAL_GALLERY_STAGE.x, floorY, ANIMAL_GALLERY_STAGE.width, 2, FLOOR_LINE)
      .setOrigin(0, 0);
  }

  private buildSprite(animalId: AnimalSpriteId): void {
    this.sprite?.destroy();

    const setup = animalSetup(animalId);
    if (!this.textures.exists(setup.textureKey)) {
      console.warn(`[gallery] atlas "${setup.textureKey}" not loaded`);
      this.sprite = null;
      this.baseStaging = null;
      return;
    }

    this.sprite = applyAtlasFeetOrigin(
      this.add.sprite(
        ANIMAL_GALLERY_STAGE.x + ANIMAL_GALLERY_STAGE.width / 2,
        ANIMAL_GALLERY_STAGE.y + ANIMAL_GALLERY_STAGE.height * FLOOR_RATIO,
        setup.textureKey,
        setup.restFrameName,
      ),
    )
      .setScale(ANIMAL_STAGING[animalId].trialScale * GALLERY_SCALE_OF_TRIAL)
      .setFlipX(!animalArtFacesLeft(animalId));

    // Captured after staging and before any clip plays — this is what `restoreStaging` puts
    // back when leaving a generated clip.
    this.baseStaging = captureStaging(this.sprite);
    // A sequence swaps texture at every step, so staging follows the clip that just started —
    // the same hook `AnimalAnimator` uses.
    this.sprite.on(Phaser.Animations.Events.ANIMATION_START, this.restageToCurrentClip, this);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onClipComplete, this);
  }

  private restageToCurrentClip(): void {
    const sprite = this.sprite;
    const base = this.baseStaging;
    const key = sprite?.anims.currentAnim?.key;
    if (!sprite || !base || !key) return;
    const sheet = emotionClipForAnimKey(key)?.sheet;
    if (sheet) applyEmotionStaging(sprite, sheet, base);
    else {
      restoreStaging(sprite, base);
      applyAtlasFeetOrigin(sprite);
    }
  }

  /** Replays the sequence from the top once its last step (the atlas rest) finishes. */
  private onClipComplete(): void {
    if (!this.sequence || this.sprite?.anims.nextAnim) return;
    this.playSequence(this.sequence);
  }

  private playSequence(steps: NonNullable<AnimalClip['sequence']>): void {
    const sprite = this.sprite;
    if (!sprite) return;
    const [first, ...rest] = steps.map((step) => ({ key: step.animKey, repeat: step.repeat }));
    sprite.chain();
    sprite.play(first!);
    if (rest.length > 0) sprite.chain(rest);
  }

  private findClip(animalId: AnimalSpriteId, clipName: string | null): AnimalClip | null {
    if (!clipName) return null;
    return animalClips(animalId).find((clip) => clip.name === clipName) ?? null;
  }

  /**
   * Plays one clip and holds it. An unavailable clip (an emotion with no generated art yet)
   * falls back to the rest frame rather than leaving whatever was on screen — showing the
   * previous animal's animation under a new label is the one thing a review tool must not do.
   */
  private applyClip(clip: AnimalClip | null): void {
    const sprite = this.sprite;
    const base = this.baseStaging;
    if (!sprite || !base) return;

    const setup = animalSetup(useAnimalGalleryStore.getState().animalId);

    if (!clip?.available || !clip.animKey) {
      this.sequence = null;
      sprite.anims.stop();
      restoreStaging(sprite, base);
      if (setup.restFrameName) sprite.setFrame(setup.restFrameName);
      applyAtlasFeetOrigin(sprite);
      return;
    }

    // Texture first, then scale/origin. A generated cell is a different canvas from an atlas
    // frame; applying emotion scale while the atlas texture is still showing (or the reverse)
    // is a ~2× flash. `AnimalAnimator` does the same on `ANIMATION_START`.
    // Resolved from the animation key so a phase clip (`angry@in`) gets its own sheet's
    // normalization; a fallback emotion plays an atlas key and resolves to null, as it should.
    const sheet = emotionClipForAnimKey(clip.animKey)?.sheet ?? null;

    this.sequence = null;
    sprite.chain();
    if (prefersReducedMotion()) {
      // Hold frame 0 of the requested clip: still shows which clip is selected, without
      // motion. Matches `AnimalAnimator`'s treatment rather than inventing a second one.
      sprite.anims.stop();
      sprite.anims.setCurrentFrame(this.anims.get(clip.animKey).frames[0]!);
    } else if (clip.sequence) {
      this.sequence = clip.sequence;
      this.playSequence(clip.sequence);
    } else if (clip.part === 'in' || clip.part === 'out') {
      sprite.play({ key: clip.animKey, repeat: -1, repeatDelay: PHASE_HOLD_MS });
    } else {
      sprite.play({ key: clip.animKey, repeat: -1 });
    }

    if (sheet) applyEmotionStaging(sprite, sheet, base);
    else {
      restoreStaging(sprite, base);
      applyAtlasFeetOrigin(sprite);
    }
  }

  private teardown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.sprite?.destroy();
    this.sprite = null;
    this.baseStaging = null;
  }
}
