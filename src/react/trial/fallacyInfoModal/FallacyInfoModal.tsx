import React from 'react';
import cn from 'classnames';
import type { LogicalFallacy } from '../../../types/debateEntities';
import { getLogicalFallacyIconSrc } from '../utils/logicalFallacyIcons';
import { statementTypeLabel } from '../utils/trialHelpers';
import shared from '../trialShared.module.scss';
import getLabel from '../../../data/labels';
import styles from './FallacyInfoModal.module.scss';

interface FallacyInfoModalProps {
  fallacy: LogicalFallacy;
  onClose: () => void;
}

/**
 * Small fixed-size popover describing one logical fallacy — opened by clicking a spotted-fallacy
 * icon in either the Debate Log or the Dialog panel. Unlike the round modals (`RoundRecapModal`,
 * `IntroSummaryModal`), this one is purely informational and carries no tutorial gating: nothing
 * in the round-progression flow depends on it being open or closed.
 */
const FallacyInfoModal: React.FC<FallacyInfoModalProps> = ({ fallacy, onClose }) => {
  return (
    <div
      className={styles.fallacyModalOverlay}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        onClose();
      }}
    >
      <div
        className={cn(shared.trialModalFontScope, styles.fallacyModalBox)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fallacy-info-title"
      >
        <div className={styles.fallacyModalHeader}>
          <img
            src={getLogicalFallacyIconSrc(fallacy.id)}
            alt=""
            className={styles.fallacyModalIcon}
          />
          <div className={styles.fallacyModalTitles}>
            <h2 id="fallacy-info-title" className={styles.fallacyModalTitle}>
              {fallacy.label}
            </h2>
            <p className={styles.fallacyModalSubtitle}>{statementTypeLabel(fallacy.type)}</p>
          </div>
          <button
            type="button"
            className={styles.fallacyModalCloseBtn}
            onClick={onClose}
            aria-label={getLabel('close')}
          >
            ✕
          </button>
        </div>
        <div className={styles.fallacyModalBody}>
          <p className={styles.fallacyModalDescription}>{fallacy.description}</p>
        </div>
      </div>
    </div>
  );
};

export default FallacyInfoModal;
