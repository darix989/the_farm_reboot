import { EventBus } from '../EventBus';
import { BlendModes, Scene } from 'phaser';
import { TRIAL_STAGE_HOLE } from '../../utils/constants';
import { prefersReducedMotion } from '../../utils/reducedMotion';
import { useGameStore } from '../../store/gameStore';
import { useTrialStageStore } from '../../store/trialStageStore';
import { DEBATES } from '../../data/levels';
import { debateHasSpeakerSpotlight, debateParticipantIds, stageOrder } from '../../data/debateCast';
import { resolveCharacter } from '../../data/characters';
import { animalSetup } from '../animals/animalAnimations';
import { ensureAnimalPackForScene, queueAnimalPackForScene } from '../animals/animalPacks';
import { attachAnimalAnimator, type AnimalAnimator } from '../animals/AnimalAnimator';
import {
  ANIMAL_STAGING,
  TRIAL_SCALE_BY_CAST_SIZE,
  animalArtFacesLeft,
  applyAtlasFeetOrigin,
  atlasTrimmedDisplayHeight,
  atlasTrimmedDisplayWidth,
} from '../animals/animalStaging';
import { ANIMAL_EMOTIONS, type AnimalEmotion } from '../animals/animalEmotions';
import { reportSceneLoadProgress } from '../bootProgress';

/** Draws the `TRIAL_STAGE_HOLE` rect and a marker at each computed cast slot. Toggle to
 *  check the Phaser rect and the `.trialGameHole` CSS cell still agree — nothing else
 *  enforces that they do. */
const DEBUG_TRIAL_STAGE = false;

/** `A` / `S` force the whole cast to alert / idle and `1`..`5` to each `ANIMAL_EMOTIONS`
 *  entry, for tuning a descriptor's sequences or reviewing generated emotion clips without
 *  stepping through a whole debate. Off by default: the Trial screen has focusable React
 *  inputs, and an always-on handler would fire while typing. */
const DEBUG_STAGE_KEYS = false;

/** Matches `--ui-color-surface-trial-panel`, restoring the surface colour the (now
 *  transparent) `.trialGameHole` used to paint, so the hole still reads as a framed stage
 *  even when nothing has art (legacy debates). */
const STAGE_BACKGROUND = 0x3a3a3a;

/** Idle / non-speakers sit under the dimmer; the active speaker stands above the beam. */
const CAST_IDLE_DEPTH = 1;
const SPOTLIGHT_DIMMER_DEPTH = 5;
const SPOTLIGHT_BEAM_DEPTH = 9;
const CAST_SPEAKER_DEPTH = 10;

const SPOTLIGHT_TEXTURE_KEY = 'trial-speaker-spotlight';
const SPOTLIGHT_TEXTURE_SIZE = 256;
const SPOTLIGHT_DIMMER_ALPHA = 0.45;
const SPOTLIGHT_TWEEN_MS = 280;
/** Oval is a little larger than the trimmed body so a halo reads around the speaker. */
const SPOTLIGHT_BEAM_WIDTH_SCALE = 1.7;
const SPOTLIGHT_BEAM_HEIGHT_SCALE = 1.85;

interface CastMember {
  sprite: Phaser.GameObjects.Sprite;
  animator: AnimalAnimator;
}

/**
 * Backdrop for the debate overlay. Draws the placeholder animal cast for the active debate
 * inside `TRIAL_STAGE_HOLE`; `TrialUI`'s `.trialGameHole` cell is transparent so this shows
 * through. `CharacterStage` still renders nameplates (or, for legacy debates with no cast
 * art, the original CSS busts) over the top — see `CharacterStage.tsx`.
 */
export class Trial extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  private cast = new Map<string, CastMember>();
  private unsubscribeSpeaker: (() => void) | null = null;
  private stageKeysHandler: ((event: KeyboardEvent) => void) | null = null;
  private speakerSpotlight: {
    dimmer: Phaser.GameObjects.Rectangle;
    beam: Phaser.GameObjects.Image;
  } | null = null;
  /** Last speaker the beam was aimed at; null while the dimmer is off (intro / recap). */
  private spotlightSpeakerId: string | null = null;

  constructor() {
    super('Trial');
  }

  preload() {
    if (queueAnimalPackForScene(this)) reportSceneLoadProgress(this);
  }

  create() {
    ensureAnimalPackForScene(this);
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x1a1a1a);

    this.add
      .rectangle(
        TRIAL_STAGE_HOLE.x,
        TRIAL_STAGE_HOLE.y,
        TRIAL_STAGE_HOLE.width,
        TRIAL_STAGE_HOLE.height,
        STAGE_BACKGROUND,
      )
      .setOrigin(0, 0)
      .setDepth(-100);

    if (DEBUG_TRIAL_STAGE) this.drawStageDebug();

    this.buildCast();
    const stage = useTrialStageStore.getState();
    this.applyActiveSpeaker(stage.activeSpeakerId, stage.activeEmotion);

    // zustand v5's vanilla `subscribe` (no `subscribeWithSelector` middleware here) takes a
    // single listener receiving (state, previousState) — not a selector. Compare the field
    // yourself; see `gameManager.ts` for the selector-style call that does NOT type-check.
    this.unsubscribeSpeaker = useTrialStageStore.subscribe((state, prevState) => {
      if (
        state.activeSpeakerId !== prevState.activeSpeakerId ||
        state.activeEmotion !== prevState.activeEmotion
      ) {
        this.applyActiveSpeaker(state.activeSpeakerId, state.activeEmotion);
      }
    });

    if (DEBUG_STAGE_KEYS) this.bindDebugKeys();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);

    EventBus.emit('current-scene-ready', this);
  }

  private buildCast(): void {
    const { activeDebateId } = useGameStore.getState();
    const debate = DEBATES[activeDebateId];
    if (!debate) return;

    // Read the scenario KEY (`activeDebateId`), never `debate.id` — the two are documented
    // to differ (e.g. 'level1-boss-pond-motion' vs '015_tobias_vs_rue') and `DEBATES` is
    // keyed by the former.
    const ids = stageOrder(debateParticipantIds(debate));
    const n = ids.length;
    const sizeScale = TRIAL_SCALE_BY_CAST_SIZE[n] ?? 0.8;
    const centreX = TRIAL_STAGE_HOLE.x + TRIAL_STAGE_HOLE.width / 2;
    const floorY = TRIAL_STAGE_HOLE.y + TRIAL_STAGE_HOLE.height * 0.9;

    ids.forEach((id, i) => {
      const visual = resolveCharacter(id);
      if (!visual.animal || !this.textures.exists(visual.animal)) return; // legacy speaker

      const setup = animalSetup(visual.animal);
      const x = TRIAL_STAGE_HOLE.x + (TRIAL_STAGE_HOLE.width * (i + 1)) / (n + 1);
      const sprite = applyAtlasFeetOrigin(
        this.add.sprite(x, floorY, setup.textureKey, setup.restFrameName),
      )
        .setScale(ANIMAL_STAGING[visual.animal].trialScale * sizeScale)
        .setFlipX(x < centreX === animalArtFacesLeft(visual.animal));

      const animator = attachAnimalAnimator(sprite, setup, {
        // `trial` selects idleTrial/alertTrial — Rue sits up, Tobias stops grazing. Which
        // characters want that is cast data, not a property of the stage.
        staging: visual.usesTrialIdle ? 'trial' : 'farm',
        desyncDelayMs: [0, 200], // near-zero: a reaction must land on the beat of dialogue
      });
      if (!animator) return;
      animator.playIdle();
      this.cast.set(id, { sprite, animator });

      if (DEBUG_TRIAL_STAGE) {
        this.add.circle(x, floorY, 6, 0xff00ff).setDepth(200);
      }
    });

    if (debateHasSpeakerSpotlight(debate) && this.cast.size > 0) {
      this.buildSpeakerSpotlight();
    }
  }

  /**
   * Dark overlay across the hole plus a soft oval behind the speaker. Depths are load-bearing:
   * idle sprites (1) sit under the dimmer (5), the beam (9) sits just behind the speaker (10).
   */
  private buildSpeakerSpotlight(): void {
    ensureSpeakerSpotlightTexture(this);
    if (!this.textures.exists(SPOTLIGHT_TEXTURE_KEY)) return;

    const dimmer = this.add
      .rectangle(
        TRIAL_STAGE_HOLE.x,
        TRIAL_STAGE_HOLE.y,
        TRIAL_STAGE_HOLE.width,
        TRIAL_STAGE_HOLE.height,
        0x000000,
        1,
      )
      .setOrigin(0, 0)
      .setDepth(SPOTLIGHT_DIMMER_DEPTH)
      .setAlpha(0);

    const beam = this.add
      .image(0, 0, SPOTLIGHT_TEXTURE_KEY)
      .setDepth(SPOTLIGHT_BEAM_DEPTH)
      .setBlendMode(BlendModes.ADD)
      .setAlpha(0)
      .setVisible(false);

    this.speakerSpotlight = { dimmer, beam };
  }

  private applyActiveSpeaker(speakerId: string | null, emotion: AnimalEmotion | null): void {
    this.cast.forEach(({ sprite, animator }, id) => {
      const isActive = id === speakerId;
      // `playEmotion` falls back to `playAlert()` itself when this animal has no generated
      // clip, so an un-generated cast behaves exactly as it did before emotions existed.
      if (isActive && emotion) animator.playEmotion(emotion);
      else if (isActive) animator.playAlert();
      else animator.playIdle();
      sprite.setDepth(isActive ? CAST_SPEAKER_DEPTH : CAST_IDLE_DEPTH);
      // Matches `CharacterStage`'s `.dimmed` treatment: full opacity while nobody (yet) has
      // the floor, dimmed for everyone but the active speaker once someone does.
      sprite.setAlpha(isActive || speakerId === null ? 1 : 0.55);
    });
    this.applySpeakerSpotlight(speakerId);
  }

  private applySpeakerSpotlight(speakerId: string | null): void {
    const lights = this.speakerSpotlight;
    if (!lights) return;

    const lit = speakerId ? this.cast.get(speakerId) : undefined;
    this.tweens.killTweensOf([lights.dimmer, lights.beam]);

    const duration = prefersReducedMotion() ? 0 : SPOTLIGHT_TWEEN_MS;
    const previousId = this.spotlightSpeakerId;

    if (!lit) {
      this.spotlightSpeakerId = null;
      if (duration === 0) {
        lights.dimmer.setAlpha(0);
        lights.beam.setAlpha(0).setVisible(false);
        return;
      }
      this.tweens.add({ targets: lights.dimmer, alpha: 0, duration });
      this.tweens.add({
        targets: lights.beam,
        alpha: 0,
        duration,
        onComplete: () => {
          if (this.spotlightSpeakerId === null) lights.beam.setVisible(false);
        },
      });
      return;
    }

    const { sprite } = lit;
    const bodyWidth = atlasTrimmedDisplayWidth(sprite);
    const bodyHeight = atlasTrimmedDisplayHeight(sprite);
    const x = sprite.x;
    const y = sprite.y - bodyHeight * 0.5;
    const width = bodyWidth * SPOTLIGHT_BEAM_WIDTH_SCALE;
    const height = bodyHeight * SPOTLIGHT_BEAM_HEIGHT_SCALE;

    this.spotlightSpeakerId = speakerId;
    lights.beam.setVisible(true);

    if (duration === 0) {
      lights.dimmer.setAlpha(SPOTLIGHT_DIMMER_ALPHA);
      lights.beam.setPosition(x, y).setDisplaySize(width, height).setAlpha(1);
      return;
    }

    // First light-up: park the oval on the speaker, then fade in. Sliding from (0, 0)
    // would sweep the beam across the whole hole.
    if (previousId === null) {
      lights.beam.setPosition(x, y).setDisplaySize(width, height).setAlpha(0);
      this.tweens.add({ targets: lights.dimmer, alpha: SPOTLIGHT_DIMMER_ALPHA, duration });
      this.tweens.add({ targets: lights.beam, alpha: 1, duration });
      return;
    }

    if (previousId === speakerId) {
      lights.dimmer.setAlpha(SPOTLIGHT_DIMMER_ALPHA);
      lights.beam.setPosition(x, y).setDisplaySize(width, height).setAlpha(1);
      return;
    }

    this.tweens.add({ targets: lights.dimmer, alpha: SPOTLIGHT_DIMMER_ALPHA, duration });
    this.tweens.add({
      targets: lights.beam,
      x,
      y,
      displayWidth: width,
      displayHeight: height,
      alpha: 1,
      duration,
    });
  }

  private drawStageDebug(): void {
    this.add
      .rectangle(
        TRIAL_STAGE_HOLE.x,
        TRIAL_STAGE_HOLE.y,
        TRIAL_STAGE_HOLE.width,
        TRIAL_STAGE_HOLE.height,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xff00ff)
      .setDepth(200);
  }

  private bindDebugKeys(): void {
    this.stageKeysHandler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a') this.cast.forEach(({ animator }) => animator.playAlert());
      if (key === 's') this.cast.forEach(({ animator }) => animator.playIdle());
      // 1..n cycle the whole cast through `ANIMAL_EMOTIONS`, for eyeballing a freshly
      // generated clip without playing a debate up to the beat that triggers it.
      const emotionIndex = Number.parseInt(key, 10) - 1;
      const emotion = ANIMAL_EMOTIONS[emotionIndex];
      if (emotion) this.cast.forEach(({ animator }) => animator.playEmotion(emotion));
    };
    window.addEventListener('keydown', this.stageKeysHandler);
  }

  private teardown(): void {
    this.unsubscribeSpeaker?.();
    this.unsubscribeSpeaker = null;
    if (this.stageKeysHandler) {
      window.removeEventListener('keydown', this.stageKeysHandler);
      this.stageKeysHandler = null;
    }
    if (this.speakerSpotlight) {
      this.tweens.killTweensOf([this.speakerSpotlight.dimmer, this.speakerSpotlight.beam]);
      this.speakerSpotlight = null;
    }
    this.spotlightSpeakerId = null;
    this.cast.forEach(({ animator }) => animator.destroy());
    this.cast.clear();
  }

  gameOver() {
    this.scene.start('GameOver');
  }
}

/** Soft warm oval used as the speaker beam. Idempotent across Trial re-entries. */
function ensureSpeakerSpotlightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SPOTLIGHT_TEXTURE_KEY)) return;
  const size = SPOTLIGHT_TEXTURE_SIZE;
  const canvas = scene.textures.createCanvas(SPOTLIGHT_TEXTURE_KEY, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const mid = size / 2;
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  gradient.addColorStop(0, 'rgba(255, 244, 210, 0.85)');
  gradient.addColorStop(0.35, 'rgba(255, 230, 170, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 220, 150, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}
