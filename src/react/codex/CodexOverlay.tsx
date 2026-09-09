import React, { useEffect, useMemo } from 'react';
import getLabel from '../../data/labels';
import { ALL_LOGICAL_FALLACIES, logicalFallacyById } from '../../data/fallacyCatalog';
import { DIALOG_FLAG_ORDER, DIALOG_FLAGS } from '../../data/dialogFlags';
import { currentMainGoal, currentOptionalGoals, type LevelGoal } from '../../data/levelGoals';
import { useCodexStore } from '../../store/codexStore';
import { useCodexUiStore, type CodexSection } from '../../store/codexUiStore';
import { useConditionContext } from '../hooks/useGameConditions';
import { groupSpottedByFallacy } from './codexEntries';
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

function GoalCard({ goal }: { goal: LevelGoal }) {
  return (
    <div className={styles.codexEntry}>
      <p className={styles.codexEntryTitle}>{getLabel(goal.titleLabel)}</p>
      <p className={styles.codexEntryBody}>{getLabel(goal.bodyLabel)}</p>
    </div>
  );
}

function NextSection() {
  const ctx = useConditionContext();
  const main = currentMainGoal(ctx);
  const optionals = currentOptionalGoals(ctx);

  return (
    <>
      <p className={styles.codexGoalKind}>{getLabel('codexNextMainHeading')}</p>
      {main ? (
        <GoalCard goal={main} />
      ) : (
        <div className={styles.codexEntry}>
          <p className={styles.codexEntryTitle}>{getLabel('codexNextDoneTitle')}</p>
          <p className={styles.codexEntryBody}>{getLabel('codexNextDoneBody')}</p>
        </div>
      )}
      {optionals.length > 0 && (
        <>
          <p className={styles.codexGoalKind}>{getLabel('codexNextOptionalHeading')}</p>
          {optionals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </>
      )}
    </>
  );
}

function KnownSection() {
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
        <div key={fallacy.id} className={styles.codexEntry}>
          <p className={styles.codexEntryTitle}>{fallacy.label}</p>
          <p className={styles.codexEntryBody}>{fallacy.description}</p>
        </div>
      ))}
      {remaining > 0 && (
        <p className={styles.codexFootnote}>
          {getLabel('codexKnownRemaining', { replacements: { count: remaining } })}
        </p>
      )}
    </>
  );
}

function SpottedSection() {
  const spottedFallacies = useCodexStore((s) => s.spottedFallacies);
  const groups = useMemo(() => groupSpottedByFallacy(spottedFallacies), [spottedFallacies]);

  if (groups.length === 0) {
    return <p className={styles.codexEmpty}>{getLabel('codexSpottedEmpty')}</p>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.fallacy.id} className={styles.codexEntry}>
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
        </div>
      ))}
    </>
  );
}

function DialogsSection() {
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
        <div key={id} className={styles.codexEntry}>
          <p className={styles.codexEntryTitle}>{getLabel(DIALOG_FLAGS[id].titleLabel)}</p>
          <p className={styles.codexEntryBody}>{getLabel(DIALOG_FLAGS[id].bodyLabel)}</p>
        </div>
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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeCodex();
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
          <button className={styles.codexCloseBtn} type="button" onClick={closeCodex}>
            {getLabel('codexClose')}
          </button>
        </div>

        <div className={styles.codexTabs} role="tablist">
          {SECTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={section === tab.id}
              className={
                section === tab.id ? `${styles.codexTab} ${styles.codexTabActive}` : styles.codexTab
              }
              onClick={() => setSection(tab.id)}
            >
              {getLabel(tab.label)}
            </button>
          ))}
        </div>

        <div className={styles.codexContent}>
          {section === 'next' && <NextSection />}
          {section === 'known' && <KnownSection />}
          {section === 'spotted' && <SpottedSection />}
          {section === 'dialogs' && <DialogsSection />}
        </div>
      </div>
    </div>
  );
};

export default CodexOverlay;
