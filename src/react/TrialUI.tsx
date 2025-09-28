import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GameManager } from '../utils/gameManager';
import { Trial } from '../phaser/scenes/Trial';

const TrialUI: React.FC = () => {
    const { currentScene, player } = useGameStore();

    const handleGameOver = () => {
        console.log('Game Over button clicked');
        // Get current scene and call gameOver method
        const scene = GameManager.getCurrentScene() as Trial;
        if (scene && scene.gameOver) {
            scene.gameOver();
        } else {
            // Fallback: directly switch to GameOver scene
            const currentSceneInstance = GameManager.getCurrentScene();
            if (currentSceneInstance) {
                currentSceneInstance.scene.start('GameOver');
            }
        }
    };

    return (
        <div className="trial-ui">
            <div className="trial-container">
                <h2 className="trial-title">Trial in Progress</h2>
                <div className="trial-info">
                    <p>Player Level: {player.level}</p>
                    <p>Experience: {player.experience}</p>
                    <p>Current Scene: <strong>{currentScene}</strong></p>
                </div>
                <div className="trial-actions">
                    <button 
                        className="game-over-button" 
                        onClick={handleGameOver}
                    >
                        Game Over
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrialUI;
