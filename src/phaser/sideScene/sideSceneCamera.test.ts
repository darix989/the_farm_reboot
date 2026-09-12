import { describe, expect, it } from 'vitest';
import {
  blendCameraFrames,
  resolveSideSceneCamera,
  type ResolvedSideSceneCamera,
  type SideSceneCameraFrame,
  type SideSceneWorld,
} from './sideSceneCamera';

const WORLD: SideSceneWorld = {
  width: 7680,
  groundBottom: 1980,
  viewportWidth: 1920,
  viewportHeight: 1080,
};

const ROAM: SideSceneCameraFrame = { focusX: 3000, focusY: 540, zoom: 1, focusScreenY: 540 };
const TALK: SideSceneCameraFrame = { focusX: 3460, focusY: 890, zoom: 1.8, focusScreenY: 270 };

/** Where `resolve` puts a world point on the stage, per Phaser's camera transform. */
function screenY(y: number, camera: ResolvedSideSceneCamera): number {
  const originY = WORLD.viewportHeight / 2;
  return (y - camera.scrollY - originY) * camera.zoom + originY;
}

describe('resolveSideSceneCamera', () => {
  it('free-roam reproduces the unzoomed, unscrolled framing', () => {
    expect(resolveSideSceneCamera(ROAM, WORLD)).toEqual({ scrollX: 2040, scrollY: 0, zoom: 1 });
  });

  it('puts the talk focus in the middle of the game hole, not the middle of the stage', () => {
    const camera = resolveSideSceneCamera(TALK, WORLD);
    expect(screenY(TALK.focusY, camera)).toBeCloseTo(270);
    expect(camera.scrollX).toBe(TALK.focusX - WORLD.viewportWidth / 2);
  });

  it('never looks past the ends of the road', () => {
    expect(resolveSideSceneCamera({ ...ROAM, focusX: 0 }, WORLD).scrollX).toBe(0);
    expect(resolveSideSceneCamera({ ...ROAM, focusX: WORLD.width }, WORLD).scrollX).toBe(
      WORLD.width - WORLD.viewportWidth,
    );
  });

  it('never looks below the painted ground, however low the talk aims', () => {
    const camera = resolveSideSceneCamera({ ...TALK, focusY: 4000 }, WORLD);
    expect(screenY(WORLD.groundBottom, camera)).toBeLessThanOrEqual(WORLD.viewportHeight);
  });

  it('leaves a talk framing the ground reaches alone', () => {
    expect(resolveSideSceneCamera(TALK, WORLD).scrollY).toBeCloseTo(500);
  });
});

describe('blendCameraFrames', () => {
  it('returns the endpoints when both clocks agree', () => {
    expect(blendCameraFrames(ROAM, TALK, { move: 0, push: 0 })).toEqual(ROAM);
    expect(blendCameraFrames(ROAM, TALK, { move: 1, push: 1 })).toEqual(TALK);
  });

  it('aims and pushes on their own clocks', () => {
    expect(blendCameraFrames(ROAM, TALK, { move: 1, push: 0 })).toEqual({
      focusX: TALK.focusX,
      focusY: TALK.focusY,
      focusScreenY: TALK.focusScreenY,
      zoom: ROAM.zoom,
    });
  });

  it('moves every aimed axis together at the halfway point', () => {
    expect(blendCameraFrames(ROAM, TALK, { move: 0.5, push: 0.5 })).toEqual({
      focusX: 3230,
      focusY: 715,
      focusScreenY: 405,
      zoom: 1.4,
    });
  });
});
