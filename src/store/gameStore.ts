import { create } from 'zustand';
import { EventBus } from '../phaser/EventBus';
import type { DebateScenarioKey } from '../data/levels';

// The key union and the scenario registry live together in `src/data/levels.ts`, so
// adding a scenario is one edit rather than one per consumer.
export type { DebateScenarioKey } from '../data/levels';

/**
 * How far the game is through booting.
 *
 * - `idle` — no Phaser game instance.
 * - `booting` — the instance exists, but `Boot`/`Preloader` are still fetching. **Nothing
 *   in the React overlay may be interactive here**: the loaded scene is not the one
 *   `currentScene` would name, and the ~22 MB of character assets are not in the cache.
 * - `ready` — the first playable scene has run `create()` and reported in.
 *
 * Constructing `new Phaser.Game()` is *not* readiness. It returns in microseconds while
 * the real load runs for seconds; treating it as ready let the player click the menu
 * during `Preloader`, which started a second scene alongside it and left the menu overlay
 * painted over whatever came up.
 */
export type GameBootPhase = 'idle' | 'booting' | 'ready';

// Simple game state interface
interface GameState {
  // Phaser instances
  game: Phaser.Game | null;
  currentSceneInstance: Phaser.Scene | null;

  // Player data
  player: {
    level: number;
    experience: number;
    position: { x: number; y: number };
  };

  // Game state
  currentScene: string;
  /** Which debate JSON to use when `Trial` is shown. */
  activeDebateId: DebateScenarioKey;
  /**
   * Scene to return to when an encounter ends. Set by whoever launched the Trial —
   * the main menu leaves it at `'MainMenu'`, the overworld sets `'Farm'` — so the
   * same finished-encounter button works from both entry points.
   */
  returnSceneKey: string;
  isPaused: boolean;
  bootPhase: GameBootPhase;
  /** `bootPhase === 'ready'`, kept as a field so consumers can select it directly. */
  isGameReady: boolean;
  /** Overall asset-loading progress, 0..1. Drives the React boot screen. */
  loadProgress: number;

  // UI state
  spritePositions: Record<string, { x: number; y: number }>;
}

// Store with actions
interface GameStore extends GameState {
  // Phaser management actions
  setGame: (game: Phaser.Game | null) => void;
  setCurrentSceneInstance: (scene: Phaser.Scene | null) => void;
  setGameReady: (ready: boolean) => void;
  setLoadProgress: (progress: number) => void;

  // Game state actions
  setCurrentScene: (scene: string) => void;
  setActiveDebate: (id: DebateScenarioKey) => void;
  setReturnSceneKey: (sceneKey: string) => void;
  updatePlayerPosition: (x: number, y: number) => void;
  updateSpritePosition: (id: string, x: number, y: number) => void;
  setPaused: (paused: boolean) => void;
  addExperience: (exp: number) => void;

  // Game utility methods
  getGame: () => Phaser.Game | null;
  getCurrentScene: () => Phaser.Scene | null;
  isReady: () => boolean;
}

// Create the store
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  game: null,
  currentSceneInstance: null,
  bootPhase: 'idle',
  isGameReady: false,
  loadProgress: 0,
  player: {
    level: 1,
    experience: 0,
    position: { x: 0, y: 0 },
  },
  // The scene that actually runs first. `Boot` and `Preloader` never emit
  // `current-scene-ready`, so this stays honest until `MainMenu` reports in.
  currentScene: 'Boot',
  activeDebateId: '000_tutorial_the_blue_barn',
  returnSceneKey: 'MainMenu',
  isPaused: false,
  spritePositions: {},

  // Phaser management actions
  setGame: (game) =>
    set(
      game
        ? { game, bootPhase: 'booting', isGameReady: false, loadProgress: 0 }
        : { game: null, bootPhase: 'idle', isGameReady: false, loadProgress: 0 },
    ),
  setCurrentSceneInstance: (scene) => set({ currentSceneInstance: scene }),
  setGameReady: (ready) =>
    set((state) => ({
      isGameReady: ready,
      bootPhase: ready ? 'ready' : state.game ? 'booting' : 'idle',
      loadProgress: ready ? 1 : state.loadProgress,
    })),
  setLoadProgress: (progress) => set({ loadProgress: Math.max(0, Math.min(1, progress)) }),

  // Game state actions
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setActiveDebate: (id) => set({ activeDebateId: id }),
  setReturnSceneKey: (sceneKey) => set({ returnSceneKey: sceneKey }),

  updatePlayerPosition: (x, y) =>
    set((state) => ({
      player: { ...state.player, position: { x, y } },
    })),

  updateSpritePosition: (id, x, y) =>
    set((state) => ({
      spritePositions: { ...state.spritePositions, [id]: { x, y } },
    })),

  setPaused: (paused) => set({ isPaused: paused }),

  addExperience: (exp) =>
    set((state) => ({
      player: { ...state.player, experience: state.player.experience + exp },
    })),

  // Game utility methods
  getGame: () => get().game,
  getCurrentScene: () => get().currentSceneInstance,
  isReady: () => get().isGameReady && !!get().game,
}));

/**
 * Events from a game instance we have already torn down must be ignored. React StrictMode
 * mounts, destroys and remounts the game in dev, and the first instance's loader and
 * scenes keep firing for a while after `destroy()` — without this guard a dead game can
 * mark the live one ready, or rewind its progress bar.
 */
const isLiveGame = (scene: Phaser.Scene | undefined) => {
  const game = useGameStore.getState().game;
  return !!game && !!scene && scene.game === game;
};

// Enhanced EventBus integration - listen to Phaser events and update store
EventBus.on('boot-progress', ({ scene, progress }: { scene: Phaser.Scene; progress: number }) => {
  if (!isLiveGame(scene)) return;
  const store = useGameStore.getState();
  // Boot progress can only move forwards. Each phase reports its own loader, so a late
  // event from an earlier phase would otherwise drag the bar backwards.
  if (store.bootPhase !== 'booting' || progress <= store.loadProgress) return;
  store.setLoadProgress(progress);
});

// The first scene to report in is the first one the player can actually interact with:
// `Boot` and `Preloader` never emit. That makes this the moment the game is ready.
EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
  if (!isLiveGame(scene)) return;
  const store = useGameStore.getState();
  store.setCurrentScene(scene.scene.key);
  store.setCurrentSceneInstance(scene);
  if (!store.isGameReady) store.setGameReady(true);
});

EventBus.on('game-ready', (game: Phaser.Game) => {
  useGameStore.getState().setGame(game);
});

EventBus.on('game-destroyed', () => {
  const store = useGameStore.getState();
  store.setGame(null);
  store.setCurrentSceneInstance(null);
  store.setCurrentScene('Boot');
});

// Helper to get store state from Phaser scenes
export const getGameState = () => useGameStore.getState();

// Helper to get game instance from anywhere in the app
export const getGameInstance = () => useGameStore.getState().getGame();

// Helper to get current scene from anywhere in the app
export const getCurrentSceneInstance = () => useGameStore.getState().getCurrentScene();
