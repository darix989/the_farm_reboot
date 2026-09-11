import React, { useEffect, useMemo } from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import { ALL_LOGICAL_FALLACIES, logicalFallacyById } from '../../data/fallacyCatalog';
import { DIALOG_FLAG_ORDER, DIALOG_FLAGS } from '../../data/dialogFlags';
import { currentMainGoal, currentOptionalGoals, type LevelGoal } from '../../data/levelGoals';
import { useCodexStore } from '../../store/codexStore';
import { useCodexUiStore, type CodexSection } from '../../store/codexUiStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { useConditionContext } from '../hooks/useGameConditions';
import { groupSpottedByFallacy } from './codexEntries';
import {
  dialogNoticeId,
  knownNoticeId,
  NEXT_DONE_NOTICE_ID,
  nextGoalNoticeId,
  sectionHasUnread,
  spottedNoticeIdFromKey,
} from './codexNotices';
import { useCodexNotices } from './useCodexNotices';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import { tutorialStepNeedsCodexOpen } from '../tutorial/tutorialCodexNeeds';
import type { TutorialTargetRef } from '../../types/debateEntities';
import styles from './CodexOverlay.module.scss';

const SECTIONS: readonly {
  id: CodexSection;
  label: 'codexSectionNext' | 'codexSectionKnown' | 'codexSectionSpotted' | 'codexSectionDialogs';
}[] = [
  { id: 'next', label: 'codexSectionNext' },
  { id: 'known', label: 'codexSectionKnown' },
  { id: 'spotted', label: 'codexSectionSpotted' },
  { id: 'dialogs', label: 'codexSectionDialogs' },
];

const CODEX_CLOSE_TARGET: TutorialTargetRef = { kind: 'codex_close' };

function canDismissCodex(): boolean {
  const { isOpen, steps, stepIndex } = useTutorialStore.getState();
  if (!isOpen) return true;
  return !tutorialStepNeedsCodexOpen(steps[stepIndex]?.targetComponent);
}

function CodexEntry({
  unread,
  onAck,
  children,
}: {
  unread: boolean;
  onAck?: () => void;
  children: React.ReactNode;
}) {
  if (unread && onAck) {
    return (
      <button
        type="button"
        className={cn(styles.codexEntry, styles.codexEntryUnread)}
        onClick={onAck}
      >
        {children}
        <span className={styles.codexEntryUnreadHint}>{getLabel('codexEntryUnreadHint')}</span>
      </button>
    );
  }
  return <div className={styles.codexEntry}>{children}</div>;
}

function GoalCard({
  goal,
  unread,
  onAck,
}: {
  goal: LevelGoal;
  unread: boolean;
  onAck: () => void;
}) {
  return (
    <CodexEntry unread={unread} onAck={onAck}>
      <p className={styles.codexEntryTitle}>{getLabel(goal.titleLabel)}</p>
      <p className={styles.codexEntryBody}>{getLabel(goal.bodyLabel)}</p>
    </CodexEntry>
  );
}

function NextSection({
  unreadIdSet,
  markNoticesSeen,
}: {
  unreadIdSet: ReadonlySet<string>;
  markNoticesSeen: (ids: readonly string[]) => void;
}) {
  const ctx = useConditionContext();
  const main = currentMainGoal(ctx);
  const optionals = currentOptionalGoals(ctx);
  const doneUnread = unreadIdSet.has(NEXT_DONE_NOTICE_ID);

  return (
    <>
      <p className={styles.codexGoalKind}>{getLabel('codexNextMainHeading')}</p>
      {main ? (
        <GoalCard
          goal={main}
          unread={unreadIdSet.has(nextGoalNoticeId(main.id))}
          onAck={() => markNoticesSeen([nextGoalNoticeId(main.id)])}
        />
      ) : (
        <CodexEntry unread={doneUnread} onAck={() => markNoticesSeen([NEXT_DONE_NOTICE_ID])}>
          <p className={styles.codexEntryTitle}>{getLabel('codexNextDoneTitle')}</p>
          <p className={styles.codexEntryBody}>{getLabel('codexNextDoneBody')}</p>
        </CodexEntry>
      )}
      {optionals.length > 0 && (
        <>
          <p className={styles.codexGoalKind}>{getLabel('codexNextOptionalHeading')}</p>
          {optionals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              unread={unreadIdSet.has(nextGoalNoticeId(goal.id))}
              onAck={() => markNoticesSeen([nextGoalNoticeId(goal.id)])}
            />
          ))}
        </>
      )}
    </>
  );
}

function KnownSection({
  unreadIdSet,
  markNoticesSeen,
}: {
  unreadIdSet: ReadonlySet<string>;
  markNoticesSeen: (ids: readonly string[]) => void;
}) {
  const knownFallacies = useCodexStore((s) => s.knownFallacies);

  const known = useMemo(
    () => knownFallacies.map(logicalFallacyById).filter((f) => f !== null),
    [knownFallacies],
  );
  const remaining = ALL_LOGICAL_FALLACIES.length - known.length;

  if (known.length === 0) return <p className={styles.codexEmpty}>{getLabel('codexKnownEmpty')}</p>;

  return (
    <>
      <p className={styles.codexMeta}>
        {getLabel('codexKnownProgress', {
          replacements: { known: known.length, total: ALL_LOGICAL_FALLACIES.length },
        })}
      </p>
      {known.map((fallacy) => (
        <CodexEntry
          key={fallacy.id}
          unread={unreadIdSet.has(knownNoticeId(fallacy.id))}
          onAck={() => markNoticesSeen([knownNoticeId(fallacy.id)])}
        >
          <p className={styles.codexEntryTitle}>{fallacy.label}</p>
          <p className={styles.codexEntryBody}>{fallacy.description}</p>
        </CodexEntry>
      ))}
      {remaining > 0 && (
        <p className={styles.codexFootnote}>
          {getLabel('codexKnownRemaining', { replacements: { count: remaining } })}
        </p>
      )}
    </>
  );
}

function SpottedSection({
  unreadIdSet,
  markNoticesSeen,
}: {
  unreadIdSet: ReadonlySet<string>;
  markNoticesSeen: (ids: readonly string[]) => void;
}) {
  const spottedFallacies = useCodexStore((s) => s.spottedFallacies);
  const groups = useMemo(() => groupSpottedByFallacy(spottedFallacies), [spottedFallacies]);

  if (groups.length === 0) {
    return <p className={styles.codexEmpty}>{getLabel('codexSpottedEmpty')}</p>;
  }

  return (
    <>
      {groups.map((group) => {
        const spotIds = group.spots.map((spot) => spottedNoticeIdFromKey(spot.key));
        const unread = spotIds.some((id) => unreadIdSet.has(id));
        return (
          <CodexEntry key={group.fallacy.id} unread={unread} onAck={() => markNoticesSeen(spotIds)}>
            <p className={styles.codexEntryTitle}>{group.fallacy.label}</p>
            <p className={styles.codexMeta}>
              {getLabel('codexSpottedTimes', { replacements: { count: group.spots.length } })}
            </p>
            {group.spots.map((spot) => (
              <p key={spot.key} className={styles.codexQuote}>
                {getLabel('codexSpottedQuote', { replacements: { text: spot.text } })}
                <span className={styles.codexAttribution}>
                  {getLabel('codexSpottedAttribution', {
                    replacements: { speaker: spot.speakerName },
                  })}
                </span>
              </p>
            ))}
          </CodexEntry>
        );
      })}
    </>
  );
}

function DialogsSection({
  unreadIdSet,
  markNoticesSeen,
}: {
  unreadIdSet: ReadonlySet<string>;
  markNoticesSeen: (ids: readonly string[]) => void;
}) {
  const dialogFlags = useCodexStore((s) => s.dialogFlags);

  // Author order, not the order the player earned them: the Codex is a reference, and a stable
  // list is easier to scan than one that reshuffles as it fills.
  const entries = DIALOG_FLAG_ORDER.filter((id) => dialogFlags.includes(id));

  if (entries.length === 0) {
    return <p className={styles.codexEmpty}>{getLabel('codexDialogsEmpty')}</p>;
  }

  return (
    <>
      {entries.map((id) => (
        <CodexEntry
          key={id}
          unread={unreadIdSet.has(dialogNoticeId(id))}
          onAck={() => markNoticesSeen([dialogNoticeId(id)])}
        >
          <p className={styles.codexEntryTitle}>{getLabel(DIALOG_FLAGS[id].titleLabel)}</p>
          <p className={styles.codexEntryBody}>{getLabel(DIALOG_FLAGS[id].bodyLabel)}</p>
        </CodexEntry>
      ))}
    </>
  );
}

/**
 * The player's journal: who to talk to next, what they have been taught, what they have
 * caught someone doing, and which conversations mattered.
 *
 * Mounted globally from `ReactApp` rather than being a scene of its own, so it can open over the
 * main menu and over the farm without a `scene.start` — routing to a Codex scene would tear down
 * the overworld (and Rue's position with it) just to read a list.
 */
const CodexOverlay: React.FC = () => {
  const isOpen = useCodexUiStore((s) => s.isOpen);
  const section = useCodexUiStore((s) => s.section);
  const setSection = useCodexUiStore((s) => s.setSection);
  const closeCodex = useCodexUiStore((s) => s.closeCodex);
  const { notices, unreadIdSet, markNoticesSeen } = useCodexNotices();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (!canRunTutorialTargetAction(CODEX_CLOSE_TARGET)) return;
      if (!canDismissCodex()) return;
      closeCodex();
      notifyTutorialTargetAction(CODEX_CLOSE_TARGET);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeCodex]);

  if (!isOpen) return null;

  return (
    <div className={styles.codexOverlay} role="dialog" aria-modal="true">
      <div className={styles.codexBox}>
        <div className={styles.codexHeader}>
          <div>
            <h2 className={styles.codexTitle}>{getLabel('codexTitle')}</h2>
            <p className={styles.codexSubtitle}>{getLabel('codexSubtitle')}</p>
          </div>
          <button
            className={styles.codexCloseBtn}
            type="button"
            data-tutorial-codex-close
            onClick={() => {
              if (!canRunTutorialTargetAction(CODEX_CLOSE_TARGET)) return;
              if (!canDismissCodex()) return;
              closeCodex();
              notifyTutorialTargetAction(CODEX_CLOSE_TARGET);
            }}
          >
            {getLabel('codexClose')}
          </button>
        </div>

        <div className={styles.codexTabs} role="tablist" data-tutorial-codex-tabs>
          {SECTIONS.map((tab) => {
            const tabTarget: TutorialTargetRef = { kind: 'codex_tab', section: tab.id };
            const hasUnread = sectionHasUnread(tab.id, notices, unreadIdSet);
            const tabLabel = getLabel(tab.label);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={section === tab.id}
                aria-label={
                  hasUnread
                    ? getLabel('codexTabHasNew', { replacements: { section: tabLabel } })
                    : undefined
                }
                data-tutorial-codex-tab={tab.id}
                className={cn(
                  styles.codexTab,
                  section === tab.id && styles.codexTabActive,
                  hasUnread && styles.codexTabUnread,
                )}
                onClick={() => {
                  if (!canRunTutorialTargetAction(tabTarget)) return;
                  setSection(tab.id);
                  notifyTutorialTargetAction(tabTarget);
                }}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        <div className={styles.codexContent} data-tutorial-codex-content>
          {section === 'next' && (
            <NextSection unreadIdSet={unreadIdSet} markNoticesSeen={markNoticesSeen} />
          )}
          {section === 'known' && (
            <KnownSection unreadIdSet={unreadIdSet} markNoticesSeen={markNoticesSeen} />
          )}
          {section === 'spotted' && (
            <SpottedSection unreadIdSet={unreadIdSet} markNoticesSeen={markNoticesSeen} />
          )}
          {section === 'dialogs' && (
            <DialogsSection unreadIdSet={unreadIdSet} markNoticesSeen={markNoticesSeen} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CodexOverlay;
