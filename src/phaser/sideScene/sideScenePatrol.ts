/**
 * A back-and-forth walk along a fixed stretch of road: advance toward one end, stop and
 * idle for a beat once you reach it, then turn and walk to the other end. Pure — no
 * Phaser value import — so it is unit-testable under the Vitest `phaser` stub, the same
 * discipline as `sideSceneRoad.ts` and `sideSceneFence.ts`.
 *
 * Deliberately not a general waypoint/AI system: this is the one shape an ambling farm
 * animal needs, authored as a `{ fromX, toX }` span on `SideSceneNpcSpec.patrol`.
 */
import type { SideNpcPatrol } from '../../types/sideScene';

/** World px/s, chosen so the wolf's stride sits at `AnimalAnimator`'s unclamped playback
 *  knee (`speed / PLAYER_SPEED` ≈ 0.54) rather than skating or crawling. */
export const DEFAULT_PATROL_SPEED = 140;
/** How long he stands at each end before turning, in ms. */
export const DEFAULT_PATROL_PAUSE_MS = 1000;

export interface PatrolState {
  x: number;
  dir: 1 | -1;
  /** Counts down while stopped at an endpoint. 0 means travelling. */
  pauseRemainingMs: number;
  /** Whether this tick's state is mid-stride — false while paused. */
  moving: boolean;
}

/** Starting state: standing at `startX` (clamped into `[fromX, toX]` — an authoring
 *  mistake here is caught by `validateSideSceneDescriptor`, but the stepper stays safe on
 *  its own), travelling the way `facing` points, not paused — a patrol always starts
 *  moving, even if `startX` happens to sit at one of its own ends. */
export function initPatrolState(
  patrol: SideNpcPatrol,
  startX: number,
  facing: 'left' | 'right',
): PatrolState {
  return {
    x: Math.min(Math.max(startX, patrol.fromX), Math.max(patrol.fromX, patrol.toX)),
    dir: facing === 'right' ? 1 : -1,
    pauseRemainingMs: 0,
    moving: true,
  };
}

/** Advances `state` by `deltaMs`. A degenerate span (`toX <= fromX`) never moves — the
 *  patrol degrades to standing still rather than spinning in place. */
export function stepPatrol(
  state: PatrolState,
  patrol: SideNpcPatrol,
  deltaMs: number,
): PatrolState {
  const { fromX, toX } = patrol;
  if (toX <= fromX) return { ...state, moving: false };

  if (state.pauseRemainingMs > 0) {
    const remaining = state.pauseRemainingMs - deltaMs;
    if (remaining > 0) return { ...state, pauseRemainingMs: remaining, moving: false };
    // Pause just expired: turn now, standing at whichever end we paused at.
    const dir: 1 | -1 = state.x >= toX ? -1 : 1;
    return { x: state.x, dir, pauseRemainingMs: 0, moving: true };
  }

  const speed = patrol.speed ?? DEFAULT_PATROL_SPEED;
  const nextX = state.x + state.dir * speed * (deltaMs / 1000);

  if (state.dir > 0 && nextX >= toX) {
    return {
      x: toX,
      dir: state.dir,
      pauseRemainingMs: patrol.pauseMs ?? DEFAULT_PATROL_PAUSE_MS,
      moving: false,
    };
  }
  if (state.dir < 0 && nextX <= fromX) {
    return {
      x: fromX,
      dir: state.dir,
      pauseRemainingMs: patrol.pauseMs ?? DEFAULT_PATROL_PAUSE_MS,
      moving: false,
    };
  }
  return { x: nextX, dir: state.dir, pauseRemainingMs: 0, moving: true };
}
