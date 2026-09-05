import { Scene } from 'phaser';

import { EventBus } from './EventBus';

/**
 * The loading phases the player waits through before anything is interactive, and how
 * much of the progress bar each one owns.
 *
 * Character atlases load later, per scene (`animalPacks.ts`). Boot fetches the backdrop;
 * Preloader fetches the logo and star. The split is even because both remaining payloads
 * are small — the old 5/95 weighting assumed Preloader still owned ~22 MB of animals.
 */
const PHASE_WEIGHTS = {
  Boot: 0.5,
  Preloader: 0.5,
} as const;

/** Scene keys that run before the first playable scene. */
export type BootPhaseKey = keyof typeof PHASE_WEIGHTS;

const PHASE_ORDER = Object.keys(PHASE_WEIGHTS) as BootPhaseKey[];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const weightBefore = (phase: BootPhaseKey) =>
  PHASE_ORDER.slice(0, PHASE_ORDER.indexOf(phase)).reduce(
    (sum, key) => sum + PHASE_WEIGHTS[key],
    0,
  );

/** Overall 0..1 boot progress, given `phase` is `progress` of the way through its own load. */
export const bootProgressFor = (phase: BootPhaseKey, progress: number) =>
  clamp01(weightBefore(phase) + PHASE_WEIGHTS[phase] * clamp01(progress));

/**
 * Mirrors `scene`'s loader onto the `boot-progress` bus event as overall progress.
 *
 * The scene is passed along so the store can ignore progress from a game instance it has
 * already torn down — React StrictMode mounts, destroys and remounts the game in dev, and
 * the first game's loader keeps firing for a while after its `destroy()`.
 *
 * Call from `preload()`: the loader only starts once `preload` returns, so handlers
 * registered here still see the whole run.
 */
export const reportBootProgress = (scene: Scene, phase: BootPhaseKey) => {
  const emit = (progress: number) =>
    EventBus.emit('boot-progress', { scene, progress: bootProgressFor(phase, progress) });

  emit(0);
  scene.load.on('progress', emit);
  scene.load.once('complete', () => emit(1));
};

/**
 * Mirrors a playable scene's lazy animal pack onto `scene-load-progress`.
 *
 * Only call this when `queueAnimalPackForScene` queued files — an empty load would still
 * fire complete at 1, but the overlay should never have gone up.
 *
 * The `progress` listener is removed on complete so a later Farm re-entry that *does*
 * queue files (dev remount, cache miss) does not stack handlers on the same loader.
 */
export const reportSceneLoadProgress = (scene: Scene) => {
  const emit = (progress: number) =>
    EventBus.emit('scene-load-progress', { scene, progress: clamp01(progress) });

  emit(0);
  scene.load.on('progress', emit);
  scene.load.once('complete', () => {
    scene.load.off('progress', emit);
    emit(1);
  });
};
