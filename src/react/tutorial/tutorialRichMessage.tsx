import React, { Fragment } from 'react';
import cn from 'classnames';
import panelStyles from '../trial/panels/TrialPanels.module.scss';
import styles from './TutorialOverlay.module.scss';
import {
  parseTutorialRichInline,
  splitTutorialParagraphs,
  type RichNode,
  type TutorialRichTone,
} from './tutorialRichTextGrammar';

const TONE_CLASS: Record<TutorialRichTone, string> = {
  accent: styles.toneAccent,
  danger: styles.toneDanger,
  warning: styles.toneWarning,
  success: styles.toneSuccess,
  info: styles.toneInfo,
  muted: styles.toneMuted,
};

function renderNodes(nodes: RichNode[], keyBase: string): React.ReactNode[] {
  return nodes.map((n, idx) => {
    const key = `${keyBase}-${idx}`;
    if (n.type === 'text') {
      if (n.value === '') return null;
      return <Fragment key={key}>{n.value}</Fragment>;
    }
    if (n.type === 'bold') {
      return <strong key={key}>{renderNodes(n.children, `${key}-b`)}</strong>;
    }
    return (
      <span key={key} className={TONE_CLASS[n.tone]}>
        {renderNodes(n.children, `${key}-t`)}
      </span>
    );
  });
}

export interface TutorialRichParagraphProps {
  /** One paragraph slice (no blank-line splits inside); single newlines become `<br />`. */
  text: string;
}

/**
 * Renders one paragraph of tutorial copy with **bold** and [tone]...[/tone] spans.
 */
export const TutorialRichParagraph: React.FC<TutorialRichParagraphProps> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 ? <br /> : null}
          {renderNodes(parseTutorialRichInline(line, 0, line.length), `ln${li}`)}
        </Fragment>
      ))}
    </>
  );
};

export interface TutorialModalRichBodyProps {
  message: string;
}

/**
 * Tutorial dialog body: typography wrapper, paragraphs split on blank lines, rich inline per paragraph.
 */
export const TutorialModalRichBody: React.FC<TutorialModalRichBodyProps> = ({ message }) => {
  const paragraphs = splitTutorialParagraphs(message);
  const blocks = paragraphs.length > 0 ? paragraphs : message.trim().length === 0 ? [] : [message];

  return (
    <div className={styles.messageBody}>
      {blocks.map((para, i) => (
        <p key={i} className={cn(panelStyles.trialWizardGuidanceText, styles.messageParagraph)}>
          <TutorialRichParagraph text={para} />
        </p>
      ))}
    </div>
  );
};
