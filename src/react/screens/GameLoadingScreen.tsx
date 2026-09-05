import React from 'react';
import { useGameStore } from '../../store/gameStore';
import getLabel from '../../data/labels';
import styles from './GameLoadingScreen.module.scss';

/**
 * The boot screen, shown until the first playable Phaser scene reports in.
 *
 * It is both the loading UI and the interaction gate: it covers the stage and swallows
 * pointer events, so nothing behind it can be clicked while `Boot`/`Preloader` are still
 * fetching. Progress comes from the Phaser loaders via `boot-progress` (see
 * `src/phaser/bootProgress.ts`), so the bar and the gate can never disagree.
 */
const GameLoadingScreen: React.FC = () => {
  const loadProgress = useGameStore((state) => state.loadProgress);
  const percent = Math.round(loadProgress * 100);
  const title = getLabel('loadingGame');

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingCard}>
        <h2 className={styles.loadingTitle}>{title}</h2>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.progressReadout}>
          {getLabel('loadingPercent', { replacements: { percent } })}
        </p>
      </div>
    </div>
  );
};

export default GameLoadingScreen;
