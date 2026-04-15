import React from 'react';
import styles from '../TrialUI.module.scss';

interface HistoryEntryProps {
  /** Dim header line — accepts ReactNode so callers can include coloured spans. */
  label: React.ReactNode;
  /** Main body text shown below the label. */
  text: string;
  /** Optional action button rendered absolutely in the bottom-right corner.
   *  Intended for `<AnalyzeButton>` instances. */
  analyzeButton?: React.ReactNode;
}

/**
 * One row in the debate history list.
 * Renders a dim label, body text, and an optional absolute-positioned action button.
 */
const HistoryEntry: React.FC<HistoryEntryProps> = ({ label, text, analyzeButton }) => (
  <div className={styles.trialHistoryEntry}>
    <p style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
    <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>{text}</p>
    {analyzeButton}
  </div>
);

export default HistoryEntry;
