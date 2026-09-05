import { useGameStore, getGameInstance, getCurrentSceneInstance } from '../store/gameStore';

/**
 * Game Manager - Centralized utility for game operations
 * This provides a clean API for interacting with the Phaser game from anywhere in the app
 */
export class GameManager {
  /**
   * Get the current Phaser game instance
   */
  static getGame(): Phaser.Game | null {
    return getGameInstance();
  }

  /**
   * Get the current active scene
   */
  static getCurrentScene(): Phaser.Scene | null {
    return getCurrentSceneInstance();
  }

  /**
   * Check if the game is ready and available
   */
  static isGameReady(): boolean {
    return useGameStore.getState().isReady();
  }

  /**
   * Switch to a different scene, stopping the one currently running.
   *
   * `game.scene.start()` (SceneManager) only *starts* the target — it leaves the
   * previous scene alive, updating and rendering underneath. `scene.scene.start()`
   * (ScenePlugin, called on the running scene) stops the caller first, which is what
   * "switch" should mean: the old scene shuts down, fires its SHUTDOWN handlers, and
   * stops drawing behind the new one.
   *
   * Refuses to switch before the game is ready. During `Boot`/`Preloader` there is no
   * running scene to hand off from, so the only available call would be the SceneManager
   * one — which starts the target *alongside* the still-loading Preloader, against an
   * empty texture cache, and is then trampled when `Preloader.create()` starts `MainMenu`.
   * The React overlay gates on `isGameReady` so this should be unreachable; it is a guard,
   * not a code path.
   */
  static switchScene(sceneKey: string): void {
    const game = this.getGame();
    if (!game) {
      console.error('Game instance not available');
      return;
    }
    if (!this.isGameReady()) {
      console.warn(`Scene switch to "${sceneKey}" ignored: the game is still loading.`);
      return;
    }
    if (game.scene.isActive(sceneKey)) return;

    const current = this.getCurrentScene();
    if (!current) {
      console.warn(`Scene switch to "${sceneKey}" ignored: no running scene to switch from.`);
      return;
    }
    current.scene.start(sceneKey);
  }

  /**
   * Pause the current scene
   */
  static pauseGame(): void {
    const scene = this.getCurrentScene();
    if (scene) {
      scene.scene.pause();
      useGameStore.getState().setPaused(true);
    }
  }

  /**
   * Resume the current scene
   */
  static resumeGame(): void {
    const scene = this.getCurrentScene();
    if (scene) {
      scene.scene.resume();
      useGameStore.getState().setPaused(false);
    }
  }

  /**
   * Get a specific scene by key
   */
  static getScene(sceneKey: string): Phaser.Scene | null {
    const game = this.getGame();
    if (game) {
      return game.scene.getScene(sceneKey);
    }
    return null;
  }

  /**
   * Execute a callback when the game is ready — immediately if it already is.
   *
   * Returns an unsubscribe function so a caller that goes away before the game finishes
   * loading can drop its pending callback.
   */
  static whenReady(callback: (game: Phaser.Game) => void): () => void {
    if (this.isGameReady()) {
      const game = this.getGame();
      if (game) {
        callback(game);
        return () => {};
      }
    }

    // zustand v5's `subscribe` takes a single listener — the two-argument selector form
    // needs the `subscribeWithSelector` middleware, which this store does not use. Compare
    // against the previous state by hand instead.
    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (!state.isGameReady || prev.isGameReady) return;
      const game = state.game;
      if (game) {
        unsubscribe();
        callback(game);
      }
    });
    return unsubscribe;
  }

  /**
   * Execute a callback when a specific scene becomes the active one — immediately if it
   * already is. Returns an unsubscribe function.
   */
  static whenSceneReady(sceneKey: string, callback: (scene: Phaser.Scene) => void): () => void {
    const current = this.getCurrentScene();
    if (current && current.scene.key === sceneKey) {
      callback(current);
      return () => {};
    }

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.currentScene !== sceneKey || prev.currentScene === sceneKey) return;
      const scene = state.currentSceneInstance;
      if (scene) {
        unsubscribe();
        callback(scene);
      }
    });
    return unsubscribe;
  }

  /**
   * Destroy the game instance
   */
  static destroyGame(): void {
    const game = this.getGame();
    if (game) {
      game.destroy(true);
    }
  }
}

// Export convenience functions for direct use
export const {
  getGame,
  getCurrentScene,
  isGameReady,
  switchScene,
  pauseGame,
  resumeGame,
  getScene,
  whenReady,
  whenSceneReady,
  destroyGame,
} = GameManager;
