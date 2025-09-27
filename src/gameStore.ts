import { create } from 'zustand';
import { EventBus } from './game/EventBus';

// Simple game state interface
interface GameState {
  // Player data
  player: {
    level: number;
    experience: number;
    position: { x: number; y: number };
  };
  
  // Game state
  currentScene: string;
  isPaused: boolean;
  
  // UI state
  spritePositions: Record<string, { x: number; y: number }>;
}

// Store with actions
interface GameStore extends GameState {
  // Actions
  setCurrentScene: (scene: string) => void;
  updatePlayerPosition: (x: number, y: number) => void;
  updateSpritePosition: (id: string, x: number, y: number) => void;
  setPaused: (paused: boolean) => void;
  addExperience: (exp: number) => void;
}

// Create the store
export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  player: {
    level: 1,
    experience: 0,
    position: { x: 0, y: 0 }
  },
  currentScene: 'MainMenu',
  isPaused: false,
  spritePositions: {},

  // Actions
  setCurrentScene: (scene) => set({ currentScene: scene }),
  
  updatePlayerPosition: (x, y) => set((state) => ({
    player: { ...state.player, position: { x, y } }
  })),
  
  updateSpritePosition: (id, x, y) => set((state) => ({
    spritePositions: { ...state.spritePositions, [id]: { x, y } }
  })),
  
  setPaused: (paused) => set({ isPaused: paused }),
  
  addExperience: (exp) => set((state) => ({
    player: { ...state.player, experience: state.player.experience + exp }
  }))
}));

// Simple EventBus integration - listen to Phaser events and update store
EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
  useGameStore.getState().setCurrentScene(scene.scene.key);
});

// Helper to get store state from Phaser scenes
export const getGameState = () => useGameStore.getState();
