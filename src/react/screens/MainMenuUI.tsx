import React from 'react';
import { useGameStore, type DebateScenarioKey } from '../../store/gameStore';
import { LEGACY_SCENARIOS, LEVEL_1_SCENARIOS, type ScenarioEntry } from '../../data/levels';
import { GameManager } from '../../utils/gameManager';
import { useCodexUiStore } from '../../store/codexUiStore';
import styles from './MainMenuUI.module.scss';
import getLabel, { type Labels } from '../../data/labels';

const MainMenuUI: React.FC = () => {
  const setActiveDebate = useGameStore((s) => s.setActiveDebate);
  const setReturnSceneKey = useGameStore((s) => s.setReturnSceneKey);

  const startTrial = (debateId: DebateScenarioKey) => {
    setActiveDebate(debateId);
    // Launching straight from the menu returns to the menu, not the farm.
    setReturnSceneKey('MainMenu');
    GameManager.switchScene('Trial');
  };

  const enterFarm = () => GameManager.switchScene('Farm');

  const openAnimationGallery = () => GameManager.switchScene('AnimalGallery');

  // Not a scene switch — the Codex is a global overlay, so it opens on top of the menu.
  const openCodex = useCodexUiStore((s) => s.openCodex);

  const renderGroup = (headingLabel: Labels, entries: readonly ScenarioEntry[]) => (
    <section className={styles.menuGroup} aria-labelledby={headingLabel}>
      <h2 id={headingLabel} className={styles.menuGroupHeading}>
        {getLabel(headingLabel)}
      </h2>
      <div className={styles.scenarioList}>
        {entries.map((entry) => (
          <button
            key={entry.key}
            className={styles.scenarioButton}
            type="button"
            onClick={() => startTrial(entry.key)}
          >
            {getLabel(entry.titleLabel)}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className={styles.mainMenuUi}>
      <div className={styles.menuContainer}>
        <header className={styles.menuHeader}>
          <h1 className={styles.menuTitle}>{getLabel('gameTitle')}</h1>
          <p className={styles.menuTagline}>{getLabel('gameTagline')}</p>
        </header>
        <div className={styles.primaryActions}>
          <button className={styles.menuButtonPrimary} type="button" onClick={enterFarm}>
            {getLabel('enterTheFarm')}
          </button>
          <div className={styles.secondaryActions}>
            <button className={styles.menuButton} type="button" onClick={() => openCodex()}>
              {getLabel('codexOpen')}
            </button>
            <button className={styles.menuButton} type="button" onClick={openAnimationGallery}>
              {getLabel('animationGallery')}
            </button>
          </div>
        </div>
        {renderGroup('level1Heading', LEVEL_1_SCENARIOS)}
        {renderGroup('legacyScenariosHeading', LEGACY_SCENARIOS)}
      </div>
    </div>
  );
};

export default MainMenuUI;
