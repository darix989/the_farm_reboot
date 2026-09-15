import React, { useId, useState } from 'react';
import { useGameStore, type DebateScenarioKey } from '../../store/gameStore';
import { LEGACY_SCENARIOS, LEVEL_1_SCENARIOS, type ScenarioEntry } from '../../data/levels';
import { DEFAULT_SIDE_SCENE_ID, SIDE_SCENE_MENU } from '../../data/sideScenes';
import { MENU_TALK_GROUPS, resumeBesideNpc, type MenuTalkEntry } from '../../data/menuTalks';
import type { SideSceneId } from '../../types/sideScene';
import { GameManager } from '../../utils/gameManager';
import { useCodexStore } from '../../store/codexStore';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useProgressStore } from '../../store/progressStore';
import { useDevSettingsStore } from '../../store/devSettingsStore';
import { useFarmStore } from '../../store/farmStore';
import { useWindowKeyDown } from '../hooks/useWindowKeyDown';
import styles from './MainMenuUI.module.scss';
import getLabel, { type Labels } from '../../data/labels';

type MenuView = 'home' | 'settings' | 'farmScenes' | 'dialogs' | 'level1' | 'other';
type ConfirmationAction = 'newGame' | 'resetProgress';

const SECTION_HEADING: Record<Exclude<MenuView, 'home'>, Labels> = {
  settings: 'mainMenuProgressSettings',
  farmScenes: 'sideScenesHeading',
  dialogs: 'mainMenuDialogs',
  level1: 'level1Heading',
  other: 'mainMenuOther',
};

const MainMenuUI: React.FC = () => {
  const setActiveDebate = useGameStore((s) => s.setActiveDebate);
  const setReturnSceneKey = useGameStore((s) => s.setReturnSceneKey);
  const devMode = useDevSettingsStore((s) => s.devMode);
  const toggleDevMode = useDevSettingsStore((s) => s.toggleDevMode);
  const showFarmTalkSkip = useDevSettingsStore((s) => s.showFarmTalkSkip);
  const toggleFarmTalkSkip = useDevSettingsStore((s) => s.toggleFarmTalkSkip);
  const hasSavedProgress = useProgressStore(
    (s) => s.level1Started || s.completedScenarios.length > 0 || s.completedTutorials.length > 0,
  );
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const [view, setView] = useState<MenuView>('home');
  const confirmTitleId = useId();
  const confirmBodyId = useId();

  const startTrial = (debateId: DebateScenarioKey) => {
    setActiveDebate(debateId);
    // Launching straight from the menu returns to the menu, not the farm.
    setReturnSceneKey('MainMenu');
    GameManager.switchScene('Trial');
  };

  const enterFarm = () => GameManager.switchScene('FarmSide');

  const enterSideScene = (id: SideSceneId) => {
    const store = useGameStore.getState();
    store.setActiveSideScene(id);
    // Drop the last pose so this is a start, not a resume — Enter the Farm still
    // restores `sideSceneResume` when the player comes back through the primary button.
    store.setSideSceneResume(null);
    GameManager.switchScene('FarmSide');
  };

  const enterTopDownFarm = () => GameManager.switchScene('Farm');

  const openAnimationGallery = () => GameManager.switchScene('AnimalGallery');

  const enterForcedTalk = (entry: MenuTalkEntry) => {
    const store = useGameStore.getState();
    store.setActiveSideScene(entry.sceneId);
    store.setSideSceneResume(resumeBesideNpc(entry.npcId, entry.sceneId));
    useFarmStore.getState().setPendingForcedTalk({ npcId: entry.npcId, slotKey: entry.slotKey });
    useProgressStore.getState().markLevel1Started();
    GameManager.switchScene('FarmSide');
  };

  // Not a scene switch — the Codex is a global overlay, so it opens on top of the menu.
  // Tab does not open it here: that shortcut is farm-only (`FarmUI` / `FarmSideUI`).
  const openCodex = useCodexUiStore((s) => s.openCodex);

  const goHome = () => setView('home');
  const cancelConfirmation = () => setConfirmation(null);

  const resetSavedProgress = () => {
    // Persist middleware writes the empty snapshot to `localStorage` on `set`.
    useProgressStore.getState().resetProgress();
    useCodexStore.getState().resetCodex();
    useCodexUiStore.getState().resetAnimatedNotices();
    useCodexUiStore.getState().closeCodex();
    useGameStore.getState().setActiveSideScene(DEFAULT_SIDE_SCENE_ID);
    useGameStore.getState().setSideSceneResume(null);
    useFarmStore.getState().setPendingForcedTalk(null);
  };

  const confirmAction = () => {
    if (confirmation === 'newGame') {
      resetSavedProgress();
      enterFarm();
    } else if (confirmation === 'resetProgress') {
      resetSavedProgress();
    }
    cancelConfirmation();
  };

  useWindowKeyDown(
    (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (confirmation) {
        cancelConfirmation();
        return;
      }
      goHome();
    },
    confirmation !== null || view !== 'home',
  );

  const renderScenarioButtons = (entries: readonly ScenarioEntry[]) => (
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
  );

  const renderBackRow = (headingLabel: Labels) => (
    <div className={styles.menuBackRow}>
      <button className={styles.menuButton} type="button" onClick={goHome}>
        {getLabel('mainMenuBack')}
      </button>
      <h2 id={headingLabel} className={styles.menuViewHeading}>
        {getLabel(headingLabel)}
      </h2>
    </div>
  );

  return (
    <div className={styles.mainMenuUi}>
      <div className={styles.menuStage}>
        <div className={styles.menuContainer}>
          <header className={styles.menuHeader}>
            <h1 className={styles.menuTitle}>{getLabel('gameTitle')}</h1>
            <p className={styles.menuTagline}>{getLabel('gameTagline')}</p>
          </header>
          {view === 'home' && !devMode && (
            <section className={styles.primaryActions} aria-label={getLabel('mainMenu')}>
              {hasSavedProgress && (
                <button className={styles.menuButtonPrimary} type="button" onClick={enterFarm}>
                  {getLabel('mainMenuContinue')}
                </button>
              )}
              <button
                className={styles.menuButtonPrimary}
                type="button"
                onClick={() => setConfirmation('newGame')}
              >
                {getLabel('mainMenuNewGame')}
              </button>
              <button
                className={styles.menuButton}
                type="button"
                onClick={() => setView('settings')}
              >
                {getLabel('mainMenuProgressSettings')}
              </button>
            </section>
          )}
          {view === 'home' && devMode && (
            <>
              <section className={styles.menuGroup} aria-labelledby="mainMenuMainOptions">
                <h2 id="mainMenuMainOptions" className={styles.menuGroupHeading}>
                  {getLabel('mainMenuMainOptions')}
                </h2>
                <div className={styles.primaryActions}>
                  <button className={styles.menuButtonPrimary} type="button" onClick={enterFarm}>
                    {getLabel('enterTheFarm')}
                  </button>
                  <button
                    className={styles.menuButton}
                    type="button"
                    onClick={openAnimationGallery}
                  >
                    {getLabel('animationGallery')}
                  </button>
                </div>
              </section>
              <nav className={styles.sectionNav} aria-label={getLabel('mainMenu')}>
                {(
                  [
                    ['settings', 'mainMenuProgressSettings'],
                    ['farmScenes', 'sideScenesHeading'],
                    ['dialogs', 'mainMenuDialogs'],
                    ['level1', 'level1Heading'],
                    ['other', 'mainMenuOther'],
                  ] as const
                ).map(([next, label]) => (
                  <button
                    key={next}
                    className={styles.menuButton}
                    type="button"
                    onClick={() => setView(next)}
                  >
                    {getLabel(label)}
                  </button>
                ))}
              </nav>
            </>
          )}
          {view === 'settings' && (
            <section className={styles.menuGroup} aria-labelledby={SECTION_HEADING.settings}>
              {renderBackRow(SECTION_HEADING.settings)}
              <div className={styles.primaryActions}>
                <button
                  className={styles.menuButton}
                  type="button"
                  onClick={toggleDevMode}
                  aria-pressed={devMode}
                >
                  {getLabel('devModeToggle', {
                    replacements: {
                      state: getLabel(devMode ? 'devFarmTalkSkipOn' : 'devFarmTalkSkipOff'),
                    },
                  })}
                </button>
                {devMode && (
                  <>
                    <button
                      className={styles.menuButtonDanger}
                      type="button"
                      onClick={() => setConfirmation('resetProgress')}
                      aria-haspopup="dialog"
                    >
                      {getLabel('resetProgress')}
                    </button>
                    <button
                      className={styles.menuButton}
                      type="button"
                      onClick={toggleFarmTalkSkip}
                      aria-pressed={showFarmTalkSkip}
                    >
                      {getLabel('devFarmTalkSkipToggle', {
                        replacements: {
                          state: getLabel(
                            showFarmTalkSkip ? 'devFarmTalkSkipOn' : 'devFarmTalkSkipOff',
                          ),
                        },
                      })}
                    </button>
                    <button className={styles.menuButton} type="button" onClick={() => openCodex()}>
                      {getLabel('codexOpen')}
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
          {view === 'farmScenes' && (
            <section className={styles.menuGroup} aria-labelledby={SECTION_HEADING.farmScenes}>
              {renderBackRow(SECTION_HEADING.farmScenes)}
              <div className={styles.sceneJumpList}>
                {SIDE_SCENE_MENU.map((entry) => (
                  <button
                    key={entry.id}
                    className={styles.scenarioButton}
                    type="button"
                    onClick={() => enterSideScene(entry.id)}
                  >
                    {getLabel(entry.titleLabel)}
                  </button>
                ))}
              </div>
            </section>
          )}
          {view === 'dialogs' && (
            <section className={styles.menuGroup} aria-labelledby={SECTION_HEADING.dialogs}>
              {renderBackRow(SECTION_HEADING.dialogs)}
              {MENU_TALK_GROUPS.map((group) => (
                <div key={group.id} className={styles.menuGroup}>
                  <h3 className={styles.menuGroupHeading}>{getLabel(group.headingLabel)}</h3>
                  <div className={styles.scenarioList}>
                    {group.entries.map((entry) => (
                      <button
                        key={entry.slotKey}
                        className={styles.scenarioButton}
                        type="button"
                        onClick={() => enterForcedTalk(entry)}
                      >
                        {getLabel(entry.titleLabel)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
          {view === 'level1' && (
            <section className={styles.menuGroup} aria-labelledby={SECTION_HEADING.level1}>
              {renderBackRow(SECTION_HEADING.level1)}
              {renderScenarioButtons(LEVEL_1_SCENARIOS)}
            </section>
          )}
          {view === 'other' && (
            <section className={styles.menuGroup} aria-labelledby={SECTION_HEADING.other}>
              {renderBackRow(SECTION_HEADING.other)}
              <div className={styles.primaryActions}>
                <button className={styles.menuButton} type="button" onClick={enterTopDownFarm}>
                  {getLabel('enterTopDownFarm')}
                </button>
              </div>
              {renderScenarioButtons(LEGACY_SCENARIOS)}
            </section>
          )}
        </div>
      </div>
      {confirmation && (
        <div
          className={styles.confirmOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) cancelConfirmation();
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
              {getLabel(
                confirmation === 'newGame' ? 'newGameConfirmTitle' : 'resetProgressConfirmTitle',
              )}
            </p>
            <p id={confirmBodyId} className={styles.confirmBody}>
              {getLabel(
                confirmation === 'newGame' ? 'newGameConfirmBody' : 'resetProgressConfirmBody',
              )}
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.menuButton} type="button" onClick={cancelConfirmation}>
                {getLabel('cancel')}
              </button>
              <button className={styles.menuButtonDanger} type="button" onClick={confirmAction}>
                {getLabel(
                  confirmation === 'newGame'
                    ? 'newGameConfirmAction'
                    : 'resetProgressConfirmAction',
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenuUI;
