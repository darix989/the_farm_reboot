import React from 'react';
import getLabel from '../../data/labels';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useInGameMenuStore } from '../../store/inGameMenuStore';
import { useTrialSessionStore } from '../../store/trialSessionStore';
import { GameManager } from '../../utils/gameManager';
import styles from './InGameMenu.module.scss';

/** Full-stage input shield and the small menu that sits above the active scene. */
const InGameMenuOverlay: React.FC = () => {
  const view = useInGameMenuStore((s) => s.view);
  const closeMenu = useInGameMenuStore((s) => s.closeMenu);
  const showExitConfirmation = useInGameMenuStore((s) => s.showExitConfirmation);
  const cancelExit = useInGameMenuStore((s) => s.cancelExit);
  const currentScene = useGameStore((s) => s.currentScene);

  if (view === 'closed') return null;

  const isTrial = currentScene === 'Trial';
  const resume = () => {
    closeMenu();
    GameManager.resumeGame();
  };
  const exitToMainMenu = () => {
    if (isTrial) useTrialSessionStore.getState().abandon();
    useFarmStore.getState().setPendingForcedTalk(null);
    closeMenu();
    GameManager.resumeGame();
    GameManager.switchScene('MainMenu');
  };

  return (
    <div
      className={styles.menuOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-game-menu-title"
    >
      <div className={styles.menuBox}>
        {view === 'menu' ? (
          <>
            <h2 id="in-game-menu-title" className={styles.menuTitle}>
              {getLabel('inGameMenuTitle')}
            </h2>
            <div className={styles.menuActions}>
              <button className={styles.menuActionPrimary} type="button" onClick={resume}>
                {getLabel('inGameMenuResume')}
              </button>
              <button className={styles.menuAction} type="button" onClick={showExitConfirmation}>
                {getLabel('inGameMenuExit')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="in-game-menu-title" className={styles.menuTitle}>
              {getLabel('inGameMenuExitTitle')}
            </h2>
            <p className={styles.menuBody}>
              {getLabel(isTrial ? 'inGameMenuExitTrialBody' : 'inGameMenuExitFarmBody')}
            </p>
            <div className={styles.menuActions}>
              <button className={styles.menuAction} type="button" onClick={cancelExit}>
                {getLabel('cancel')}
              </button>
              <button className={styles.menuActionDanger} type="button" onClick={exitToMainMenu}>
                {getLabel('inGameMenuExit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InGameMenuOverlay;
