import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GameManager } from '../utils/gameManager';
import styles from './MainMenuUI.module.scss';

const MainMenuUI: React.FC = () => {
    const { currentScene } = useGameStore();

    const startTrial = () => {
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
        <div className={styles.mainMenuUi}>
            <div className={styles.menuContainer}>
                <h1 className={styles.menuTitle}>Main Menu</h1>
                <div className={styles.buttonContainer}>
                    <button
                        className={styles.menuButton}
                        onClick={handleButton1}
                    >
                        Start Adventure
                    </button>
                    <button
                        className={styles.menuButton}
                        onClick={handleButton2}
                    >
                        Quick Play
                    </button>
                    <button
                        className={styles.menuButton}
                        onClick={handleButton3}
                    >
                        Challenge Mode
                    </button>
                </div>
                <div className={styles.sceneInfo}>
                    Current Scene: <strong>{currentScene}</strong>
                </div>
            </div>
        </div>
    );
};

export default MainMenuUI;
