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
   */
  static switchScene(sceneKey: string): void {
    const game = this.getGame();
    if (!game) {
      console.error('Game instance not available');
      return;
    }
    if (game.scene.isActive(sceneKey)) return;

    const current = this.getCurrentScene();
    if (current) {
      current.scene.start(sceneKey);
      return;
    }
    // No scene has reported ready yet (e.g. during boot) — nothing to stop.
    game.scene.start(sceneKey);
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
   * Execute a callback when the game is ready
   */
  static whenReady(callback: (game: Phaser.Game) => void): void {
    const game = this.getGame();
    if (game && this.isGameReady()) {
      callback(game);
    } else {
      // Wait for game to be ready
      const unsubscribe = useGameStore.subscribe(
        (state) => state.isGameReady,
        (isReady) => {
          if (isReady) {
            const game = this.getGame();
            if (game) {
              callback(game);
              unsubscribe();
            }
          }
        },
      );
    }
  }

  /**
   * Execute a callback when a specific scene is ready
   */
  static whenSceneReady(sceneKey: string, callback: (scene: Phaser.Scene) => void): void {
    const scene = this.getScene(sceneKey);
    if (scene) {
      callback(scene);
    } else {
      // Wait for scene to be ready
      const unsubscribe = useGameStore.subscribe(
        (state) => state.currentScene,
        (currentSceneKey) => {
          if (currentSceneKey === sceneKey) {
            const scene = this.getCurrentScene();
            if (scene) {
              callback(scene);
              unsubscribe();
            }
          }
        },
      );
    }
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
