import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { TRIAL_STAGE_HOLE } from '../../utils/constants';
import { useGameStore } from '../../store/gameStore';
import { useTrialStageStore } from '../../store/trialStageStore';
import { DEBATES } from '../../data/levels';
import { debateParticipantIds, stageOrder } from '../../data/debateCast';
import { resolveCharacter } from '../../data/characters';
import { animalSetup } from '../animals/animalAnimations';
import { ensureAnimalPackForScene, queueAnimalPackForScene } from '../animals/animalPacks';
import { attachAnimalAnimator, type AnimalAnimator } from '../animals/AnimalAnimator';
import {
  ANIMAL_STAGING,
  TRIAL_SCALE_BY_CAST_SIZE,
  animalArtFacesLeft,
  applyAtlasFeetOrigin,
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
    // to differ (e.g. 'level1-boss-pond-motion' vs '015_duchess_vs_rue') and `DEBATES` is
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
        staging: 'trial', // selects idleTrial/alertTrial (Tobias sits up)
        desyncDelayMs: [0, 200], // near-zero: a reaction must land on the beat of dialogue
      });
      if (!animator) return;
      animator.playIdle();
      this.cast.set(id, { sprite, animator });

      if (DEBUG_TRIAL_STAGE) {
        this.add.circle(x, floorY, 6, 0xff00ff).setDepth(200);
      }
    });
  }

  private applyActiveSpeaker(speakerId: string | null, emotion: AnimalEmotion | null): void {
    this.cast.forEach(({ sprite, animator }, id) => {
      const isActive = id === speakerId;
      // `playEmotion` falls back to `playAlert()` itself when this animal has no generated
      // clip, so an un-generated cast behaves exactly as it did before emotions existed.
      if (isActive && emotion) animator.playEmotion(emotion);
      else if (isActive) animator.playAlert();
      else animator.playIdle();
      sprite.setDepth(isActive ? 10 : 1);
      // Matches `CharacterStage`'s `.dimmed` treatment: full opacity while nobody (yet) has
      // the floor, dimmed for everyone but the active speaker once someone does.
      sprite.setAlpha(isActive || speakerId === null ? 1 : 0.55);
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
    this.cast.forEach(({ animator }) => animator.destroy());
    this.cast.clear();
  }

  gameOver() {
    this.scene.start('GameOver');
  }
}
