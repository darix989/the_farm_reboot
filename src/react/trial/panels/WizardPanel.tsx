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
   * wizard reveal — drives the "(2/4)" readout beside the title, or "(all)" for content shown
   * whole with no reveal attached. Omit for content that never reveals a sentence at a time
   * (the player's own choice, the round recap, the closing verdict): those titles already say
   * what they need to on their own.
   */
  sentenceCount?: number;
  /** Whoever is speaking this line, floated as a portrait in the top-left of the statement box. */
  speaker?: { characterId: string; emotion: AnimalEmotion };
  /**
   * Fallacies correctly spotted so far in this statement — mirrors the same badge in the
   * Debate Log, so closing the analysis modal still shows the result here. Shown once the
   * line is settled; a badge on a statement still filling in would spoil it.
   */
  spottedFallacies?: LogicalFallacy[];
}

/** Set while `detail.body` is being paced out a sentence at a time, or once it all has been. */
export interface WizardPanelReveal {
  /** Sentences already fully shown, in order — rendered as static text, in place of the body. */
  spoken: string[];
  /** The sentence still filling in, rendered after `spoken`, or `null` when nothing is typing. */
  typing: string | null;
  /** Total chunks in this reveal, for the "(2/4)" progress readout beside the title. */
  sentenceCount: number;
  skipToken: number;
  onSentenceTyped: () => void;
  /** The whole line is on screen and nothing is typing: allow spotted-fallacy badges. */
  settled?: boolean;
}

interface WizardPanelProps {
  detail: WizardPanelDetail | null;
  reveal?: WizardPanelReveal | null;
  /** `"Round 4 — crossfire"`, or `null` outside the rounds (intro / complete). */
  roundLabel: string | null;
  /** Opens `FallacyInfoModal` describing one fallacy — passed down to each spotted-fallacy icon. */
  onOpenFallacyInfo?: (fallacy: LogicalFallacy) => void;
}

const WizardPanel: React.FC<WizardPanelProps> = ({
  detail,
  reveal,
  roundLabel,
  onOpenFallacyInfo,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealTyping = Boolean(reveal && reveal.typing !== null);
  // How many sentences the box is showing, counting the one still filling in: the "(2/4)" readout.
  // Derived from `spoken` rather than from an index, so a line completed early (analysis opened,
  // a tutorial, reduced motion) reads "(4/4)" with the whole statement up, never a stale "(1/4)".
  const shownCount = reveal ? reveal.spoken.length + (reveal.typing !== null ? 1 : 0) : 0;

  // The box grows a sentence at a time, so keep the newest one in view — without this a long
  // statement (or a tutorial's `wizard:scroll_to_bottom`) fills in below the fold. Accumulating
  // makes that reachable in a way it was not when one sentence replaced the last: the box now
  // holds the whole line.
  //
  // The `ResizeObserver` is what covers the sentence *currently typing*. Its character count
  // lives inside `TypewriterText` precisely so this panel does not re-render 36 times a second,
  // which means a sentence taller than the box would otherwise grow past the fold with no render
  // out here to scroll it back. It stays attached for the whole reveal rather than just while
  // typing: the last of the growth lands as the typewriter is swapped for static text, after
  // `revealTyping` has already gone false. Observe the content, not the scroll box — the box's
  // own size never changes, so it would never fire.
  const hasReveal = Boolean(reveal);
  useEffect(() => {
    const el = scrollRef.current;
    if (!hasReveal || !el) return;
    const pin = () => el.scrollTo({ top: el.scrollHeight });
    pin();
    const observer = new ResizeObserver(pin);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [hasReveal, revealTyping, shownCount]);

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
              // No live region while characters are landing: the body would restart the
              // paragraph each time. The announcer below speaks each sentence once instead.
              aria-live={revealTyping ? undefined : 'polite'}
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
                {/* Reserves 4 lines even for a single freshly-revealed word, so the box's
                    background always fully contains the floated portrait — a shorter block
                    would let the portrait poke out past the background underneath it.

                    Every sentence below is its own sibling `<p>`, never wrapped in a flex or
                    grid container: they have to stay plain block boxes so their line boxes
                    shorten beside `.trialWizardPortrait` and run full-width once it ends. */}
                <div className={styles.trialWizardTextBlock}>
                  <p style={{ color: uiColor.textCaption, margin: 0 }}>
                    {detail.title}
                    {detail.sentenceCount !== undefined && (
                      <>
                        {' '}
                        <span style={{ opacity: 0.7 }}>
                          {reveal
                            ? getLabel('wizardSentenceProgress', {
                                replacements: {
                                  current: shownCount,
                                  total: reveal.sentenceCount,
                                },
                              })
                            : getLabel('wizardSentenceProgressAll')}
                        </span>
                      </>
                    )}
                  </p>
                  {reveal ? (
                    <>
                      {reveal.spoken.map((text, index) => (
                        // Append-only list: a sentence never moves off the index it landed on.
                        <p key={index} className={styles.trialWizardSentence}>
                          {text}
                        </p>
                      ))}
                      {reveal.typing !== null && (
                        <p className={styles.trialWizardSentence}>
                          <TypewriterText
                            // Remount per sentence, so two identically-worded sentences in a row
                            // still restart rather than looking already-typed.
                            key={reveal.spoken.length}
                            text={reveal.typing}
                            skipToken={reveal.skipToken}
                            onComplete={reveal.onSentenceTyped}
                          />
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={styles.trialWizardSentence}>{detail.body}</p>
                  )}
                </div>
                {(!reveal || reveal.settled) &&
                  onOpenFallacyInfo &&
                  detail.spottedFallacies &&
                  detail.spottedFallacies.length > 0 && (
                    <SpottedFallacyIcons
                      fallacies={detail.spottedFallacies}
                      onSelect={onOpenFallacyInfo}
                    />
                  )}
              </div>
            </div>
          )}
          {revealTyping && reveal && (
            // Keyed on the position so the region remounts per sentence and is announced once,
            // in full, rather than growing a character at a time.
            <p
              key={reveal.spoken.length}
              aria-live="polite"
              aria-atomic="true"
              className={styles.trialWizardRevealAnnouncer}
            >
              {reveal.typing}
            </p>
          )}
        </ScrollFadeContainer>
      </div>
    </div>
  );
};

export default WizardPanel;
