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
  /**
   * The current beat has been read in full. On the last beat this is what mounts Talk /
   * Lessons / Leave: `FarmDialogue` records the conversation as had on the same flag, so a
   * Leave button offered a moment earlier is a button that silently throws the talk away.
   */
  revealSettled: boolean;
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
  /** The lesson letter currently previewed in Dialog, or null while the list is showing. */
  selectedLessonKey: DebateScenarioKey | null;
  /** `true` when the press was consumed by the sentence pacer. */
  onRevealAdvance: () => boolean;
  onAdvanceBeat: () => void;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
  onOpenLessons: () => void;
  onBackToTalk: () => void;
  onSelectLesson: (key: DebateScenarioKey | null) => void;
}

function hintFor(
  revealActive: boolean,
  actionsReady: boolean,
  hasScenario: boolean,
  lockedHint: string | null,
  hasLessons: boolean,
  mode: TalkMode,
  lessonSelected: boolean,
): string {
  if (mode === 'lessons') {
    return lessonSelected
      ? getLabel('farmTalkHintLessonSelected')
      : getLabel('farmTalkHintLessonsMode');
  }
  if (revealActive) return getLabel('workflowRevealing');
  if (!actionsReady) return getLabel('farmTalkHintContinue');
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
 * A / B / C buttons. A letter previews the lesson in Dialog; Continue starts it.
 * Back clears the preview, or returns to the talk menu when nothing is selected.
 */
const FarmTalkActionsPanel: React.FC<FarmTalkActionsPanelProps> = ({
  revealActive,
  revealSettled,
  isLastBeat,
  scenario,
  lockedHint,
  lessons,
  mode,
  selectedLessonKey,
  onRevealAdvance,
  onAdvanceBeat,
  onStart,
  onClose,
  onOpenLessons,
  onBackToTalk,
  onSelectLesson,
}) => {
  const talkLabel = getLabel('farmTalk');
  const leaveLabel = getLabel('farmLeave');
  const lessonsLabel = getLabel('farmLessons');
  const continueLabel = getLabel('continue');

  // Talk / Lessons / Leave are mounted only once the last beat has been read in full. Leave
  // used to be shown on its own while it was still revealing, which let the player end the
  // conversation a sentence early — and `completesFlag` is set on the last reveal settling, so
  // the talk did not count and whoever it unlocks stayed locked.
  const actionsReady = isLastBeat && revealSettled;
  const talkDisabled = !scenario || !!lockedHint;
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
      disabled: false,
      onClick: onOpenLessons,
    });
  }
  talkActions.push({ id: 'leave', label: leaveLabel, disabled: false, onClick: onClose });

  const toggleLesson = (key: DebateScenarioKey) => {
    onSelectLesson(selectedLessonKey === key ? null : key);
  };

  // Last-beat Talk / Lessons / Leave sit in the same A / B / C slots as debate options, so
  // Z / X / C press them. In lessons mode those keys preview a replay instead of starting it.
  useWindowKeyDown((event) => {
    if (shouldIgnoreActionShortcut(event)) return;
    const index = optionIndexForCode(event.code);
    if (index === null) return;

    if (mode === 'lessons') {
      const lesson = lessons[index];
      if (!lesson) return;
      event.preventDefault();
      toggleLesson(lesson.key);
      return;
    }

    if (!actionsReady) return;
    const action = talkActions[index];
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
        {hintFor(
          revealActive,
          actionsReady,
          !!scenario,
          lockedHint,
          lessons.length > 0,
          mode,
          !!selectedLessonKey,
        )}
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
            onClick: () => {
              if (selectedLessonKey) {
                onSelectLesson(null);
                return;
              }
              onBackToTalk();
            },
          }}
          submit={{
            disabled: mode === 'lessons' ? !selectedLessonKey : actionsReady,
            label: continueLabel,
            icon: revealActive ? 'reveal' : 'continue',
            onClick: () => {
              if (mode === 'lessons') {
                if (selectedLessonKey) onStart(selectedLessonKey);
                return;
              }
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
              const preview = getLabel(lesson.previewLabel);
              return (
                <TrialChoiceButton
                  key={lesson.key}
                  content={optionLetter}
                  ariaLabel={getLabel('optionAriaLabel', {
                    replacements: { optionLetter, statement: preview },
                  })}
                  selected={selectedLessonKey === lesson.key}
                  onClick={() => toggleLesson(lesson.key)}
                />
              );
            })}
          </div>
        )}
        {mode === 'talk' && actionsReady && (
          <div className={styles.trialChoices}>
            {talkActions.map((action) => (
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
