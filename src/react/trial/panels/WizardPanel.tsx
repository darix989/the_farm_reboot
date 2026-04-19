import React from 'react';
import styles from './TrialPanels.module.scss';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

export interface WizardPanelDetail {
  title: string;
  body: string;
}

interface WizardPanelProps {
  wizardMessage: string;
  detail: WizardPanelDetail | null;
}

const WizardPanel: React.FC<WizardPanelProps> = ({ wizardMessage, detail }) => (
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
      <h2 className={styles.trialPanelHeading}>{getLabel('wizard')}</h2>
    </div>
    <div className={styles.trialWizardBodyWrap}>
      <p className={detail ? styles.trialWizardGuidanceText : styles.trialWizardMainText}>
        {wizardMessage}
      </p>
      {detail && (
        <div aria-live="polite" className={styles.trialWizardDetailLive}>
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: 'var(--ui-font-body)', lineHeight: 1.375 }}
          >
            <p style={{ color: uiColor.textCaption, margin: 0 }}>{detail.title}</p>
            <p style={{ marginTop: '0.5rem', color: uiColor.textBody, marginBottom: 0 }}>
              {detail.body}
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default WizardPanel;
