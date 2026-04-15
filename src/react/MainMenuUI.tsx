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

  return (
    <div className={styles.mainMenuUi}>
      <div className={styles.menuContainer}>
        <h1 className={styles.menuTitle}>Main Menu</h1>
        <div className={styles.buttonContainer}>
          <button className={styles.menuButton} onClick={startTrial}>
            Start Adventure
          </button>
          <button className={styles.menuButton} onClick={startTrial}>
            Quick Play
          </button>
          <button className={styles.menuButton} onClick={startTrial}>
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
