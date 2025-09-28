# Phaser Game Object Integration with Zustand

This document describes the comprehensive strategy for making the Phaser game object available throughout the entire React application using Zustand for state management.

## Overview

The integration provides a centralized way to access and manage the Phaser game instance from any React component in the application. This eliminates the need to pass refs down through component trees and provides a clean, reactive interface for game state management.

## Architecture

### 1. Enhanced Game Store (`src/store/gameStore.ts`)

The Zustand store has been extended to include:
- **Phaser Game Instance**: Direct reference to the `Phaser.Game` object
- **Current Scene Instance**: Reference to the active `Phaser.Scene`
- **Game Ready State**: Boolean indicating if the game is fully initialized
- **Reactive State Management**: All game state updates are automatically propagated to React components

```typescript
interface GameState {
  // Phaser instances
  game: Phaser.Game | null;
  currentSceneInstance: Phaser.Scene | null;
  isGameReady: boolean;
  
  // Game state
  player: { level: number; experience: number; position: { x: number; y: number } };
  currentScene: string;
  isPaused: boolean;
  spritePositions: Record<string, { x: number; y: number }>;
}
```

### 2. Game Manager Utility (`src/utils/gameManager.ts`)

A centralized utility class that provides:
- **Static Methods**: Easy access to game operations from anywhere in the app
- **Safety Checks**: Ensures game is ready before executing operations
- **Scene Management**: Switch, pause, resume scenes
- **Async Operations**: Wait for game/scene readiness with callbacks

```typescript
// Examples
GameManager.getGame()           // Get game instance
GameManager.getCurrentScene()   // Get current scene
GameManager.switchScene('Game') // Switch to a scene
GameManager.pauseGame()         // Pause current scene
GameManager.whenReady(callback) // Execute when game is ready
```

### 3. Custom React Hooks (`src/react/hooks/useGame.ts`)

Provides React-friendly interfaces:

#### `useGame()`
Access to the main game instance and operations:
```typescript
const { game, isReady, switchScene, pauseGame, resumeGame } = useGame();
```

#### `useCurrentScene()`
Access to current scene information:
```typescript
const { sceneKey, scene, getCurrentScene, getScene } = useCurrentScene();
```

#### `useGameState()`
Reactive access to all game state:
```typescript
const { player, currentScene, isPaused, updatePlayerPosition, addExperience } = useGameState();
```

#### `useGameReady(callback)`
Execute code when game is ready:
```typescript
useGameReady((game) => {
  // Game is ready, safe to use
  console.log('Game initialized:', game);
});
```

#### `useSceneReady(sceneKey, callback)`
Execute code when a specific scene is ready:
```typescript
useSceneReady('Game', (scene) => {
  // Game scene is ready
  scene.add.text(100, 100, 'Hello from React!');
});
```

#### `useGameOperations()`
Safe game operations with ready state checks:
```typescript
const { isReady, switchScene, pauseGame, resumeGame } = useGameOperations();
```

### 4. Simplified PhaserGame Component (`src/phaser/PhaserGame.tsx`)

The component has been simplified and now:
- **Automatically updates Zustand store** when game is created/destroyed
- **Emits EventBus events** for game lifecycle
- **No longer requires props or refs** - all functionality is handled through Zustand
- **Clean, minimal API** - just renders the game container

### 5. EventBus Integration

Enhanced EventBus listeners automatically update the store:
- `game-ready`: When game instance is created
- `current-scene-ready`: When a scene becomes active
- `game-destroyed`: When game is destroyed

## Usage Examples

### Basic Game Access in Any Component

```typescript
import { useGame, useCurrentScene } from '../react/hooks/useGame';

const MyComponent = () => {
  const { game, isReady } = useGame();
  const { sceneKey, scene } = useCurrentScene();
  
  if (!isReady) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Current Scene: {sceneKey}</p>
      <button onClick={() => scene?.scene.restart()}>
        Restart Scene
      </button>
    </div>
  );
};
```

### Direct Game Operations

```typescript
import { GameManager } from '../utils/gameManager';

const GameControls = () => {
  const handleSwitchToGame = () => {
    GameManager.switchScene('Game');
  };
  
  const handlePause = () => {
    GameManager.pauseGame();
  };
  
  const handleDirectAccess = () => {
    const game = GameManager.getGame();
    const scene = GameManager.getCurrentScene();
    
    if (game && scene) {
      // Direct Phaser API access
      scene.add.text(100, 100, 'Hello from React!');
    }
  };
  
  return (
    <div>
      <button onClick={handleSwitchToGame}>Start Game</button>
      <button onClick={handlePause}>Pause</button>
      <button onClick={handleDirectAccess}>Add Text</button>
    </div>
  );
};
```

### Reactive Game State

```typescript
import { useGameState } from '../react/hooks/useGame';

const PlayerStats = () => {
  const { player, updatePlayerPosition, addExperience } = useGameState();
  
  return (
    <div>
      <p>Level: {player.level}</p>
      <p>Experience: {player.experience}</p>
      <p>Position: {player.position.x}, {player.position.y}</p>
      
      <button onClick={() => addExperience(10)}>
        Add Experience
      </button>
      <button onClick={() => updatePlayerPosition(100, 200)}>
        Update Position
      </button>
    </div>
  );
};
```

### Waiting for Game Readiness

```typescript
import { useGameReady, useSceneReady } from '../react/hooks/useGame';

const GameInitializer = () => {
  useGameReady((game) => {
    console.log('Game is ready!', game);
    // Perform game initialization
  });
  
  useSceneReady('Game', (scene) => {
    console.log('Game scene is ready!', scene);
    // Setup scene-specific elements
    scene.add.text(10, 10, 'Game Started!');
  });
  
  return <div>Initializing game...</div>;
};
```

### From Phaser Scenes (Access React State)

```typescript
// In any Phaser scene
import { getGameState, getGameInstance } from '../store/gameStore';

export class GameScene extends Phaser.Scene {
  create() {
    // Access React state from Phaser
    const state = getGameState();
    console.log('Player level:', state.player.level);
    
    // Update React state from Phaser
    state.updatePlayerPosition(this.player.x, this.player.y);
    state.addExperience(5);
  }
}
```

## Migration Guide

### From Ref-based Access and Props

**Before:**
```typescript
const phaserRef = useRef<IRefPhaserGame>(null);

const onSceneReady = (scene: Phaser.Scene) => {
  console.log('Scene ready:', scene.scene.key);
};

const handleClick = () => {
  if (phaserRef.current?.game) {
    // Access game through ref
    phaserRef.current.game.scene.start('Game');
  }
};

return <PhaserGame ref={phaserRef} currentActiveScene={onSceneReady} />;
```

**After:**
```typescript
const { switchScene } = useGameOperations();
const { sceneKey } = useCurrentScene();

const handleClick = () => {
  switchScene('Game'); // Automatically handles safety checks
};

// Scene changes are automatically reactive
useEffect(() => {
  console.log('Scene changed to:', sceneKey);
}, [sceneKey]);

return <PhaserGame />; // No props or refs needed
```

### From EventBus Communication

**Before:**
```typescript
useEffect(() => {
  EventBus.on('some-event', handleEvent);
  return () => EventBus.off('some-event', handleEvent);
}, []);
```

**After:**
```typescript
const { currentScene } = useGameState(); // Reactive updates

useEffect(() => {
  // React automatically to scene changes
  console.log('Scene changed to:', currentScene);
}, [currentScene]);
```

## Benefits

1. **Global Access**: Game object available from any component without prop drilling
2. **Type Safety**: Full TypeScript support with proper typing
3. **Reactive Updates**: Automatic re-renders when game state changes
4. **Safety Checks**: Built-in checks to ensure game is ready before operations
5. **Backward Compatibility**: Existing ref-based code continues to work
6. **Clean API**: Intuitive hooks and utilities for common operations
7. **Performance**: Efficient state updates with Zustand's optimized subscriptions
8. **Developer Experience**: Easy debugging and state inspection

## Best Practices

1. **Use hooks in React components** for reactive state access
2. **Use GameManager for imperative operations** from event handlers
3. **Use useGameReady/useSceneReady** for initialization code
4. **Use useGameOperations** for safe game operations with built-in checks
5. **Access store directly from Phaser scenes** using helper functions
6. **Prefer reactive state over EventBus** for component updates

## Example Component

See `src/react/GameControls.tsx` for a complete example demonstrating all features of the integration.

This integration provides a robust, scalable solution for managing Phaser game state in React applications while maintaining clean separation of concerns and excellent developer experience.
