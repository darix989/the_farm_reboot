import React, { useEffect, useRef } from 'react';
import styles from './TrialPanels.module.scss';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TypewriterText from '../components/TypewriterText';
import { WIZARD_SCROLL_KEY } from '../../tutorial/artificialInteractions';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

export interface WizardPanelDetail {
  title: string;
  body: string;
}

/** Set while `detail.body` is being paced out one sentence at a time. */
export interface WizardPanelReveal {
  /** The sentence to fill in, in place of the whole body. */
  sentence: string;
  sentenceIndex: number;
  skipToken: number;
  onSentenceTyped: () => void;
}

interface WizardPanelProps {
  wizardMessage: string;
  detail: WizardPanelDetail | null;
  reveal?: WizardPanelReveal | null;
}

const WizardPanel: React.FC<WizardPanelProps> = ({ wizardMessage, detail, reveal }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealIndex = reveal?.sentenceIndex ?? null;

  // Each sentence replaces the last in the same box. Without this, a sentence that overflowed
  // (or a tutorial's `wizard:scroll_to_bottom`) leaves the next one filling in off-screen.
  useEffect(() => {
    if (revealIndex === null) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [revealIndex]);

  return (
    <div
      data-tutorial-panel="wizard"
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
      <div className={styles.trialWizardBodySlot}>
        <ScrollFadeContainer
          scrollRef={scrollRef}
          className={styles.trialWizardBodyScroll}
          scrollElementDataKey={WIZARD_SCROLL_KEY}
        >
          <p className={detail ? styles.trialWizardGuidanceText : styles.trialWizardMainText}>
            {wizardMessage}
          </p>
          {detail && (
            <div
              // No live region while revealing: the body changes on every character, and a
              // screen reader would restart the paragraph each time. The announcer below
              // speaks each sentence once instead.
              aria-live={reveal ? undefined : 'polite'}
              className={styles.trialWizardDetailLive}
            >
              <div
                className={shared.trialSectionBox}
                style={{
                  fontSize: 'calc(var(--ui-font-body) * var(--ui-trial-panel-font-scale, 1))',
                  lineHeight: 1.375,
                }}
              >
                <p style={{ color: uiColor.textCaption, margin: 0 }}>{detail.title}</p>
                <p style={{ marginTop: '0.5rem', color: uiColor.textBody, marginBottom: 0 }}>
                  {reveal ? (
                    <TypewriterText
                      // Remount per sentence, so two identically-worded sentences in a row
                      // still restart rather than looking already-typed.
                      key={reveal.sentenceIndex}
                      text={reveal.sentence}
                      skipToken={reveal.skipToken}
                      onComplete={reveal.onSentenceTyped}
                    />
                  ) : (
                    detail.body
                  )}
                </p>
              </div>
            </div>
          )}
          {reveal && (
            // Keyed on the index so the region remounts per sentence and is announced once,
            // in full, rather than growing a character at a time.
            <p
              key={reveal.sentenceIndex}
              aria-live="polite"
              aria-atomic="true"
              className={styles.trialWizardRevealAnnouncer}
            >
              {reveal.sentence}
            </p>
          )}
        </ScrollFadeContainer>
      </div>
    </div>
  );
};

export default WizardPanel;
