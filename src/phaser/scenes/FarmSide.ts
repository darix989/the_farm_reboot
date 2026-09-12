import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH, TRIAL_STAGE_HOLE } from '../../utils/constants';
import { SIDE_SCENES } from '../../data/sideScenes';
import type { SidePortalLink, SideSceneId } from '../../types/sideScene';
import { queueSideSceneAssets } from '../sideScene/sideSceneAssets';
import { buildSideSceneLayers, type SideSceneLayers } from '../sideScene/sideSceneLayers';
import { placeFences, placeProps } from '../sideScene/sideSceneProps';
import { drawDebugOverlay } from '../sideScene/sideSceneDebug';
import { clampToRoad, resolveEntrySpawn, resolvePortal } from '../sideScene/sideSceneRoad';
import {
  PORTAL_INTERACT_RADIUS,
  resolveFocus,
  type FocusPoint,
} from '../sideScene/sideSceneInteractions';
import { beginSideSceneTravel } from '../sideScene/sideSceneTravel';
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
import { useGameStore } from '../../store/gameStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { prefersReducedMotion } from '../../utils/reducedMotion';

/**
 * The lateral farm world: one scene class restarted onto whichever `SIDE_SCENES`
 * descriptor `activeSideSceneId` names. Level 1 lives here — talks walk the same
 * encounter ladder as the top-down farm, Trial Leave restores Rue's last pose, and
 * neighbouring scenes are reached through walk-up portals with a fade-through-black
 * transition. See `docs/farm_side_scenes.md`.
 */
const DEBUG_SIDE_SCENE = false;

/** How near Rue has to stand before an animal is offered for a talk, in world px. */
const INTERACT_RADIUS = 400;

/**
 * How long after `create()` an interact key press is ignored. OS key auto-repeat fires a
 * fresh `down` transition on the new scene's brand-new `Key` objects if the player is
 * still holding the interact key when the restart lands — without this window that
 * bounces them straight back through the door they just walked through.
 */
const INTERACT_ARM_DELAY_MS = 250;

/** Fade duration either direction of a scene-to-scene hop. */
const FADE_MS = 400;
/** Fade-in duration on arrival — registered in `create()`, since a camera fade does not
 *  survive a restart (`CameraManager.shutdown` destroys every camera `start` builds). */
const FADE_IN_MS = 400;

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
  // Assigned in `init()`, not here: Phaser does not re-construct a scene on `restart` —
  // it calls `sys.shutdown()` then `sys.start(data)` -> `init(data)` -> `preload()` ->
  // `create()` on the *same* instance — so a field initializer would stay pinned to
  // whichever level the scene first booted into, forever. See `docs/farm_side_scenes.md`.
  private descriptor = SIDE_SCENES[useGameStore.getState().activeSideSceneId];
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
  private unsubscribeTutorial: (() => void) | null = null;

  /** Portal id the player just arrived through, or undefined for a menu/default spawn. */
  private entryPortalId?: string;
  /**
   * The entry portal, ignored by `updateFocus` until the player has stepped farther from
   * it than `PORTAL_INTERACT_RADIUS`. An edge spawn sits `EDGE_SPAWN_INSET` (120px) inside
   * a 220px portal radius, and a back/front spawn lands only a little downstage of it —
   * either way the player would otherwise land already standing in the door they just
   * walked through, and re-trigger it.
   */
  private disarmedPortalId: string | null = null;
  /** A hop is in flight (fade out, restart, fade in). Freezes input and movement focus. */
  private travelling = false;
  /** `this.time.now` before which `tryInteract` ignores every key press. */
  private interactArmedAt = 0;

  constructor() {
    super('FarmSide');
  }

  /**
   * Runs on every `create()`, restart included — the one place instance state may be
   * assigned, since class field initializers run once at game boot and never again.
   */
  init(data?: { sceneId?: SideSceneId; entryPortalId?: string }): void {
    // `data.sceneId` is not read here on purpose: `activeSideSceneId` is the single
    // source of truth for which descriptor a `create()` loads (see `gameStore.ts`), and
    // every caller — `MainMenuUI`'s Enter the Farm, `beginSideSceneTravel` — sets it
    // before starting/restarting this scene. `sceneId` is carried in the start data
    // anyway, for whoever inspects `scene.settings.data` expecting it to drive the scene.
    this.descriptor = SIDE_SCENES[useGameStore.getState().activeSideSceneId];
    this.sceneLayers = null;
    this.groundBottom = STAGE_DESIGN_HEIGHT;
    this.keys = null;
    this.player = null;
    this.npcs = [];
    this.scrollX = 0;
    // The object is created once (it is a tween target); a stale blend left over from the
    // previous level would mis-time this level's first talk push.
    this.talkCamera.blend = 0;
    // Survives a restart otherwise, in the *old* level's world coordinates.
    this.talkFrame = null;
    this.travelling = false;
    this.entryPortalId = data?.entryPortalId;
    this.disarmedPortalId = data?.entryPortalId ?? null;
    this.interactArmedAt = 0;
  }

  preload() {
    const kitQueued = queueSideSceneAssets(this, this.descriptor);
    const animalsQueued = queueAnimalPackForScene(this);
    if (kitQueued || animalsQueued) reportSceneLoadProgress(this);
  }

  create() {
    ensureAnimalPackForScene(this);
    useFarmStore.getState().resetFarmUi();

    // Registered before anything else is built, so the first pixel this level ever shows
    // is black: a camera fade does not survive a restart (`CameraManager.shutdown`
    // destroys every camera and `start` builds a fresh one), so this is mandatory, not
    // optional, on every `create()`. Reduced motion skips it — a cut, not a fade.
    if (!prefersReducedMotion()) {
      this.cameras.main.fadeIn(FADE_IN_MS, 0, 0, 0);
    }

    const { layers, groundBottom } = buildSideSceneLayers(this, this.descriptor);
    this.sceneLayers = layers;
    this.groundBottom = groundBottom;

    placeFences(this, this.descriptor.fences);
    placeProps(this, this.descriptor.props, this.descriptor.scale);

    this.npcs = this.descriptor.npcs.map((spec) => new SideSceneNpc(this, this.descriptor, spec));

    this.keys = createFarmKeys(this);
    const spawn = this.resolveSpawn();
    this.player = new SideScenePlayer(this, this.descriptor, spawn, this.keys);

    this.interactArmedAt = this.time.now + INTERACT_ARM_DELAY_MS;
    this.keys?.interact.forEach((key) => key.on('down', () => this.tryInteract()));

    if (DEBUG_SIDE_SCENE) drawDebugOverlay(this, this.descriptor);

    // zustand v5's vanilla `subscribe` takes a single listener receiving (state,
    // previousState) — not a selector. Compare the field yourself; see `gameManager.ts`.
    this.unsubscribeFarmUi = useFarmStore.subscribe((state, prevState) => {
      if (state.talkingToNpcId !== prevState.talkingToNpcId) {
        this.applyTalkCamera(state.talkingToNpcId);
      }
    });

    this.unsubscribeTutorial = useTutorialStore.subscribe((state, prevState) => {
      if (state.isOpen !== prevState.isOpen) {
        this.applyTutorialInputLock(state.isOpen);
      }
    });
    this.applyTutorialInputLock(useTutorialStore.getState().isOpen);

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
    const tutorialOpen = useTutorialStore.getState().isOpen;
    this.player?.update(delta, !(talking || this.travelling || tutorialOpen));
    this.updateFocus(talking);
    this.updateCamera();
    this.sceneLayers?.update(this.scrollX);
  }

  /** The store no-ops when a value is unchanged, so this is safe every frame. Skipped
   *  entirely while a talk is open or a hop is in flight — neither leaves the player free
   *  to walk up to anything new. */
  private updateFocus(talking: string | null): void {
    const player = this.player;
    if (talking || this.travelling || !player) return;

    if (this.disarmedPortalId) {
      const disarmed = this.descriptor.portals.find((p) => p.id === this.disarmedPortalId);
      const { x, y } = disarmed
        ? resolvePortal(disarmed, this.descriptor)
        : { x: player.x, y: player.y };
      if (!disarmed || Math.hypot(player.x - x, player.y - y) > PORTAL_INTERACT_RADIUS) {
        this.disarmedPortalId = null;
      }
    }

    const npcs: FocusPoint[] = this.npcs.map((npc) => ({
      id: npc.characterId,
      x: npc.x,
      y: npc.y,
    }));
    const portals: FocusPoint[] = this.descriptor.portals
      .filter((portal) => portal.to && portal.id !== this.disarmedPortalId)
      .map((portal) => ({ id: portal.id, ...resolvePortal(portal, this.descriptor) }));

    const focus = resolveFocus(player, npcs, portals, {
      npc: INTERACT_RADIUS,
      portal: PORTAL_INTERACT_RADIUS,
    });

    useFarmStore.getState().setNearbyNpc(focus?.kind === 'npc' ? focus.id : null);
    useFarmStore.getState().setNearbyPortal(focus?.kind === 'portal' ? focus.id : null);
  }

  /** Space / E / Enter opens the nearest animal's conversation, or starts travel through
   *  the nearest portal. Guarded against a hop in flight and the OS auto-repeat window
   *  right after a restart — see `INTERACT_ARM_DELAY_MS`. */
  private tryInteract(): void {
    if (this.travelling || this.time.now < this.interactArmedAt) return;
    if (useTutorialStore.getState().isOpen) return;

    const { nearbyNpcId, nearbyPortalId, talkingToNpcId, pendingFollowUp, openDialogue } =
      useFarmStore.getState();
    if (talkingToNpcId || pendingFollowUp) return;

    if (nearbyNpcId) {
      openDialogue(nearbyNpcId);
      return;
    }

    if (nearbyPortalId) this.travelThroughPortal(nearbyPortalId);
  }

  /**
   * Starts travel through the named portal, if it exists and leads somewhere. Public so
   * `FarmSideUI`'s portal-prompt button can trigger the same hop the interact key does —
   * same contract `MainMenu`/`BoilerPlateUI` already use to reach into a live scene via
   * `GameManager.getCurrentScene()`.
   */
  travelThroughPortal(portalId: string): void {
    if (this.travelling) return;
    const portal = this.descriptor.portals.find((candidate) => candidate.id === portalId);
    if (portal?.to) this.startTravel(portal.to);
  }

  /**
   * Fades to black, then hands off to `beginSideSceneTravel` — which restarts this same
   * scene instance onto `link`'s target descriptor. `prefersReducedMotion` skips straight
   * to the hand-off. If the hop is refused (the scene already shut down, another load in
   * flight, or a malformed link), fades back in rather than stranding the player on black.
   */
  private startTravel(link: SidePortalLink): void {
    this.travelling = true;
    useFarmStore.getState().setTraveling(true);

    const commit = () => {
      if (beginSideSceneTravel(this, link)) return;
      this.travelling = false;
      useFarmStore.getState().setTraveling(false);
      if (!prefersReducedMotion()) this.cameras.main.fadeIn(FADE_IN_MS, 0, 0, 0);
    };

    if (prefersReducedMotion()) {
      commit();
      return;
    }

    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, commit);
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

  /**
   * Portal hops spawn at the arrival door. Trial Leave and a later Enter the Farm restore
   * the last pose on this scene instead, so a Hetty encounter does not drop Rue at the
   * west end of the main road.
   */
  private resolveSpawn() {
    if (this.entryPortalId) return resolveEntrySpawn(this.descriptor, this.entryPortalId);
    const resume = useGameStore.getState().sideSceneResume;
    if (resume && resume.sceneId === this.descriptor.id) {
      return {
        x: Phaser.Math.Clamp(resume.x, 0, this.descriptor.width),
        y: clampToRoad(resume.y, this.descriptor.road),
        facing: resume.facing,
      };
    }
    return resolveEntrySpawn(this.descriptor);
  }

  /**
   * While a farm overlay tutorial is up, Phaser must not walk, talk, or travel. The React
   * overlay's root is `pointer-events: none`, so those events would otherwise fall through
   * to the canvas.
   */
  private applyTutorialInputLock(tutorialOpen: boolean): void {
    this.input.enabled = !tutorialOpen;
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
    this.unsubscribeTutorial?.();
    this.unsubscribeTutorial = null;
    this.talkTween?.remove();
    this.talkTween = null;
    this.talkFrame = null;
    this.talkCamera.blend = 0;
    if (this.player) {
      useGameStore.getState().setSideSceneResume({
        sceneId: this.descriptor.id,
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing,
      });
    }
    this.player?.destroy();
    this.player = null;
    this.npcs.forEach((npc) => npc.destroy());
    this.npcs = [];
    useFarmStore.getState().resetFarmUi();
  }
}
