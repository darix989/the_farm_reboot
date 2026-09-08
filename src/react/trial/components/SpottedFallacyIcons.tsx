import React from 'react';
import type { LogicalFallacy } from '../../../types/debateEntities';
import { getLogicalFallacyIconSrc } from '../utils/logicalFallacyIcons';
import getLabel from '../../../data/labels';
import styles from '../panels/TrialPanels.module.scss';

interface SpottedFallacyIconsProps {
  fallacies: LogicalFallacy[];
  onSelect: (fallacy: LogicalFallacy) => void;
}

/**
 * Icon row for the fallacies the player has correctly spotted in one statement — shown under
 * its text in both the Debate Log and the Dialog panel, so the result of an analysis session
 * is still visible once the modal closes. Clicking an icon opens `FallacyInfoModal` with that
 * fallacy's description.
 */
const SpottedFallacyIcons: React.FC<SpottedFallacyIconsProps> = ({ fallacies, onSelect }) => {
  if (fallacies.length === 0) return null;
  return (
    <div className={styles.debateLogSpottedFallacies} aria-label={getLabel('spottedFallaciesAria')}>
      {fallacies.map((f) => (
        <button
          key={f.id}
          type="button"
          className={styles.debateLogSpottedFallacyBtn}
          onClick={() => onSelect(f)}
          aria-label={f.label}
          title={f.label}
        >
          <img
            src={getLogicalFallacyIconSrc(f.id)}
            alt=""
            className={styles.debateLogSpottedFallacyIcon}
          />
        </button>
      ))}
    </div>
  );
};

export default SpottedFallacyIcons;
