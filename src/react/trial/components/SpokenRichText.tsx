import React, { Fragment } from 'react';
import {
  parseTutorialRichInline,
  type RichNode,
  type TutorialRichTone,
} from '../../tutorial/tutorialRichTextGrammar';
import { uiColor } from '../../uiColor';

const TONE_COLOR: Record<TutorialRichTone, string> = {
  accent: uiColor.accent,
  danger: uiColor.danger,
  warning: uiColor.warning,
  success: uiColor.success,
  info: uiColor.info,
  muted: uiColor.textMuted,
};

/** Renders `nodes`, stopping once `budget.left` plain characters have been emitted. */
function renderNodes(
  nodes: RichNode[],
  keyBase: string,
  budget: { left: number },
): React.ReactNode[] {
  return nodes.map((node, index) => {
    if (budget.left <= 0) return null;
    const key = `${keyBase}-${index}`;
    if (node.type === 'text') {
      const slice = node.value.slice(0, budget.left);
      budget.left -= slice.length;
      return slice === '' ? null : <Fragment key={key}>{slice}</Fragment>;
    }
    if (node.type === 'bold') {
      return <strong key={key}>{renderNodes(node.children, `${key}-b`, budget)}</strong>;
    }
    return (
      <span key={key} style={{ color: TONE_COLOR[node.tone] }}>
        {renderNodes(node.children, `${key}-t`, budget)}
      </span>
    );
  });
}

export interface SpokenRichTextProps {
  /** One spoken line, possibly carrying inline emphasis — see `spokenMarkup.ts`. */
  text: string;
  /**
   * Plain characters to show, for a line still filling in under the typewriter. Counted over
   * the text the way `plainSpokenText` reads it, so the tags cost the reveal nothing. Omit to
   * render the whole line.
   */
  maxChars?: number;
}

/**
 * A spoken line with its emphasis rendered — the wizard panel's half of `spokenMarkup.ts`.
 *
 * Colour only, no weight: these lines are already the largest text on the stage, and the
 * tutorial overlay marks its own accents the same way.
 */
const SpokenRichText: React.FC<SpokenRichTextProps> = ({ text, maxChars }) => {
  const budget = { left: maxChars ?? text.length };
  return <>{renderNodes(parseTutorialRichInline(text, 0, text.length), 'sp', budget)}</>;
};

export default SpokenRichText;
