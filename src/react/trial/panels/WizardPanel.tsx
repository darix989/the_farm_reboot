import React from 'react';
import styles from './TrialPanels.module.scss';

interface WizardPanelProps {
  wizardMessage: string;
}

const WizardPanel: React.FC<WizardPanelProps> = ({ wizardMessage }) => (
  <div
    style={{
      display: 'flex',
      height: '100%',
      minHeight: 0,
      width: '100%',
      flexDirection: 'column',
      gap: '1rem',
    }}
  >
    <div className={styles.trialAreaTitle}>
      <h2 className={styles.trialPanelHeading}>Wizard</h2>
    </div>
    <div className={styles.trialWizardBodyWrap}>
      <p className={styles.trialWizardMainText}>{wizardMessage}</p>
    </div>
  </div>
);

export default WizardPanel;
