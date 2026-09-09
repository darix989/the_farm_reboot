import React, { useCallback, useEffect, useMemo, useState } from 'react';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import type { DebateScenarioKey } from '../../data/levels';
import type { FarmDialogueState } from './farmDialogueState';
import { useWizardReveal } from '../hooks/useWizardReveal';
import { revealChunks } from '../trial/utils/trialHelpers';
import TrialLayout from '../trial/TrialLayout';
import WizardPanel, { type WizardPanelDetail } from '../trial/panels/WizardPanel';
import FarmTalkActionsPanel from './FarmTalkActionsPanel';
import { useUnmetConditionsHint } from '../hooks/useGameConditions';
import { useCodexStore } from '../../store/codexStore';

interface FarmDialogueProps {
  dialogue: FarmDialogueState;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

type TalkMode = 'talk' | 'lessons';

/**
 * Farm talk screen. Same `TrialLayout` as a debate — Dialog bottom-left, Actions
 * bottom-right, farm framed in the game hole — with no log and no Analyze / Back.
 * Keyed on `dialogue.slotKey` at the call site so a new conversation remounts clean.
 */
const FarmDialogue: React.FC<FarmDialogueProps> = ({ dialogue, onStart, onClose }) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const [mode, setMode] = useState<TalkMode>('talk');
  const [selectedLessonKey, setSelectedLessonKey] = useState<DebateScenarioKey | null>(null);
  const lastIndex = Math.max(0, dialogue.beats.length - 1);
  const index = Math.min(Math.max(0, beatIndex), lastIndex);
  const beat = dialogue.beats[index];
  const isLast = index >= lastIndex;

  const body = beat ? getLabel(beat.textLabel) : '';
  const sentences = useMemo(() => revealChunks(body), [body]);

  const reveal = useWizardReveal(
    beat ? { key: `farm:${dialogue.slotKey}:${index}`, sentences } : null,
    { enabled: true, resetKey: dialogue.slotKey },
  );
  const revealActive = mode === 'talk' && reveal.active;
  const revealSettled = reveal.settled;
  const revealAdvance = reveal.advance;

  const advanceBeat = useCallback(() => {
    setBeatIndex((current) => Math.min(current + 1, lastIndex));
  }, [lastIndex]);

  // A real dialog happened till the end: the last beat's reveal has settled. Closing
  // early (walk away mid-conversation) must not set the flag — Bram stays locked.
  useEffect(() => {
    if (!isLast || !revealSettled) return;
    const flag = dialogue.completesFlag;
    if (!flag) return;
    useCodexStore.getState().setDialogFlag(flag);
  }, [isLast, revealSettled, dialogue.completesFlag]);

  // Subscribed rather than snapshotted, so an encounter that unlocks while this conversation is
  // on screen un-greys its own Talk button. That is not hypothetical: the tutorial in Cass's
  // encounter teaches a fallacy, and the player can walk straight to the animal it unlocks.
  const lockedHint = useUnmetConditionsHint(dialogue.scenarioRequires);

  const lessonsList = useMemo(() => {
    return dialogue.lessons
      .map((lesson, i) =>
        getLabel('farmTalkLessonItem', {
          replacements: {
            letter: String.fromCharCode(65 + i),
            title: getLabel(lesson.titleLabel),
          },
        }),
      )
      .join(getLabel('farmTalkLessonItemJoin'));
  }, [dialogue.lessons]);

  const lessonsBody = getLabel('farmTalkLessonsPrompt', { replacements: { list: lessonsList } });
  const lessonsSentences = useMemo(() => revealChunks(lessonsBody), [lessonsBody]);
  const selectedLesson =
    dialogue.lessons.find((lesson) => lesson.key === selectedLessonKey) ?? null;

  const openLessons = useCallback(() => {
    setSelectedLessonKey(null);
    setMode('lessons');
  }, []);

  const backToTalk = useCallback(() => {
    setSelectedLessonKey(null);
    setMode('talk');
  }, []);

  const detail = useMemo((): WizardPanelDetail | null => {
    if (mode === 'lessons') {
      if (selectedLesson) {
        return {
          title: getLabel('wizardDetailSpeaks', {
            replacements: { name: resolveCharacter(dialogue.npcId).displayName },
          }),
          body: getLabel(selectedLesson.previewLabel),
          speaker: { characterId: dialogue.npcId, emotion: 'thinking' },
        };
      }
      return {
        title: getLabel('wizardDetailSpeaks', {
          replacements: { name: resolveCharacter(dialogue.npcId).displayName },
        }),
        body: lessonsBody,
        sentenceCount: lessonsSentences.length,
        speaker: { characterId: dialogue.npcId, emotion: 'thinking' },
      };
    }
    if (!beat) return null;
    return {
      title: getLabel('wizardDetailSpeaks', {
        replacements: { name: resolveCharacter(beat.speakerId).displayName },
      }),
      body,
      sentenceCount: sentences.length,
      speaker: { characterId: beat.speakerId, emotion: beat.emotion ?? 'talking' },
    };
  }, [
    mode,
    beat,
    body,
    sentences.length,
    dialogue.npcId,
    lessonsBody,
    lessonsSentences.length,
    selectedLesson,
  ]);

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        stage={null}
        wizard={
          <WizardPanel
            detail={detail}
            reveal={
              mode === 'talk' && (revealActive || revealSettled)
                ? {
                    spoken: reveal.spoken,
                    typing: reveal.typing,
                    sentenceCount: reveal.sentenceCount,
                    skipToken: reveal.skipToken,
                    onSentenceTyped: reveal.onSentenceTyped,
                    settled: revealSettled,
                  }
                : null
            }
            roundLabel={null}
          />
        }
        interactive={
          <FarmTalkActionsPanel
            revealActive={revealActive}
            isLastBeat={isLast}
            scenario={dialogue.scenario}
            lockedHint={lockedHint}
            lessons={dialogue.lessons}
            mode={mode}
            selectedLessonKey={selectedLessonKey}
            onRevealAdvance={revealAdvance}
            onAdvanceBeat={advanceBeat}
            onStart={onStart}
            onClose={onClose}
            onOpenLessons={openLessons}
            onBackToTalk={backToTalk}
            onSelectLesson={setSelectedLessonKey}
          />
        }
      />
    </div>
  );
};

export default FarmDialogue;
