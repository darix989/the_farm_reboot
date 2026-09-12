import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH, TRIAL_STAGE_HOLE } from '../../utils/constants';
import { FARM_SIDE_SCENE_ID, SIDE_SCENES } from '../../data/sideScenes';
import { queueSideSceneAssets } from '../sideScene/sideSceneAssets';
import { buildSideSceneLayers, type SideSceneLayers } from '../sideScene/sideSceneLayers';
import { placeFences, placeProps } from '../sideScene/sideSceneProps';
import { drawDebugOverlay } from '../sideScene/sideSceneDebug';
import { resolvePortal } from '../sideScene/sideSceneRoad';
import { SideSceneActor, SideSceneNpc, SideScenePlayer } from '../sideScene/sideSceneActors';
import {
  blendCameraFrames,
  resolveSideSceneCamera,
  type SideSceneCameraFrame,
  type SideSceneWorld,
} from '../sideScene/sideSceneCamera';
import { createFarmKeys, type FarmKeys } from '../farm/farmInput';
import { ensureAnimalPackForScene, queueAnimalPackForScene } from '../animals/animalPacks';
import { reportSceneLoadProgress } from '../bootProgress';
import { useFarmStore } from '../../store/farmStore';
import { prefersReducedMotion } from '../../utils/reducedMotion';

/**
 * Iteration 2 of the lateral farm world: the Megafarm kit assembly of iteration 1, now with
 * the real cast on it — Rue walks the road and the scene's authored NPCs stand on it — and
 * walk-up conversations reusing the overworld's own talk chrome (`farmStore` → `FarmSideUI`
 * → `FarmDialogue`). Still no Trial routing and no scene-to-scene portals; `Farm` stays the
 * live top-down overworld.
 */
const DEBUG_SIDE_SCENE = false;

/** How near Rue has to stand before an animal is offered for a talk, in world px. */
const INTERACT_RADIUS = 400;

/**
 * The talk framing: how far in the camera pushes, and how long it takes to get there.
 *
 * It aims the middle of the two animals at the middle of `TRIAL_STAGE_HOLE` — the band the
 * Dialog and Actions panels leave clear — which is the same contract as
 * `Farm.applyTalkViewport`. The top-down farm can cut straight to it, since its camera is
 * already overhead and a metre of travel away; here the camera has to swing down the length
 * of the stage and push in, so it is eased over `TALK_CAMERA_MS`. A cut would read as a
 * scene change.
 *
 * The zoom is *fitted*, not fixed: the cast's drawn sizes differ by a factor of three or
 * more (Hetty is a whole sheep, Rue a crouching raccoon), and two of them may be standing
 * anywhere from nose to nose to the length of the interact radius apart. A constant that
 * frames one pair crops the next. `TALK_FILL` is the fraction of the hole the pair is fitted
 * into — a little over half, so the move still reads as a push-in without shoving the
 * camera in the animals' faces; `TALK_MAX_ZOOM` holds that line for a pair small enough
 * that the fit would otherwise push past it, and the fit never drops below free roam's own
 * zoom of 1.
 */
const TALK_CAMERA_MS = 1500;
const TALK_FILL = 0.58;
const TALK_MAX_ZOOM = 1.7;

/**
 * Aim ahead of the push, so the pair is in frame for most of the move instead of popping
 * into it at the end — see `blendCameraFrames`. The tween itself runs linear; these are the
 * two curves it is read through.
 */
const AIM_EASE = Phaser.Math.Easing.Cubic.Out;
const PUSH_EASE = Phaser.Math.Easing.Cubic.In;

export class FarmSide extends Scene {
  private descriptor = SIDE_SCENES[FARM_SIDE_SCENE_ID];
  private sceneLayers: SideSceneLayers | null = null;
  private groundBottom = STAGE_DESIGN_HEIGHT;
  private keys: FarmKeys | null = null;
  private player: SideScenePlayer | null = null;
  private npcs: SideSceneNpc[] = [];
  private scrollX = 0;
  /** Tween target, not a plain number: `this.tweens` needs an object to drive. */
  private readonly talkCamera = { blend: 0 };
  /** Where the open talk is framed, held until a closing blend has run all the way back. */
  private talkFrame: SideSceneCameraFrame | null = null;
  private talkTween: Phaser.Tweens.Tween | null = null;
  private unsubscribeFarmUi: (() => void) | null = null;

  constructor() {
    super('FarmSide');
  }

  preload() {
    const kitQueued = queueSideSceneAssets(this, this.descriptor);
    const animalsQueued = queueAnimalPackForScene(this);
    if (kitQueued || animalsQueued) reportSceneLoadProgress(this);
  }

  create() {
    ensureAnimalPackForScene(this);
    useFarmStore.getState().resetFarmUi();

    const { layers, groundBottom } = buildSideSceneLayers(this, this.descriptor);
    this.sceneLayers = layers;
    this.groundBottom = groundBottom;

    placeFences(this, this.descriptor.fences);
    placeProps(this, this.descriptor.props, this.descriptor.scale);

    this.npcs = this.descriptor.npcs.map((spec) => new SideSceneNpc(this, this.descriptor, spec));

    this.keys = createFarmKeys(this);
    const west = resolvePortal(this.descriptor.portals[0], this.descriptor);
    this.player = new SideScenePlayer(this, this.descriptor, west.x + 120, this.keys);

    this.keys?.interact.forEach((key) => key.on('down', () => this.tryInteract()));

    if (DEBUG_SIDE_SCENE) drawDebugOverlay(this, this.descriptor);

    // zustand v5's vanilla `subscribe` takes a single listener receiving (state,
    // previousState) — not a selector. Compare the field yourself; see `gameManager.ts`.
    this.unsubscribeFarmUi = useFarmStore.subscribe((state, prevState) => {
      if (state.talkingToNpcId !== prevState.talkingToNpcId) {
        this.applyTalkCamera(state.talkingToNpcId);
      }
    });

    // No `startFollow` and no camera bounds: the scene drives the camera itself in
    // `update()` so every parallax calculation reads the same locally-computed `scrollX` in
    // the same tick, rather than the one-frame-stale value Phaser's own camera render pass
    // assigns — and so the framing is clamped by `resolveSideSceneCamera`, which a zoomed-in
    // talk needs to do differently from free roam.
    this.updateCamera();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);

    EventBus.emit('current-scene-ready', this);
  }

  update(_time: number, delta: number): void {
    const talking = useFarmStore.getState().talkingToNpcId;
    this.player?.update(delta, !talking);
    this.updateNearbyNpc(talking);
    this.updateCamera();
    this.sceneLayers?.update(this.scrollX);
  }

  /** The store no-ops when the value is unchanged, so this is safe every frame. */
  private updateNearbyNpc(talking: string | null): void {
    if (talking || !this.player) return;
    let closestId: string | null = null;
    let closestDist = INTERACT_RADIUS;

    this.npcs.forEach((npc) => {
      const d = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, npc.x, npc.y);
      if (d >= closestDist) return;
      closestDist = d;
      closestId = npc.characterId;
    });

    useFarmStore.getState().setNearbyNpc(closestId);
  }

  /** Space / E / Enter opens the nearest animal's conversation. */
  private tryInteract(): void {
    const { nearbyNpcId, talkingToNpcId, openDialogue } = useFarmStore.getState();
    if (talkingToNpcId || !nearbyNpcId) return;
    openDialogue(nearbyNpcId);
  }

  /**
   * Turn the two of them to face each other and ease the camera between them, or ease back
   * out to free roam when the talk closes. The framing itself is a `talkFrame` the blend
   * runs toward — `updateCamera` stays the one place the camera is ever written.
   */
  private applyTalkCamera(talkingToNpcId: string | null): void {
    const npc = talkingToNpcId
      ? (this.npcs.find((actor) => actor.characterId === talkingToNpcId) ?? null)
      : null;

    if (npc && this.player) {
      this.player.faceTowards(npc.x);
      npc.faceTowards(this.player.x);
      // Read the boxes *after* turning them: a flip moves where the art sits.
      this.talkFrame = this.frameAround(this.player, npc);
      this.blendTalkCamera(1);
      return;
    }
    // Keep `talkFrame` until the blend is home: it is the other end of the interpolation.
    this.blendTalkCamera(0, () => {
      this.talkFrame = null;
    });
  }

  /** Both animals in the middle of the game hole, as close in as they both still fit. */
  private frameAround(...actors: readonly SideSceneActor[]): SideSceneCameraFrame {
    const boxes = actors.map((actor) => actor.visualBounds);
    const left = Math.min(...boxes.map((b) => b.left));
    const right = Math.max(...boxes.map((b) => b.right));
    const top = Math.min(...boxes.map((b) => b.top));
    const bottom = Math.max(...boxes.map((b) => b.bottom));

    const zoom = Phaser.Math.Clamp(
      Math.min(
        (STAGE_DESIGN_WIDTH * TALK_FILL) / Math.max(1, right - left),
        (TRIAL_STAGE_HOLE.height * TALK_FILL) / Math.max(1, bottom - top),
      ),
      1,
      TALK_MAX_ZOOM,
    );

    return {
      focusX: (left + right) / 2,
      focusY: (top + bottom) / 2,
      zoom,
      focusScreenY: TRIAL_STAGE_HOLE.y + TRIAL_STAGE_HOLE.height / 2,
    };
  }

  private blendTalkCamera(to: number, onComplete?: () => void): void {
    this.talkTween?.remove();
    this.talkTween = null;

    if (prefersReducedMotion()) {
      this.talkCamera.blend = to;
      onComplete?.();
      return;
    }

    this.talkTween = this.tweens.add({
      targets: this.talkCamera,
      blend: to,
      // Proportional to the distance still to travel, so closing a talk that opened a
      // moment ago does not crawl back over the full 1.5s. The easing lives in
      // `updateCamera`, which reads this one linear value through two curves.
      duration: TALK_CAMERA_MS * Math.abs(to - this.talkCamera.blend),
      ease: 'Linear',
      onComplete,
    });
  }

  private get world(): SideSceneWorld {
    return {
      width: this.descriptor.width,
      groundBottom: this.groundBottom,
      viewportWidth: STAGE_DESIGN_WIDTH,
      viewportHeight: STAGE_DESIGN_HEIGHT,
    };
  }

  /** Free roam: the player centred on an unzoomed, full-stage camera. */
  private roamFrame(): SideSceneCameraFrame {
    return {
      focusX: this.player?.x ?? this.descriptor.width / 2,
      focusY: STAGE_DESIGN_HEIGHT / 2,
      zoom: 1,
      focusScreenY: STAGE_DESIGN_HEIGHT / 2,
    };
  }

  private updateCamera(): void {
    const roam = this.roamFrame();
    const blend = this.talkCamera.blend;
    const frame = this.talkFrame
      ? blendCameraFrames(roam, this.talkFrame, {
          move: AIM_EASE(blend),
          push: PUSH_EASE(blend),
        })
      : roam;
    const camera = resolveSideSceneCamera(frame, this.world);

    this.cameras.main.setZoom(camera.zoom).setScroll(camera.scrollX, camera.scrollY);
    this.scrollX = camera.scrollX;
  }

  private teardown(): void {
    this.unsubscribeFarmUi?.();
    this.unsubscribeFarmUi = null;
    this.talkTween?.remove();
    this.talkTween = null;
    this.player?.destroy();
    this.player = null;
    this.npcs.forEach((npc) => npc.destroy());
    this.npcs = [];
    useFarmStore.getState().resetFarmUi();
  }
}
