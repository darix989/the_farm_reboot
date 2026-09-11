import React from 'react';
import cn from 'classnames';
import TrialTextButton from './TrialTextButton';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import { useWindowKeyDown } from '../../hooks/useWindowKeyDown';
import {
  ANALYZE_CODE,
  BACK_CODE,
  isContinueCode,
  shouldIgnoreActionShortcut,
} from '../utils/trialActionShortcuts';
import styles from '../panels/TrialPanels.module.scss';

import magnifyingIcon from '../../../static/icons/magnifying.svg';
import backIcon from '../../../static/icons/back.svg';
import revealIcon from '../../../static/icons/reveal.svg';
import continueIcon from '../../../static/icons/continue.svg';
import confirmIcon from '../../../static/icons/confirm.svg';
import leaveIcon from '../../../static/icons/leave.svg';

const SUBMIT_ICON_SRC: Record<'reveal' | 'continue' | 'confirm' | 'leave', string> = {
  reveal: revealIcon,
  continue: continueIcon,
  confirm: confirmIcon,
  leave: leaveIcon,
};

export interface TrialActionSpec {
  disabled: boolean;
  label: string;
  onClick: () => void;
}

export interface TrialActionRowProps {
  /**
   * `null`/omitted = not rendered at all (`mechanics.analysisEnabled: false`).
   * Pass a spec with `disabled: true` to show it greyed.
   */
  analyze?:
    | (TrialActionSpec & {
        guessState?: 'correct' | 'partial' | 'wrong' | null;
        /** One-shot glow when a shut option click is pointing at Analyze. */
        attentionPulse?: boolean;
      })
    | null;
  back: TrialActionSpec;
  submit: TrialActionSpec & { icon: 'reveal' | 'continue' | 'confirm' | 'leave' };
  /** `data-tutorial-interactive-action` on the submit button. */
  submitTutorialAction: 'continue' | 'confirm';
  /**
   * When false, A / S / Enter / Space / D (and any `extraContinueCodes`) do nothing.
   * Used to yield the keyboard to an overlay (analysis, intro summary).
   */
  shortcutsEnabled?: boolean;
  /** Extra `event.code` values that also press Continue (farm talk keeps `KeyE`). */
  extraContinueCodes?: readonly string[];
}

/**
 * Analyze / Back / Continue icon row. Shared by the debate Actions panel and the
 * overworld talk so the three buttons cannot drift.
 */
const TrialActionRow: React.FC<TrialActionRowProps> = ({
  analyze,
  back,
  submit,
  submitTutorialAction,
  shortcutsEnabled = true,
  extraContinueCodes,
}) => {
  const runAnalyze = () => {
    if (analyze == null) return;
    const target = { kind: 'interactive_action', action: 'analyze' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    analyze.onClick();
    notifyTutorialTargetAction(target);
  };

  const runBack = () => {
    const target = { kind: 'interactive_action', action: 'back' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    back.onClick();
    notifyTutorialTargetAction(target);
  };

  const runSubmit = () => {
    const target = {
      kind: 'interactive_action',
      action: submitTutorialAction,
    } as const;
    if (!canRunTutorialTargetAction(target)) return;
    submit.onClick();
    notifyTutorialTargetAction(target);
  };

  useWindowKeyDown((event) => {
    if (shouldIgnoreActionShortcut(event)) return;

    if (isContinueCode(event.code, extraContinueCodes)) {
      if (submit.disabled) return;
      event.preventDefault();
      runSubmit();
      return;
    }

    if (event.code === ANALYZE_CODE) {
      if (analyze == null || analyze.disabled) return;
      event.preventDefault();
      runAnalyze();
      return;
    }

    if (event.code === BACK_CODE) {
      if (back.disabled) return;
      event.preventDefault();
      runBack();
    }
  }, shortcutsEnabled);

  return (
    <div className={styles.trialInteractiveFooterActions}>
      {analyze != null && (
        <TrialTextButton
          widthMode="square"
          className={cn(styles.trialFooterAnalyzeBtn, {
            [styles.correct]: analyze.guessState === 'correct',
            [styles.partial]: analyze.guessState === 'partial',
            [styles.wrong]: analyze.guessState === 'wrong',
            [styles.trialFooterAnalyzePulse]: analyze.attentionPulse,
          })}
          disabled={analyze.disabled}
          aria-label={analyze.label}
          title={analyze.label}
          onClick={runAnalyze}
          data-tutorial-interactive-action="analyze"
        >
          <img src={magnifyingIcon} alt="" className={styles.trialFooterIcon} />
        </TrialTextButton>
      )}
      <TrialTextButton
        widthMode="square"
        disabled={back.disabled}
        aria-label={back.label}
        title={back.label}
        onClick={runBack}
        data-tutorial-interactive-action="back"
      >
        <img src={backIcon} alt="" className={styles.trialFooterIcon} />
      </TrialTextButton>
      <TrialTextButton
        widthMode="square"
        variant={submit.icon === 'reveal' ? 'dashed' : 'solid'}
        disabled={submit.disabled}
        aria-label={submit.label}
        title={submit.label}
        onClick={runSubmit}
        data-tutorial-interactive-action={submitTutorialAction}
      >
        <img src={SUBMIT_ICON_SRC[submit.icon]} alt="" className={styles.trialFooterIcon} />
      </TrialTextButton>
    </div>
  );
};

export default TrialActionRow;
