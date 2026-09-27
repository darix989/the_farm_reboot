/**
 * Animation gallery — one animal, one clip, on demand, or every clip in turn.
 *
 * Every other scene plays animations the way the *game* wants them: weighted, random,
 * interrupted by whatever the debate is doing (`AnimalAnimator`). That makes it a poor place
 * to judge a clip. Reviewing generated art means holding exactly one clip on a loop, next to
 * the atlas clips it has to sit beside, and switching between them faster than a debate ever
 * would. So this scene deliberately does **not** use `AnimalAnimator` — it plays a single key
 * and holds it.
 *
 * With nothing focused (the opening state) it plays every available clip once, in catalogue
 * order, and starts over: a phased emotion as its whole chain, everything else stretched to at
 * least `CYCLE_MIN_MS` so a two-frame clip still registers. Focusing a clip stops the cycle.
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
import { animalSetup, ensureAnimalAnimations } from '../animals/animalAnimations';
import {
  ensureAnimalPackForScene,
  queueAnimalAssets,
  queueAnimalPackForScene,
} from '../animals/animalPacks';
import { animalClips, type AnimalClip } from '../animals/animalClipCatalogue';
import { animalArtFacesLeft, ANIMAL_STAGING, applyAtlasFeetOrigin } from '../animals/animalStaging';
import {
  applyEmotionStaging,
  captureStaging,
  ensureAnimalEmotionAnimations,
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

/**
 * The shortest a clip stays on stage during the unfocused cycle. A short clip is repeated whole
 * until it reaches this, never cut off mid-play: a loop that pops at its seam should pop here.
 */
const CYCLE_MIN_MS = 1500;

const BACKGROUND = 0x2f2f33;
const FLOOR_LINE = 0x4a4a52;

export class AnimalGallery extends Scene {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  /** Which animal `sprite` is, so a late load for an animal already on stage is a no-op. */
  private spriteAnimalId: AnimalSpriteId | null = null;
  private baseStaging: SpriteStaging | null = null;
  /** The `@sequence` chain being played, restarted each time it runs out. */
  private sequence: AnimalClip['sequence'] | null = null;
  /** The unfocused cycle's playlist, or null while a clip is focused. */
  private cycle: AnimalClip[] | null = null;
  private cycleIndex = 0;
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
    this.showSelection(state.animalId, state.clipName);

    // Vanilla zustand `subscribe` takes a single (state, prevState) listener, not a selector —
    // see `gameManager.ts` for the selector-style call that does NOT type-check here.
    this.unsubscribe = useAnimalGalleryStore.subscribe((next, prev) => {
      if (next.animalId !== prev.animalId) {
        this.showAnimal(next.animalId);
        return;
      }
      if (next.clipName !== prev.clipName) this.showSelection(next.animalId, next.clipName);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, this.onAnimalLoaded, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    EventBus.emit('current-scene-ready', this);
  }

  /**
   * Puts `animalId` on stage, fetching its atlas and emotion sheets first if this is the
   * first time it has been picked. Only the opening animal comes with the scene
   * (`galleryAnimalIds`); every other one loads here, once, and stays in Phaser's cache.
   *
   * While it loads the stage is empty, never the previous animal: showing one animal under
   * another's name is the one thing a review tool must not do. Files for an animal picked
   * and abandoned mid-load simply finish in the background — the loader dedupes by key, so
   * picking it again does not fetch twice.
   */
  private showAnimal(animalId: AnimalSpriteId): void {
    const gallery = useAnimalGalleryStore.getState();
    if (!queueAnimalAssets(this, [animalId], { emotions: true })) {
      gallery.setLoadingAnimal(null);
      this.putOnStage(animalId);
      return;
    }
    this.sprite?.destroy();
    this.sprite = null;
    this.spriteAnimalId = null;
    this.baseStaging = null;
    this.sequence = null;
    this.stopCycle();
    gallery.setLoadingAnimal(animalId);
    if (!this.load.isLoading()) this.load.start();
  }

  /** The loader drained: stage whichever animal is selected *now*, not the one that asked. */
  private onAnimalLoaded(): void {
    const gallery = useAnimalGalleryStore.getState();
    gallery.setLoadingAnimal(null);
    if (this.spriteAnimalId !== gallery.animalId) this.putOnStage(gallery.animalId);
  }

  private putOnStage(animalId: AnimalSpriteId): void {
    ensureAnimalAnimations(this, [animalId]);
    ensureAnimalEmotionAnimations(this, [animalId]);
    this.buildSprite(animalId);
    this.showSelection(animalId, useAnimalGalleryStore.getState().clipName);
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
    this.spriteAnimalId = animalId;

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

  /**
   * A focused sequence replays from the top once its last step (the atlas rest) finishes; the
   * cycle moves on to its next clip. Focused non-sequence clips repeat forever and never land
   * here.
   */
  private onClipComplete(): void {
    if (this.sprite?.anims.nextAnim) return;
    if (this.cycle) {
      this.cycleIndex = (this.cycleIndex + 1) % this.cycle.length;
      this.playCycleStep();
    } else if (this.sequence) {
      this.playSequence(this.sequence);
    }
  }

  /** A focused clip plays on its own; no focus starts the cycle. */
  private showSelection(animalId: AnimalSpriteId, clipName: string | null): void {
    if (clipName) this.applyClip(this.findClip(animalId, clipName));
    else this.startCycle(animalId);
  }

  /**
   * Every clip there is art for, once each: the whole chain stands in for a phased emotion's
   * parts, which are what a focus is for. Reduced motion holds the rest frame instead — a
   * cycle of stills would still be the stage changing on its own every second and a half.
   */
  private startCycle(animalId: AnimalSpriteId): void {
    this.applyClip(null);
    const playlist = animalClips(animalId).filter(
      (clip) => clip.available && clip.animKey && (!clip.part || clip.part === 'sequence'),
    );
    if (playlist.length === 0 || prefersReducedMotion() || !this.sprite) return;
    this.cycle = playlist;
    this.cycleIndex = 0;
    this.playCycleStep();
  }

  private playCycleStep(): void {
    const sprite = this.sprite;
    const clip = this.cycle?.[this.cycleIndex];
    if (!sprite || !clip?.animKey) return;
    useAnimalGalleryStore.getState().setCyclingClip(clip.name);
    sprite.chain();
    if (clip.sequence) {
      this.playSequence(clip.sequence);
    } else {
      const duration = this.anims.get(clip.animKey).duration;
      const repeat = duration > 0 ? Math.max(0, Math.ceil(CYCLE_MIN_MS / duration) - 1) : 0;
      sprite.play({ key: clip.animKey, repeat });
    }
    this.restageToCurrentClip();
  }

  private stopCycle(): void {
    this.cycle = null;
    this.cycleIndex = 0;
    useAnimalGalleryStore.getState().setCyclingClip(null);
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
    this.stopCycle();
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
    this.load.off(Phaser.Loader.Events.COMPLETE, this.onAnimalLoaded, this);
    useAnimalGalleryStore.getState().setLoadingAnimal(null);
    this.stopCycle();
    this.sprite?.destroy();
    this.spriteAnimalId = null;
    this.sprite = null;
    this.baseStaging = null;
  }
}
