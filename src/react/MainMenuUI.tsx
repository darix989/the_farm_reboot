import React from 'react';
import { useGameStore, type DebateScenarioKey } from '../store/gameStore';
import { GameManager } from '../utils/gameManager';
import styles from './MainMenuUI.module.scss';

const MainMenuUI: React.FC = () => {
  const { currentScene, setActiveDebate } = useGameStore();

  const startTrial = (debateId: DebateScenarioKey) => {
    setActiveDebate(debateId);
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
          <button
            className={styles.menuButton}
            type="button"
            onClick={() => startTrial('sample-debate')}
          >
            Sample debate
          </button>
          <button
            className={styles.menuButton}
            type="button"
            onClick={() => startTrial('001_monty_vs_penny')}
          >
            Monty vs Penny
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
