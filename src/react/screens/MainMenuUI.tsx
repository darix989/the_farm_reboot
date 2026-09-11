import React, { useId, useState } from 'react';
import { useGameStore, type DebateScenarioKey } from '../../store/gameStore';
import { LEGACY_SCENARIOS, LEVEL_1_SCENARIOS, type ScenarioEntry } from '../../data/levels';
import { GameManager } from '../../utils/gameManager';
import { useCodexStore } from '../../store/codexStore';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useProgressStore } from '../../store/progressStore';
import { useWindowKeyDown } from '../hooks/useWindowKeyDown';
import styles from './MainMenuUI.module.scss';
import getLabel, { type Labels } from '../../data/labels';

const MainMenuUI: React.FC = () => {
  const setActiveDebate = useGameStore((s) => s.setActiveDebate);
  const setReturnSceneKey = useGameStore((s) => s.setReturnSceneKey);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const confirmTitleId = useId();
  const confirmBodyId = useId();

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

  const cancelReset = () => setConfirmingReset(false);

  const confirmReset = () => {
    // Persist middleware writes the empty snapshot to `localStorage` on `set`.
    useProgressStore.getState().resetProgress();
    useCodexStore.getState().resetCodex();
    useCodexUiStore.getState().resetAnimatedNotices();
    useCodexUiStore.getState().closeCodex();
    setConfirmingReset(false);
  };

  useWindowKeyDown((event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    cancelReset();
  }, confirmingReset);

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
          <button
            className={styles.menuButtonDanger}
            type="button"
            onClick={() => setConfirmingReset(true)}
            aria-haspopup="dialog"
          >
            {getLabel('resetProgress')}
          </button>
        </div>
        {renderGroup('level1Heading', LEVEL_1_SCENARIOS)}
        {renderGroup('legacyScenariosHeading', LEGACY_SCENARIOS)}
      </div>
      {confirmingReset && (
        <div
          className={styles.confirmOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) cancelReset();
          }}
        >
          <div
            className={styles.confirmBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmBodyId}
            onClick={(event) => event.stopPropagation()}
          >
            <p id={confirmTitleId} className={styles.confirmTitle}>
              {getLabel('resetProgressConfirmTitle')}
            </p>
            <p id={confirmBodyId} className={styles.confirmBody}>
              {getLabel('resetProgressConfirmBody')}
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.menuButton} type="button" onClick={cancelReset}>
                {getLabel('cancel')}
              </button>
              <button className={styles.menuButtonDanger} type="button" onClick={confirmReset}>
                {getLabel('resetProgressConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenuUI;
