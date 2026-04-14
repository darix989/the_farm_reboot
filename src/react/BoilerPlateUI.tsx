import { MainMenu } from '../phaser/scenes/MainMenu';
import { useGameStore } from '../store/gameStore';
import { useGame, useCurrentScene, useGameOperations } from './hooks/useGame';
import { GameManager } from '../utils/gameManager';
import './index.css';

function App()
{
    const { isReady } = useGame();
    const { sceneKey: currentScene } = useCurrentScene();
    const { switchScene } = useGameOperations();
    
    // Use Zustand store for state
    const { spritePositions, updateSpritePosition, player } = useGameStore();
    
    // The sprite can only be moved in the MainMenu Scene
    const canMoveSprite = currentScene !== 'MainMenu';
    const spritePosition = spritePositions.logo || { x: 0, y: 0 };

    const changeScene = () => {
        // Use GameManager to get current scene and call changeScene
        const scene = GameManager.getCurrentScene() as MainMenu;
        
        if (scene && scene.changeScene) {
            scene.changeScene();
        } else {
            // Fallback: switch to Game scene if changeScene method not available
            switchScene('Game');
        }
    }

    const moveSprite = () => {
        // Use GameManager to get current scene
        const scene = GameManager.getCurrentScene() as MainMenu;

        if (scene && scene.scene.key === 'MainMenu' && scene.moveLogo) {
            // Get the updated logo position
            scene.moveLogo(({ x, y }) => {
                updateSpritePosition('logo', x, y);
            });
        }
    }

    const addSprite = () => {
        // Use GameManager to get current scene
        const scene = GameManager.getCurrentScene();

        if (scene) {
            // Add more stars
            const x = Phaser.Math.Between(64, scene.scale.width - 64);
            const y = Phaser.Math.Between(64, scene.scale.height - 64);

            //  `add.sprite` is a Phaser GameObjectFactory method and it returns a Sprite Game Object instance
            const star = scene.add.sprite(x, y, 'star');

            //  ... which you can then act upon. Here we create a Phaser Tween to fade the star sprite in and out.
            //  You could, of course, do this from within the Phaser Scene code, but this is just an example
            //  showing that Phaser objects and systems can be acted upon from outside of Phaser itself.
            scene.add.tween({
                targets: star,
                duration: 500 + Math.random() * 1000,
                alpha: 0,
                yoyo: true,
                repeat: -1
            });
        }
    }

    // Show loading state if game is not ready
    if (!isReady) {
        return (
            <div style={{ pointerEvents: 'auto' }}>
                <div className="spritePosition">
                    <div>Game Status: <strong>Loading...</strong></div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ pointerEvents: 'auto' }}>
            <div>
                <button className="button" onClick={changeScene}>Change Scene</button>
            </div>
            <div>
                <button disabled={canMoveSprite} className="button" onClick={moveSprite}>Toggle Movement</button>
            </div>
            <div className="spritePosition">
                <div>Current Scene: <strong>{currentScene}</strong></div>
                <div>Game Status: <strong>Ready</strong></div>
                <div>Player Level: {player.level} | Experience: {player.experience}</div>
                <div>Logo Position: x: {spritePosition.x}, y: {spritePosition.y}</div>
            </div>
            <div>
                <button className="button" onClick={addSprite}>Add New Sprite</button>
            </div>
        </div>
    )
}

export default App
