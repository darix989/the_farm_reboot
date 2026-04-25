import { create } from 'zustand';
import { EventBus } from '../phaser/EventBus';

/** Keys map to debate JSON files under `src/data/debates/`. */
export type DebateScenarioKey =
  | '000_tutorial_the_blue_barn'
  | 'sample-debate'
  | '001_monty_vs_penny'
  | '002_bella_vs_woolsey';

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
  isPaused: boolean;
  isGameReady: boolean;

  // UI state
  spritePositions: Record<string, { x: number; y: number }>;
}

// Store with actions
interface GameStore extends GameState {
  // Phaser management actions
  setGame: (game: Phaser.Game | null) => void;
  setCurrentSceneInstance: (scene: Phaser.Scene | null) => void;
  setGameReady: (ready: boolean) => void;

  // Game state actions
  setCurrentScene: (scene: string) => void;
  setActiveDebate: (id: DebateScenarioKey) => void;
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
  isGameReady: false,
  player: {
    level: 1,
    experience: 0,
    position: { x: 0, y: 0 },
  },
  currentScene: 'MainMenu',
  activeDebateId: '000_tutorial_the_blue_barn',
  isPaused: false,
  spritePositions: {},

  // Phaser management actions
  setGame: (game) => set({ game, isGameReady: !!game }),
  setCurrentSceneInstance: (scene) => set({ currentSceneInstance: scene }),
  setGameReady: (ready) => set({ isGameReady: ready }),

  // Game state actions
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setActiveDebate: (id) => set({ activeDebateId: id }),

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

// Enhanced EventBus integration - listen to Phaser events and update store
EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
  const store = useGameStore.getState();
  store.setCurrentScene(scene.scene.key);
  store.setCurrentSceneInstance(scene);
});

EventBus.on('game-ready', (game: Phaser.Game) => {
  useGameStore.getState().setGame(game);
});

EventBus.on('game-destroyed', () => {
  const store = useGameStore.getState();
  store.setGame(null);
  store.setCurrentSceneInstance(null);
  store.setGameReady(false);
});

// Helper to get store state from Phaser scenes
export const getGameState = () => useGameStore.getState();

// Helper to get game instance from anywhere in the app
export const getGameInstance = () => useGameStore.getState().getGame();

// Helper to get current scene from anywhere in the app
export const getCurrentSceneInstance = () => useGameStore.getState().getCurrentScene();
