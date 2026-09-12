/**
 * How the lateral farm world frames its camera — free-roam behind the player, and zoomed
 * onto the two animals having a conversation.
 *
 * A frame is authored as "put this world point *here* on the stage, at this zoom", never as
 * a scroll offset, for two reasons. It is the only form the two framings can be blended in
 * (scroll is a derived quantity that depends on the zoom being mid-tween), and a talk's
 * whole job is to move a world point to a particular *place on the stage*: the middle of
 * `TRIAL_STAGE_HOLE`, the band the Dialog and Actions panels do not cover.
 *
 * The camera viewport is deliberately left at full stage height even during a talk — unlike
 * `Farm.applyTalkViewport`, which clips its camera to the hole. Clipping cannot be animated:
 * shrinking the viewport moves Phaser's camera origin, so the picture slides as the rect
 * closes, and on the way *out* the panels unmount before the rect has grown back, leaving a
 * band of empty canvas under a live scene. Aiming instead of clipping costs one thing — the
 * camera now looks below where the layer stack stops — which `sideSceneLayers` answers with
 * a ground fill under the front grass.
 *
 * Pure (no Phaser value import) so `FarmSide` keeps one camera code path with no branch for
 * "is a talk open", and so the clamps are unit tested without booting a scene.
 */

export interface SideSceneCameraFrame {
  /** World x placed at the horizontal centre of the stage. */
  focusX: number;
  /** World y placed at {@link focusScreenY}. */
  focusY: number;
  zoom: number;
  /** Where `focusY` lands, in stage px from the top. Half the stage height is centred. */
  focusScreenY: number;
}

/** How much of a blend each part of the move has done. See {@link blendCameraFrames}. */
export interface SideSceneCameraBlend {
  /** Aim: `focusX`, `focusY`, `focusScreenY`. */
  move: number;
  /** Push: `zoom`. */
  push: number;
}

export interface SideSceneWorld {
  /** Scene width in world px. */
  width: number;
  /** Where the ground stops being painted — the layer stack plus its fill. */
  groundBottom: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ResolvedSideSceneCamera {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Blend of two framings, with the aim and the push on separate clocks.
 *
 * They are separate because the two ends of a talk are a long way apart in *both*: the pair
 * stands near the bottom of the stage in free roam, behind where the Dialog panel will be,
 * and has to travel up into the game hole. Run both on one clock and the animals spend most
 * of the move hidden behind the panels and then pop into frame at the end. Aiming ahead of
 * the zoom (`Cubic.Out` against `Cubic.In` in `FarmSide`) reads as a camera swinging onto
 * the pair and *then* pushing in — and, run backwards, as pulling out and then swinging
 * back.
 */
export function blendCameraFrames(
  from: SideSceneCameraFrame,
  to: SideSceneCameraFrame,
  blend: SideSceneCameraBlend,
): SideSceneCameraFrame {
  return {
    focusX: lerp(from.focusX, to.focusX, blend.move),
    focusY: lerp(from.focusY, to.focusY, blend.move),
    focusScreenY: lerp(from.focusScreenY, to.focusScreenY, blend.move),
    zoom: lerp(from.zoom, to.zoom, blend.push),
  };
}

/** Clamp that survives a viewport wider than the thing it is looking at. */
function clampFocus(focus: number, halfView: number, extent: number): number {
  if (halfView * 2 >= extent) return extent / 2;
  return Math.max(halfView, Math.min(extent - halfView, focus));
}

/**
 * Resolves a frame to the scroll and zoom the camera is actually set to, keeping the view
 * inside the painted world: off the ends of the road, and off the bottom of the ground.
 * Nothing clamps the top — up there is sky, which is pinned to the viewport and so is
 * always right.
 *
 * Phaser's camera origin is the middle of the viewport, so a world point lands at
 * `(y - scrollY - originY) * zoom + originY`; this is that solved for `scrollY`.
 */
export function resolveSideSceneCamera(
  frame: SideSceneCameraFrame,
  world: SideSceneWorld,
): ResolvedSideSceneCamera {
  const zoom = Math.max(0.01, frame.zoom);
  const originY = world.viewportHeight / 2;

  const focusX = clampFocus(frame.focusX, world.viewportWidth / (2 * zoom), world.width);
  const below = (world.viewportHeight - frame.focusScreenY) / zoom;
  const focusY = Math.min(frame.focusY, world.groundBottom - below);

  return {
    scrollX: focusX - world.viewportWidth / 2,
    scrollY: focusY - originY - (frame.focusScreenY - originY) / zoom,
    zoom,
  };
}
