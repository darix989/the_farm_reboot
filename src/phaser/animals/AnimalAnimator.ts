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
import {
  applyEmotionStaging,
  captureStaging,
  emotionSequenceKey,
  emotionSheet,
  restoreStaging,
  type SpriteStaging,
} from './animalEmotionAnimations';
import type { AnimalEmotion } from './animalEmotions';
import type { AnimalBehaviour } from './animalDescriptors';
import { onReducedMotionChange, prefersReducedMotion } from '../../utils/reducedMotion';

export type AnimalStatus = 'none' | 'idle' | 'alert' | 'emotion' | 'move';

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

/**
 * Playback rate of a walk cycle for a character travelling at its top speed.
 *
 * The cast's walk clips were authored at a stroll — 15 frames at 12fps is a 1.25s stride —
 * and the overworld now moves Rue at 167px/s, a little over one of his own body heights per
 * second, so the clip's own rate slightly outpaces the ground and the feet skate. Tuned by
 * eye against the donkey (the most-seen animal); the same number then applies to the rest of
 * the cast, whose clips run at the same 12fps default.
 *
 * It tracks `PLAYER_SPEED`: the skate is a ratio of stride length to ground covered, so
 * changing the one without the other just moves the mismatch to the opposite foot.
 */
const MOVE_RATE_AT_TOP_SPEED = 0.77;
/** A barely-pushed joystick should still lift the feet rather than crawl frame by frame. */
const MIN_MOVE_RATE = 0.4;

function moveRate(speed01: number): number {
  return Phaser.Math.Clamp(speed01 * MOVE_RATE_AT_TOP_SPEED, MIN_MOVE_RATE, MOVE_RATE_AT_TOP_SPEED);
}

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
  private readonly baseStaging: SpriteStaging;
  /** Fraction of top speed the last `playMove` reported, so a re-roll or a reduced-motion
   *  flip back on resumes the cycle at the rate the character is actually travelling at. */
  private moveSpeed = 1;
  private reducedMotionUnsubscribe: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly setup: AnimalSetup,
    private readonly options: AnimalAnimatorOptions = {},
  ) {
    this.baseStaging = captureStaging(sprite);

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onSequenceEnd, this);
    this.reducedMotionUnsubscribe = onReducedMotionChange(() => this.onReducedMotionChange());
  }

  /**
   * `immediate` cuts to the idle sequence instead of easing into it after the current clip's
   * repeat. Default off — an idling animal should ride out whatever it was doing. A character
   * that just *stopped walking* is the exception: waiting out the rest of a looping stride
   * leaves it marching in place for up to a second after the player let go of the key.
   */
  playIdle(immediate = false): void {
    this.status = 'idle';
    this.emotion = null;
    this.restoreBaseStaging();
    const trial = this.options.staging === 'trial';
    const behaviour =
      (trial ? this.setup.descriptor.idleTrial : undefined) ?? this.setup.descriptor.idle;
    const sequence = behaviour ? this.pickSequence(behaviour) : [{ key: 'idle', repeat: -1 }];
    this.playSequence(sequence, immediate);
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
   * Holds the locomotion cycle for as long as the character is translating.
   *
   * Cheap to call every frame, which is how a scene should drive it: once the cycle is
   * running, further calls only retune its playback rate. `speed01` is the fraction of top
   * speed the character is moving at — a half-pushed joystick is 0.5 — so a character
   * dawdling does not stride as if sprinting (see `moveRate`).
   *
   * Movement ends when the *character* stops, not when the clip does, so the caller is the
   * one that ends it: call `playIdle(true)` on the frame the character comes to rest.
   *
   * An animal with no `move` behaviour idles instead — a cast where only some animals have
   * locomotion art degrades to standing still while it slides, exactly what every animal did
   * before movement was wired up, rather than freezing on a missing key.
   */
  playMove(speed01 = 1): void {
    this.moveSpeed = speed01;
    if (this.status === 'move') {
      this.applyPlaybackRate();
      return;
    }
    this.startMove();
  }

  private startMove(): void {
    const behaviour = this.setup.descriptor.move;
    if (!behaviour) {
      if (this.status !== 'idle') this.playIdle(/* immediate */ true);
      return;
    }
    this.status = 'move';
    this.emotion = null;
    this.restoreBaseStaging();
    // No desync delay: the character is already moving across the ground, so anything but an
    // instant start is a visible slide on its rest pose.
    this.playSequence(this.pickSequence(behaviour), /* playImmediately */ true, /* desync */ false);
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
    applyEmotionStaging(this.sprite, sheet, this.baseStaging);
    this.playSequence(
      [{ key: emotionSequenceKey(emotion), repeat: -1 }],
      /* playImmediately */ true,
    );
  }

  /** Undoes `playEmotion`'s scale/origin override. A no-op when none is in effect. */
  private restoreBaseStaging(): void {
    restoreStaging(this.sprite, this.baseStaging);
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

  /** Walk cycles run faster or slower with the character's speed; everything else plays at
   *  the rate its animation was created with. */
  private applyPlaybackRate(): void {
    this.sprite.anims.timeScale = this.status === 'move' ? moveRate(this.moveSpeed) : 1;
  }

  private playSequence(
    sequence: readonly Phaser.Types.Animations.PlayAnimationConfig[],
    playImmediately: boolean,
    desync = true,
  ): void {
    this.applyPlaybackRate();

    if (prefersReducedMotion()) {
      this.applyRestFrame();
      return;
    }

    const [minDelay, maxDelay] = desync
      ? (this.options.desyncDelayMs ?? DEFAULT_DESYNC_DELAY)
      : [0, 0];
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
      else if (this.status === 'move') this.startMove();
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
    else if (this.status === 'move') this.startMove();
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
