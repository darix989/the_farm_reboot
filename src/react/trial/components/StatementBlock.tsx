import React from 'react';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';

interface StatementBlockProps {
  /** Dim label shown above the text (e.g. "Opponent speaks:"). */
  speakerLabel: string;
  /** Full statement text. */
  text: string;
  /** Optional action button displayed to the right of the content. */
  analyzeButton?: React.ReactNode;
}

/**
 * A bordered section box containing a speaker label, statement text,
 * and an optional inline action button aligned to the top-right.
 * Used in the interactive panel for NPC and opponent statements.
 */
const StatementBlock: React.FC<StatementBlockProps> = ({ speakerLabel, text, analyzeButton }) => (
  <div
    className={shared.trialSectionBox}
    style={{
      fontSize: 'calc(var(--ui-font-body) * var(--ui-trial-panel-font-scale, 1))',
      lineHeight: 1.375,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.5rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: uiColor.textCaption }}>{speakerLabel}</p>
        <p style={{ marginTop: '0.5rem', color: uiColor.textBody }}>{text}</p>
      </div>
      {analyzeButton}
    </div>
  </div>
);

export default StatementBlock;
