import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GameManager } from '../utils/gameManager';

const MainMenuUI: React.FC = () => {
    const { currentScene } = useGameStore();

    const startTrial = () => {
        // Get current scene and switch to Trial
        const scene = GameManager.getCurrentScene();
        if (scene) {
            scene.scene.start('Trial');
        }
    };

    const handleButton1 = () => {
        console.log('Button 1 clicked - Starting Trial');
        startTrial();
    };

    const handleButton2 = () => {
        console.log('Button 2 clicked - Starting Trial');
        startTrial();
    };

    const handleButton3 = () => {
        console.log('Button 3 clicked - Starting Trial');
        startTrial();
    };

    return (
        <div className="main-menu-ui">
            <div className="menu-container">
                <h1 className="menu-title">Main Menu</h1>
                <div className="button-container">
                    <button 
                        className="menu-button button-1" 
                        onClick={handleButton1}
                    >
                        Start Adventure
                    </button>
                    <button 
                        className="menu-button button-2" 
                        onClick={handleButton2}
                    >
                        Quick Play
                    </button>
                    <button 
                        className="menu-button button-3" 
                        onClick={handleButton3}
                    >
                        Challenge Mode
                    </button>
                </div>
                <div className="scene-info">
                    Current Scene: <strong>{currentScene}</strong>
                </div>
            </div>
        </div>
    );
};

export default MainMenuUI;
