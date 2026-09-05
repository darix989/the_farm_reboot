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
 * React draws the controls (`AnimalGalleryUI`) over the right-hand side of the stage; this
 * scene keeps the animal inside `ANIMAL_GALLERY_STAGE` so the two never overlap.
 */
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { ANIMAL_GALLERY_STAGE } from '../../utils/constants';
import { useAnimalGalleryStore } from '../../store/animalGalleryStore';
import { animalSetup } from '../animals/animalAnimations';
import { animalClips, type AnimalClip } from '../animals/animalClipCatalogue';
import { ANIMAL_STAGING } from '../animals/animalStaging';
import {
  applyEmotionStaging,
  captureStaging,
  emotionSheet,
  restoreStaging,
  type SpriteStaging,
} from '../animals/animalEmotionAnimations';
import { isAnimalEmotion } from '../animals/animalEmotions';
import { prefersReducedMotion } from '../../utils/reducedMotion';
import type { AnimalSpriteId } from '../../data/characters';

/**
 * Preview size relative to the Trial's staging. Larger than the Trial (which has to fit three
 * animals in a 540px hole) because judging a clip means seeing it bigger than the game shows
 * it — but derived from `trialScale` rather than picked freely, so the cast keeps the relative
 * size hierarchy the art direction encodes (see `animalStaging.ts`).
 */
const GALLERY_SCALE_OF_TRIAL = 1.6;

/** Fraction of the stage height the animal stands on. */
const FLOOR_RATIO = 0.82;

/** Half of one crossfade. Short enough not to feel like a transition you are waiting on. */
const FADE_MS = 130;

const BACKGROUND = 0x2f2f33;
const FLOOR_LINE = 0x4a4a52;

export class AnimalGallery extends Scene {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private baseStaging: SpriteStaging | null = null;
  private unsubscribe: (() => void) | null = null;
  private fadeTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('AnimalGallery');
  }

  create() {
    this.cameras.main.setBackgroundColor(BACKGROUND);
    this.drawStage();

    const state = useAnimalGalleryStore.getState();
    this.buildSprite(state.animalId);
    this.applyClip(this.findClip(state.animalId, state.clipName));

    // Vanilla zustand `subscribe` takes a single (state, prevState) listener, not a selector —
    // see `gameManager.ts` for the selector-style call that does NOT type-check here.
    this.unsubscribe = useAnimalGalleryStore.subscribe((next, prev) => {
      if (next.animalId !== prev.animalId) {
        this.switchTo(() => {
          this.buildSprite(next.animalId);
          this.applyClip(this.findClip(next.animalId, next.clipName));
        }, next.smoothTransitions);
        return;
      }
      if (next.clipName !== prev.clipName) {
        this.switchTo(
          () => this.applyClip(this.findClip(next.animalId, next.clipName)),
          next.smoothTransitions,
        );
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

    this.sprite = this.add
      .sprite(
        ANIMAL_GALLERY_STAGE.x + ANIMAL_GALLERY_STAGE.width / 2,
        ANIMAL_GALLERY_STAGE.y + ANIMAL_GALLERY_STAGE.height * FLOOR_RATIO,
        setup.textureKey,
        setup.restFrameName,
      )
      .setOrigin(0.5, 1)
      .setScale(ANIMAL_STAGING[animalId].trialScale * GALLERY_SCALE_OF_TRIAL);

    // Captured after staging and before any clip plays — this is what `restoreStaging` puts
    // back when leaving a generated clip.
    this.baseStaging = captureStaging(this.sprite);
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
      sprite.anims.stop();
      restoreStaging(sprite, base);
      if (setup.restFrameName) sprite.setFrame(setup.restFrameName);
      return;
    }

    // Texture first, then scale/origin. A generated cell is a different canvas from an atlas
    // frame; applying emotion scale while the atlas texture is still showing (or the reverse)
    // is a ~2× flash. `AnimalAnimator` does the same on `ANIMATION_START`.
    const sheet =
      clip.kind === 'emotion' && isAnimalEmotion(clip.name)
        ? emotionSheet(setup.textureKey, clip.name)
        : null;

    if (prefersReducedMotion()) {
      // Hold frame 0 of the requested clip: still shows which clip is selected, without
      // motion. Matches `AnimalAnimator`'s treatment rather than inventing a second one.
      sprite.anims.stop();
      sprite.anims.setCurrentFrame(this.anims.get(clip.animKey).frames[0]!);
    } else {
      sprite.play({ key: clip.animKey, repeat: -1 });
    }

    if (sheet) applyEmotionStaging(sprite, sheet, base);
    else restoreStaging(sprite, base);
  }

  /**
   * Runs `swap` either instantly or hidden behind a fade-out/fade-in.
   *
   * A fade rather than a true crossfade: two spritesheets cannot be blended, and dissolving
   * through the background is both simpler and enough to hide the scale/origin jump that
   * makes an instant switch pop. The in-flight tween is stopped and alpha forced back to 1
   * first, so hammering the buttons cannot strand the sprite half-transparent.
   */
  private switchTo(swap: () => void, smooth: boolean): void {
    const sprite = this.sprite;

    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

    if (!smooth || !sprite || prefersReducedMotion()) {
      sprite?.setAlpha(1);
      swap();
      // `swap` may have replaced the sprite, so re-read it rather than reusing the local.
      this.sprite?.setAlpha(1);
      return;
    }

    this.fadeTween = this.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        swap();
        const next = this.sprite;
        if (!next) return;
        next.setAlpha(0);
        this.fadeTween = this.tweens.add({ targets: next, alpha: 1, duration: FADE_MS });
      },
    });
  }

  private teardown(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.fadeTween?.stop();
    this.fadeTween = null;
    this.sprite?.destroy();
    this.sprite = null;
    this.baseStaging = null;
  }
}
