import { currentMainGoal, currentOptionalGoals } from '../../data/levelGoals';
import { logicalFallacyById } from '../../data/fallacyCatalog';
import { DIALOG_FLAG_ORDER } from '../../data/dialogFlags';
import type { ConditionContext } from '../../utils/gameConditions';
import type { SpottedFallacy } from '../../store/codexStore';
import type { CodexSection } from '../../store/codexUiStore';
import { groupSpottedByFallacy } from './codexEntries';

/**
 * One thing Field Notes currently shows, keyed so unread tracking can match a card
 * (or a spotted-fallacy group of cards) without caring how the write arrived.
 */
export interface CodexNotice {
  id: string;
  section: CodexSection;
}

export const NEXT_DONE_NOTICE_ID = 'next:done';

export const CODEX_SECTION_ORDER: readonly CodexSection[] = ['next', 'known', 'spotted', 'dialogs'];

export function nextGoalNoticeId(goalId: string): string {
  return `next:${goalId}`;
}

export function knownNoticeId(fallacyId: string): string {
  return `known:${fallacyId}`;
}

export function spottedNoticeId(
  spot: Pick<SpottedFallacy, 'scenarioKey' | 'statementId' | 'sentenceId'>,
): string {
  return `spotted:${spot.scenarioKey}:${spot.statementId}:${spot.sentenceId}`;
}

/** `ResolvedSpot.key` is `scenarioKey:statementId:sentenceId`. */
export function spottedNoticeIdFromKey(key: string): string {
  return `spotted:${key}`;
}

export function dialogNoticeId(flagId: string): string {
  return `dialog:${flagId}`;
}

/**
 * Everything the overlay would render right now. Unread = these ids minus `seenNoticeIds`.
 *
 * Spots that no longer resolve are omitted — they have no card to click, so they must not
 * hold the HUD cue open.
 */
export function liveCodexNotices(ctx: ConditionContext): CodexNotice[] {
  const notices: CodexNotice[] = [];

  const main = currentMainGoal(ctx);
  if (main) {
    notices.push({ id: nextGoalNoticeId(main.id), section: 'next' });
  } else {
    notices.push({ id: NEXT_DONE_NOTICE_ID, section: 'next' });
  }
  for (const goal of currentOptionalGoals(ctx)) {
    notices.push({ id: nextGoalNoticeId(goal.id), section: 'next' });
  }

  for (const fallacyId of ctx.knownFallacies) {
    if (!logicalFallacyById(fallacyId)) continue;
    notices.push({ id: knownNoticeId(fallacyId), section: 'known' });
  }

  for (const group of groupSpottedByFallacy(ctx.spottedFallacies)) {
    for (const spot of group.spots) {
      notices.push({ id: spottedNoticeIdFromKey(spot.key), section: 'spotted' });
    }
  }

  for (const flagId of DIALOG_FLAG_ORDER) {
    if (!ctx.dialogFlags.includes(flagId)) continue;
    notices.push({ id: dialogNoticeId(flagId), section: 'dialogs' });
  }

  return notices;
}

export function firstUnreadSection(
  notices: readonly CodexNotice[],
  unreadIds: ReadonlySet<string>,
): CodexSection | null {
  for (const section of CODEX_SECTION_ORDER) {
    if (notices.some((notice) => notice.section === section && unreadIds.has(notice.id))) {
      return section;
    }
  }
  return null;
}

export function sectionHasUnread(
  section: CodexSection,
  notices: readonly CodexNotice[],
  unreadIds: ReadonlySet<string>,
): boolean {
  return notices.some((notice) => notice.section === section && unreadIds.has(notice.id));
}
