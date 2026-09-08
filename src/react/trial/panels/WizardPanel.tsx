import React, { useEffect, useRef } from 'react';
import styles from './TrialPanels.module.scss';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TypewriterText from '../components/TypewriterText';
import SpottedFallacyIcons from '../components/SpottedFallacyIcons';
import { WIZARD_SCROLL_KEY } from '../../tutorial/artificialInteractions';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';
import AnimalFace from '../../characters/AnimalFace';
import type { AnimalEmotion } from '../../../phaser/animals/animalEmotions';
import type { LogicalFallacy } from '../../../types/debateEntities';

export interface WizardPanelDetail {
  title: string;
  body: string;
  /**
   * Total sentences in this line, when it is (or was) incoming speech paced through the
   * wizard reveal — drives the "(2/4)" / "(all)" readout beside the title. Omit for content
   * that never reveals a sentence at a time (the player's own choice, the round recap, the
   * closing verdict): those titles already say what they need to on their own.
   */
  sentenceCount?: number;
  /** Whoever is speaking this line, floated as a portrait in the top-left of the statement box. */
  speaker?: { characterId: string; emotion: AnimalEmotion };
  /**
   * Fallacies correctly spotted so far in this statement — mirrors the same badge in the
   * Debate Log, so closing the analysis modal still shows the result here. Only shown once
   * the line has finished revealing (see `reveal` below): a fallacy badge on a statement the
   * player has not finished reading yet would spoil it.
   */
  spottedFallacies?: LogicalFallacy[];
}

/** Set while `detail.body` is being paced out one sentence at a time. */
export interface WizardPanelReveal {
  /** The sentence to fill in, in place of the whole body. */
  sentence: string;
  sentenceIndex: number;
  /** Total chunks in this reveal, for the "(2/4)" progress readout beside the title. */
  sentenceCount: number;
  skipToken: number;
  onSentenceTyped: () => void;
}

interface WizardPanelProps {
  detail: WizardPanelDetail | null;
  reveal?: WizardPanelReveal | null;
  /** `"Round 4 — crossfire"`, or `null` outside the rounds (intro / complete). */
  roundLabel: string | null;
  /** Opens `FallacyInfoModal` describing one fallacy — passed down to each spotted-fallacy icon. */
  onOpenFallacyInfo: (fallacy: LogicalFallacy) => void;
}

const WizardPanel: React.FC<WizardPanelProps> = ({
  detail,
  reveal,
  roundLabel,
  onOpenFallacyInfo,
}) => {
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
        {roundLabel && <span className={styles.trialDialogRoundLabel}>— {roundLabel}</span>}
      </div>
      <div className={styles.trialWizardBodySlot}>
        <ScrollFadeContainer
          scrollRef={scrollRef}
          className={styles.trialWizardBodyScroll}
          scrollElementDataKey={WIZARD_SCROLL_KEY}
        >
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
                {detail.speaker && (
                  <span className={styles.trialWizardPortrait}>
                    <AnimalFace
                      characterId={detail.speaker.characterId}
                      emotion={detail.speaker.emotion}
                      size="dialogue"
                    />
                  </span>
                )}
                <p style={{ color: uiColor.textCaption, margin: 0 }}>
                  {detail.title}
                  {detail.sentenceCount !== undefined && (
                    <>
                      {' '}
                      <span style={{ opacity: 0.7 }}>
                        {reveal
                          ? getLabel('wizardSentenceProgress', {
                              replacements: {
                                current: reveal.sentenceIndex + 1,
                                total: reveal.sentenceCount,
                              },
                            })
                          : getLabel('wizardSentenceProgressAll')}
                      </span>
                    </>
                  )}
                </p>
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
                {!reveal && (
                  <SpottedFallacyIcons
                    fallacies={detail.spottedFallacies ?? []}
                    onSelect={onOpenFallacyInfo}
                  />
                )}
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
