/**
 * Weighted idle/alert playback for a single animated sprite.
 *
 * Ported from `the_farm/src/phaser/entities/herdAnimal.ts` (`HerdAnimal`). That class
 * extends `Phaser.GameObjects.Sprite` directly, which does not work here: Rue needs an
 * Arcade physics body, and attaching one to a sprite whose frames vary wildly in trimmed
 * size would make his collider change shape every frame (see `Farm.ts`). So this is a
 * controller that drives an *existing* sprite rather than a sprite subclass — attach it to
 * a plain follower sprite for the player, or directly to an NPC's sprite.
 *
 * Adaptations from the source (see `docs/characters-and-animations.md` for the rest of the
 * port's design notes):
 *   1. `setTimeout(..., 0)` -> `scene.time.delayedCall(0, ...)` for the self-loop restart —
 *      a bare `setTimeout` can fire against a sprite whose scene was torn down by React
 *      StrictMode; a scene timer dies with the scene.
 *   2. An unresolved sequence key warns and is dropped, instead of silently freezing the
 *      animal on `play({ key: '' })` (the source's documented worst debugging experience).
 *   3. `prefers-reduced-motion` freezes the sprite on its rest frame instead of animating.
 */
import { animalAnimKey, type AnimalSetup } from './animalAnimations';
import { emotionSequenceKey, emotionSheet } from './animalEmotionAnimations';
import type { AnimalEmotion } from './animalEmotions';
import type { AnimalBehaviour } from './animalDescriptors';
import { onReducedMotionChange, prefersReducedMotion } from '../../utils/reducedMotion';

export type AnimalStatus = 'none' | 'idle' | 'alert' | 'emotion';

export interface AnimalAnimatorOptions {
  /** Use the `idleTrial` / `alertTrial` behaviour variants. Defaults to 'farm'. */
  staging?: 'farm' | 'trial';
  /**
   * Random start delay range (ms) for the first animation of a sequence. Desynchronises a
   * crowd told to react in the same frame. The source hard-codes [100, 1500] for a 16-strong
   * herd; a 2-3 character debate cast should react almost immediately — see `Trial.ts`.
   */
  desyncDelayMs?: readonly [number, number];
}

const DEFAULT_DESYNC_DELAY: readonly [number, number] = [100, 1500];

export class AnimalAnimator {
  private status: AnimalStatus = 'none';
  /** Which clip `status: 'emotion'` is holding, so a re-roll or a reduced-motion flip back
   *  on can resume the same one instead of dropping to a generic reaction. */
  private emotion: AnimalEmotion | null = null;
  /**
   * The scale and origin the scene staged this sprite with, captured once at construction.
   *
   * A generated emotion clip has to override both (see `EmotionSheet.scale`), and needs
   * something to restore when it stops. Captured here rather than passed in because the two
   * scenes stage sprites differently — `Trial` scales by cast size, `Farm` does not — and the
   * animator's job is to leave the sprite exactly as it found it either way. This does assume
   * the scene sets scale and origin before attaching the animator, which both do.
   */
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;
  private readonly baseOriginX: number;
  private readonly baseOriginY: number;
  private reducedMotionUnsubscribe: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly setup: AnimalSetup,
    private readonly options: AnimalAnimatorOptions = {},
  ) {
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
    this.baseOriginX = sprite.originX;
    this.baseOriginY = sprite.originY;

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onSequenceEnd, this);
    this.reducedMotionUnsubscribe = onReducedMotionChange(() => this.onReducedMotionChange());
  }

  playIdle(): void {
    this.status = 'idle';
    this.emotion = null;
    this.restoreBaseStaging();
    const trial = this.options.staging === 'trial';
    const behaviour =
      (trial ? this.setup.descriptor.idleTrial : undefined) ?? this.setup.descriptor.idle;
    const sequence = behaviour ? this.pickSequence(behaviour) : [{ key: 'idle', repeat: -1 }];
    this.playSequence(sequence, /* playImmediately */ false);
  }

  playAlert(): void {
    this.status = 'alert';
    this.emotion = null;
    this.restoreBaseStaging();
    const trial = this.options.staging === 'trial';
    const behaviour =
      (trial ? this.setup.descriptor.alertTrial : undefined) ?? this.setup.descriptor.alert;
    if (!behaviour) return;
    this.playSequence(this.pickSequence(behaviour), /* playImmediately */ true);
  }

  /**
   * Holds a generated emotion clip for as long as the character owns the moment — it loops
   * rather than re-rolling, because an emotion is a *state* the debate UI enters and leaves,
   * unlike `idle`/`alert` which re-roll a fresh weighted sequence each time they finish.
   *
   * Falls back to `playAlert()` when this animal has no art for the emotion, so a partly
   * generated cast degrades to exactly the behaviour it had before emotions existed instead
   * of freezing on a missing key. Callers therefore never need to check `hasEmotionClip`.
   */
  playEmotion(emotion: AnimalEmotion): void {
    const sheet = emotionSheet(this.setup.textureKey, emotion);
    if (!sheet) {
      this.playAlert();
      return;
    }
    this.status = 'emotion';
    this.emotion = emotion;
    this.sprite.setScale(this.baseScaleX * sheet.scale, this.baseScaleY * sheet.scale);
    this.sprite.setOrigin(sheet.originX, sheet.originY);
    this.playSequence(
      [{ key: emotionSequenceKey(emotion), repeat: -1 }],
      /* playImmediately */ true,
    );
  }

  /** Undoes `playEmotion`'s scale/origin override. A no-op when none is in effect. */
  private restoreBaseStaging(): void {
    this.sprite.setScale(this.baseScaleX, this.baseScaleY);
    this.sprite.setOrigin(this.baseOriginX, this.baseOriginY);
  }

  destroy(): void {
    this.destroyed = true;
    this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onSequenceEnd, this);
    this.reducedMotionUnsubscribe?.();
    this.reducedMotionUnsubscribe = null;
  }

  /** Cumulative-weight roll. Falls back to the first sequence if weights sum to < 1 — a
   *  mis-authored descriptor degrades gracefully rather than throwing. Ported verbatim. */
  private pickSequence(
    behaviour: AnimalBehaviour,
  ): readonly Phaser.Types.Animations.PlayAnimationConfig[] {
    const rand = Math.random();
    let min = 0;
    for (let i = 0; i < behaviour.length; i++) {
      const max = behaviour
        .filter((_, index) => index <= i)
        .reduce((acc, entry) => acc + entry[0], 0);
      if (rand >= min && rand <= max) return behaviour[i]![1];
      min = max;
    }
    return behaviour[0]![1];
  }

  /** Resolves a logical sequence key to its namespaced Phaser key, or null (with a console
   *  warning naming the animal and the missing key) if no such animation was built. */
  private resolveKey(name: string): string | null {
    const key = animalAnimKey(this.setup.textureKey, name);
    if (this.sprite.anims.animationManager.exists(key)) return key;
    console.warn(`[animals] "${this.setup.textureKey}" has no animation named "${name}"`);
    return null;
  }

  private getTransitionOut(currentKey: string): Phaser.Types.Animations.PlayAnimationConfig[] {
    if (currentKey === '') return [];
    const currentAnim = this.setup.descriptor.baseAnimations.find(
      (a) => animalAnimKey(this.setup.textureKey, a.name) === currentKey,
    );
    if (!currentAnim) return [];
    const rule = this.setup.descriptor.transitions?.find((t) => t[0] === currentAnim.name);
    if (!rule) return [];
    return rule[1]
      .map((name) => this.resolveKey(name))
      .filter((key): key is string => key !== null)
      .map((key) => ({ key }));
  }

  private playSequence(
    sequence: readonly Phaser.Types.Animations.PlayAnimationConfig[],
    playImmediately: boolean,
  ): void {
    if (prefersReducedMotion()) {
      this.applyRestFrame();
      return;
    }

    const [minDelay, maxDelay] = this.options.desyncDelayMs ?? DEFAULT_DESYNC_DELAY;
    const transitions = this.getTransitionOut(this.sprite.anims.currentAnim?.key ?? '');
    const fullSequence = [...transitions, ...sequence];

    const resolved = fullSequence
      .map((entry) => ({ ...entry, key: this.resolveKey(entry.key as string) }))
      .filter(
        (entry): entry is Phaser.Types.Animations.PlayAnimationConfig & { key: string } =>
          entry.key !== null,
      );

    if (resolved.length === 0) {
      // Every key in the sequence was unresolved — breathe on the rest pose rather than
      // freezing outright.
      if (this.setup.restAnimKey) {
        this.sprite.play({ key: this.setup.restAnimKey, repeat: -1 });
      }
      return;
    }

    if (playImmediately) this.sprite.stop();
    this.sprite.chain();
    this.sprite.anims.nextAnim = null;

    const [first, ...rest] = resolved;
    const firstAnimation = { ...first, delay: Phaser.Math.Between(minDelay, maxDelay) };

    if (playImmediately) {
      this.sprite.play(firstAnimation);
    } else {
      this.sprite.playAfterRepeat(firstAnimation);
    }

    if (rest.length > 0) this.sprite.chain(rest);
    if (playImmediately && !this.sprite.anims.nextAnim) {
      this.sprite.anims.nextAnim = rest[0] ?? null;
    }
  }

  /** Re-rolls a fresh weighted sequence once the whole chain has finished playing. Guarded
   *  on `!nextAnim` so it fires only at the end of the chain, not after each link. */
  private onSequenceEnd(): void {
    if (this.destroyed) return;
    if (this.sprite.anims.nextAnim) return;
    this.sprite.scene?.time.delayedCall(0, () => {
      if (this.destroyed) return;
      if (this.status === 'idle') this.playIdle();
      else if (this.status === 'alert') this.playAlert();
      else if (this.status === 'emotion' && this.emotion) this.playEmotion(this.emotion);
    });
  }

  private applyRestFrame(): void {
    this.sprite.anims.stop();
    // The rest frame is an atlas frame, so it needs the atlas staging even when the animator
    // was mid-emotion when reduced motion came on.
    this.restoreBaseStaging();
    if (this.setup.restFrameName) this.sprite.setFrame(this.setup.restFrameName);
  }

  private onReducedMotionChange(): void {
    if (this.destroyed) return;
    if (prefersReducedMotion()) {
      this.applyRestFrame();
      return;
    }
    if (this.status === 'idle') this.playIdle();
    else if (this.status === 'alert') this.playAlert();
    else if (this.status === 'emotion' && this.emotion) this.playEmotion(this.emotion);
  }
}

/** Returns null when the character has no atlas loaded — caller should fall back to placeholder art. */
export function attachAnimalAnimator(
  sprite: Phaser.GameObjects.Sprite,
  setup: AnimalSetup,
  options?: AnimalAnimatorOptions,
): AnimalAnimator | null {
  if (!sprite.scene.textures.exists(setup.textureKey)) return null;
  return new AnimalAnimator(sprite, setup, options);
}
