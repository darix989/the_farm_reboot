import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import { ariaKeyShortcutsFor } from '../../data/keyBindings';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useInGameMenuStore } from '../../store/inGameMenuStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { GameManager } from '../../utils/gameManager';
import { useCodexNotices } from '../codex/useCodexNotices';
import { useOpenCodexShortcut } from '../hooks/useOpenCodexShortcut';
import { useWindowKeyDown } from '../hooks/useWindowKeyDown';
import ShortcutKeycap from '../shortcuts/ShortcutKeycap';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import type { TutorialTargetRef } from '../../types/debateEntities';
import styles from './InGameMenu.module.scss';

const CODEX_OPEN_TARGET: TutorialTargetRef = { kind: 'codex_open' };

/** Shared top-left controls for every active farm and Trial scene. */
const InGameHud: React.FC = () => {
  const currentScene = useGameStore((s) => s.currentScene);
  const isTraveling = useFarmStore((s) => s.isTraveling);
  const openCodex = useCodexUiStore((s) => s.openCodex);
  const codexOpen = useCodexUiStore((s) => s.isOpen);
  const animatedNoticeIds = useCodexUiStore((s) => s.animatedNoticeIds);
  const markNoticesAnimated = useCodexUiStore((s) => s.markNoticesAnimated);
  const menuOpen = useInGameMenuStore((s) => s.view !== 'closed');
  const openMenu = useInGameMenuStore((s) => s.openMenu);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const { hasUnread, unreadIds, firstUnreadSection } = useCodexNotices();
  const [codexBursting, setCodexBursting] = useState(false);

  const supportedScene =
    currentScene === 'Farm' || currentScene === 'FarmSide' || currentScene === 'Trial';
  const visible = supportedScene && !(currentScene === 'FarmSide' && isTraveling);
  useOpenCodexShortcut(visible && !menuOpen, firstUnreadSection ?? undefined);
  useWindowKeyDown(
    (event) => {
      if (event.code !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      GameManager.pauseGame();
      openMenu();
    },
    visible && !menuOpen && !codexOpen && !tutorialOpen,
    { capture: true },
  );

  useEffect(() => {
    if (!visible) {
      setCodexBursting(false);
      return;
    }
    const pending = unreadIds.filter((id) => !animatedNoticeIds.includes(id));
    if (pending.length === 0) return;
    markNoticesAnimated(pending);
    setCodexBursting(true);
  }, [visible, unreadIds, animatedNoticeIds, markNoticesAnimated]);

  if (!visible) return null;

  return (
    <div className={styles.hud}>
      <button
        className={styles.hudButton}
        type="button"
        aria-keyshortcuts={ariaKeyShortcutsFor('inGameMenu')}
        onClick={() => {
          GameManager.pauseGame();
          openMenu();
        }}
      >
        {getLabel('inGameMenuOpen')}
      </button>
      <button
        className={cn(
          styles.hudButton,
          hasUnread && styles.codexButtonHasCue,
          codexBursting && styles.codexButtonBurst,
        )}
        type="button"
        data-tutorial-codex-open
        aria-label={hasUnread ? getLabel('codexOpenHasNew') : getLabel('codexOpen')}
        aria-keyshortcuts={ariaKeyShortcutsFor('codexOpen')}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setCodexBursting(false);
        }}
        onClick={() => {
          if (!canRunTutorialTargetAction(CODEX_OPEN_TARGET)) return;
          openCodex(firstUnreadSection ?? undefined);
          notifyTutorialTargetAction(CODEX_OPEN_TARGET);
        }}
      >
        <span className={styles.hudButtonLabel}>{getLabel('codexOpen')}</span>
        <ShortcutKeycap action="codexOpen" />
      </button>
    </div>
  );
};

export default InGameHud;
