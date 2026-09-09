import React from 'react';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import type { TutorialLesson } from '../../data/tutorialLessons';
import TrialActionRow from '../trial/components/TrialActionRow';
import TrialChoiceButton from '../trial/components/TrialChoiceButton';
import { useWindowKeyDown } from '../hooks/useWindowKeyDown';
import {
  optionIndexForCode,
  shouldIgnoreActionShortcut,
} from '../trial/utils/trialActionShortcuts';
import styles from '../trial/panels/TrialPanels.module.scss';

type TalkMode = 'talk' | 'lessons';

interface FarmTalkActionsPanelProps {
  revealActive: boolean;
  isLastBeat: boolean;
  scenario: DebateScenarioKey | null;
  /**
   * Why this animal's encounter cannot be started yet, or null when it can. When set, Talk is
   * disabled and this replaces the actions hint — the panel says what to go and do instead of
   * leaving a greyed button unexplained.
   */
  lockedHint: string | null;
  lessons: readonly TutorialLesson[];
  mode: TalkMode;
  /** `true` when the press was consumed by the sentence pacer. */
  onRevealAdvance: () => boolean;
  onAdvanceBeat: () => void;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
  onOpenLessons: () => void;
  onBackToTalk: () => void;
}

function hintFor(
  revealActive: boolean,
  isLastBeat: boolean,
  hasScenario: boolean,
  lockedHint: string | null,
  hasLessons: boolean,
  mode: TalkMode,
): string {
  if (mode === 'lessons') return getLabel('farmTalkHintLessonsMode');
  if (revealActive) return getLabel('workflowRevealing');
  if (!isLastBeat) return getLabel('farmTalkHintContinue');
  if (hasScenario && lockedHint) return lockedHint;
  if (hasScenario && hasLessons) return getLabel('farmTalkHintChooseTalkLessons');
  if (hasScenario) return getLabel('farmTalkHintChoose');
  if (hasLessons) return getLabel('farmTalkHintChooseLessonsOnly');
  return getLabel('farmTalkHintNothingMore');
}

/**
 * Actions panel for a farm talk. Same chrome as the debate's `InteractivePanel`
 * (title, hint, Analyze / Back / Continue, then Talk / Leave on the last beat),
 * with Analyze greyed and Talk / Leave / Lessons firing immediately.
 *
 * In `lessons` mode the wizard body lists the lessons and this panel shows lettered
 * A / B / C buttons; Back returns to the talk menu.
 */
const FarmTalkActionsPanel: React.FC<FarmTalkActionsPanelProps> = ({
  revealActive,
  isLastBeat,
  scenario,
  lockedHint,
  lessons,
  mode,
  onRevealAdvance,
  onAdvanceBeat,
  onStart,
  onClose,
  onOpenLessons,
  onBackToTalk,
}) => {
  const talkLabel = getLabel('farmTalk');
  const leaveLabel = getLabel('farmLeave');
  const lessonsLabel = getLabel('farmLessons');
  const continueLabel = getLabel('continue');

  const talkDisabled = !scenario || revealActive || !!lockedHint;
  const leaveDisabled = false;
  const lessonsDisabled = revealActive || lessons.length === 0;
  const startTalk = () => {
    if (!scenario) return;
    onStart(scenario);
  };

  type TalkAction = {
    id: 'talk' | 'lessons' | 'leave';
    label: string;
    disabled: boolean;
    onClick: () => void;
  };
  const talkActions: TalkAction[] = [];
  if (scenario) {
    talkActions.push({ id: 'talk', label: talkLabel, disabled: talkDisabled, onClick: startTalk });
  }
  if (lessons.length > 0) {
    talkActions.push({
      id: 'lessons',
      label: lessonsLabel,
      disabled: lessonsDisabled,
      onClick: onOpenLessons,
    });
  }
  talkActions.push({ id: 'leave', label: leaveLabel, disabled: leaveDisabled, onClick: onClose });

  const visibleTalkActions = revealActive
    ? talkActions.filter((action) => action.id === 'leave')
    : talkActions;

  // Last-beat Talk / Lessons / Leave sit in the same A / B / C slots as debate options, so
  // Z / X / C press them. In lessons mode those keys pick a replay instead.
  useWindowKeyDown((event) => {
    if (shouldIgnoreActionShortcut(event)) return;
    const index = optionIndexForCode(event.code);
    if (index === null) return;

    if (mode === 'lessons') {
      const lesson = lessons[index];
      if (!lesson) return;
      event.preventDefault();
      onStart(lesson.key);
      return;
    }

    if (!isLastBeat) return;
    const action = visibleTalkActions[index];
    if (!action || action.disabled) return;
    event.preventDefault();
    action.onClick();
  }, true);

  return (
    <div className={styles.trialInteractiveBody}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>{getLabel('interactive')}</h2>
      </div>
      <p className={styles.trialActionsHint}>
        {hintFor(revealActive, isLastBeat, !!scenario, lockedHint, lessons.length > 0, mode)}
      </p>

      <div className={styles.trialActionsCenter}>
        <TrialActionRow
          analyze={{
            disabled: true,
            label: getLabel('analyzeThisStatement'),
            onClick: () => {},
          }}
          back={{
            disabled: mode !== 'lessons',
            label: getLabel('back'),
            onClick: onBackToTalk,
          }}
          submit={{
            disabled: (isLastBeat && !revealActive) || mode === 'lessons',
            label: continueLabel,
            icon: revealActive ? 'reveal' : 'continue',
            onClick: () => {
              if (mode === 'lessons') return;
              if (revealActive && onRevealAdvance()) return;
              if (!isLastBeat) onAdvanceBeat();
            },
          }}
          submitTutorialAction="continue"
          extraContinueCodes={['KeyE']}
        />
        {mode === 'lessons' && (
          <div className={styles.trialChoices}>
            {lessons.map((lesson, idx) => {
              const optionLetter = String.fromCharCode(65 + idx);
              const title = getLabel(lesson.titleLabel);
              return (
                <TrialChoiceButton
                  key={lesson.key}
                  content={optionLetter}
                  ariaLabel={getLabel('optionAriaLabel', {
                    replacements: { optionLetter, statement: title },
                  })}
                  onClick={() => onStart(lesson.key)}
                />
              );
            })}
          </div>
        )}
        {mode === 'talk' && isLastBeat && (
          <div className={styles.trialChoices}>
            {visibleTalkActions.map((action) => (
              <TrialChoiceButton
                key={action.id}
                content={action.label}
                shape="word"
                ariaLabel={
                  action.id === 'talk' && lockedHint
                    ? `${action.label} — ${lockedHint}`
                    : action.label
                }
                disabled={action.disabled}
                onClick={action.onClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmTalkActionsPanel;
