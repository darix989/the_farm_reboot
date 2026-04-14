import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameManager } from '../../utils/gameManager';

/**
 * Hook to get the Phaser game instance
 */
export const useGame = () => {
  const game = useGameStore((state) => state.game);
  const isReady = useGameStore((state) => state.isGameReady);
  
  return {
    game,
    isReady,
    getGame: GameManager.getGame,
    switchScene: GameManager.switchScene,
    pauseGame: GameManager.pauseGame,
    resumeGame: GameManager.resumeGame,
    destroyGame: GameManager.destroyGame
  };
};

/**
 * Hook to get the current scene
 */
export const useCurrentScene = () => {
  const currentScene = useGameStore((state) => state.currentScene);
  const currentSceneInstance = useGameStore((state) => state.currentSceneInstance);
  
  return {
    sceneKey: currentScene,
    scene: currentSceneInstance,
    getCurrentScene: GameManager.getCurrentScene,
    getScene: GameManager.getScene
  };
};

/**
 * Hook to execute code when the game is ready
 */
export const useGameReady = (callback: (game: Phaser.Game) => void, deps: React.DependencyList = []) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    GameManager.whenReady((game) => {
      callbackRef.current(game);
    });
  }, deps);
};

/**
 * Hook to execute code when a specific scene is ready
 */
export const useSceneReady = (
  sceneKey: string, 
  callback: (scene: Phaser.Scene) => void, 
  deps: React.DependencyList = []
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    GameManager.whenSceneReady(sceneKey, (scene) => {
      callbackRef.current(scene);
    });
  }, [sceneKey, ...deps]);
};

/**
 * Hook to get game state with reactive updates
 */
export const useGameState = () => {
  const player = useGameStore((state) => state.player);
  const currentScene = useGameStore((state) => state.currentScene);
  const isPaused = useGameStore((state) => state.isPaused);
  const isGameReady = useGameStore((state) => state.isGameReady);
  const spritePositions = useGameStore((state) => state.spritePositions);
  
  const actions = {
    updatePlayerPosition: useGameStore((state) => state.updatePlayerPosition),
    updateSpritePosition: useGameStore((state) => state.updateSpritePosition),
    setPaused: useGameStore((state) => state.setPaused),
    addExperience: useGameStore((state) => state.addExperience)
  };

  return {
    player,
    currentScene,
    isPaused,
    isGameReady,
    spritePositions,
    ...actions
  };
};

/**
 * Hook for game operations that require the game to be ready
 */
export const useGameOperations = () => {
  const isReady = useGameStore((state) => state.isGameReady);
  
  const safeExecute = (operation: () => void) => {
    if (isReady) {
      operation();
    } else {
      console.warn('Game is not ready yet. Operation skipped.');
    }
  };

  return {
    isReady,
    safeExecute,
    switchScene: (sceneKey: string) => safeExecute(() => GameManager.switchScene(sceneKey)),
    pauseGame: () => safeExecute(() => GameManager.pauseGame()),
    resumeGame: () => safeExecute(() => GameManager.resumeGame()),
    getScene: (sceneKey: string) => isReady ? GameManager.getScene(sceneKey) : null
  };
};
