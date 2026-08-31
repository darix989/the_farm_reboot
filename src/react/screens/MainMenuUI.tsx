import React from 'react';
import { useGameStore, type DebateScenarioKey } from '../../store/gameStore';
import { LEGACY_SCENARIOS, LEVEL_1_SCENARIOS, type ScenarioEntry } from '../../data/levels';
import { GameManager } from '../../utils/gameManager';
import styles from './MainMenuUI.module.scss';
import getLabel, { type Labels } from '../../data/labels';

const MainMenuUI: React.FC = () => {
  const { currentScene, setActiveDebate } = useGameStore();

  const startTrial = (debateId: DebateScenarioKey) => {
    setActiveDebate(debateId);
    const scene = GameManager.getCurrentScene();
    if (scene) {
      scene.scene.start('Trial');
    }
  };

  const renderGroup = (headingLabel: Labels, entries: readonly ScenarioEntry[]) => (
    <>
      <h2 className={styles.menuGroupHeading}>{getLabel(headingLabel)}</h2>
      <div className={styles.buttonContainer}>
        {entries.map((entry) => (
          <button
            key={entry.key}
            className={styles.menuButton}
            type="button"
            onClick={() => startTrial(entry.key)}
          >
            {getLabel(entry.titleLabel)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className={styles.mainMenuUi}>
      <div className={styles.menuContainer}>
        <h1 className={styles.menuTitle}>{getLabel('mainMenu')}</h1>
        {renderGroup('level1Heading', LEVEL_1_SCENARIOS)}
        {renderGroup('legacyScenariosHeading', LEGACY_SCENARIOS)}
        <div className={styles.sceneInfo}>
          {getLabel('currentScene')} <strong>{currentScene}</strong>
        </div>
      </div>
    </div>
  );
};

export default MainMenuUI;
