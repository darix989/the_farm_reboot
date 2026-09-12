import React from 'react';
import { GameManager } from '../../utils/gameManager';
import getLabel from '../../data/labels';
import styles from './FarmSideUI.module.scss';

/**
 * Minimal overlay for the `FarmSide` scene — iteration 1 has no gameplay yet, only a
 * way back to the menu. `.react-ui-overlay` is `pointer-events: none`, so this button
 * re-enables it for itself (see `docs/architecture.md`).
 */
const FarmSideUI: React.FC = () => {
  return (
    <div className={styles.farmSideUi}>
      <button
        className={styles.backButton}
        type="button"
        onClick={() => GameManager.switchScene('MainMenu')}
      >
        {getLabel('farmSideBackToMenu')}
      </button>
    </div>
  );
};

export default FarmSideUI;
