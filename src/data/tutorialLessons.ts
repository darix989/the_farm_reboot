/**
 * Replayable teaching encounters, offered from a teacher's farm conversation.
 *
 * The Actions panel only has three keyboard slots (Z / X / C). A fourth lesson needs paging;
 * until then `completedLessonsFor` caps the list at {@link MAX_TUTORIAL_LESSONS_ON_MENU}.
 */
import type { Labels } from './labels';
import type { DebateScenarioKey } from './levels';

export interface TutorialLesson {
  key: DebateScenarioKey;
  titleLabel: Labels;
  /** Shown in the Dialog panel after the player picks this letter, before Continue. */
  previewLabel: Labels;
  teacherId: string;
}

/** Keyboard-bound lesson buttons on the farm talk. A fourth entry would need paging. */
export const MAX_TUTORIAL_LESSONS_ON_MENU = 3;

export const TUTORIAL_LESSONS: readonly TutorialLesson[] = [
  {
    key: '030_bram_teaches_dialog',
    titleLabel: 'tutorialLessonRounds',
    previewLabel: 'tutorialLessonRoundsPreview',
    teacherId: 'bram',
  },
  {
    key: '031_bram_teaches_crossfire',
    titleLabel: 'tutorialLessonCrossfire',
    previewLabel: 'tutorialLessonCrossfirePreview',
    teacherId: 'bram',
  },
];

export function completedLessonsFor(
  teacherId: string,
  completed: readonly DebateScenarioKey[],
): TutorialLesson[] {
  return TUTORIAL_LESSONS.filter(
    (lesson) => lesson.teacherId === teacherId && completed.includes(lesson.key),
  ).slice(0, MAX_TUTORIAL_LESSONS_ON_MENU);
}
