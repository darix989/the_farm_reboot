import React from 'react';
import getLabel from '../../data/labels';
import { keycapForCode } from '../../data/keyBindings';
import { isSmartphone } from '../../utils/chromeAndroidFullscreen';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useShortcutRevealStore } from '../../store/shortcutRevealStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { shouldShowShortcutHint } from './shortcutHintVisibility';
import styles from './ShortcutHintBanner.module.scss';

/**
 * Bottom-left gesture hint. Mounted once from `ReactApp` so Farm / FarmSide /
 * Trial cannot drift, and so a warm `FarmSide` → `FarmSide` hop (where
 * `FarmSideUI` never unmounts) cannot drop it.
 *
 * TODO(shortcut-hint): TEMPORARY — always-on. Gate behind first-session or a
 * devSettingsStore toggle once the gesture is known.
 */
const ShortcutHintBanner: React.FC = () => {
  const currentScene = useGameStore((s) => s.currentScene);
  const isTraveling = useFarmStore((s) => s.isTraveling);
  const isCodexOpen = useCodexUiStore((s) => s.isOpen);
  const isTutorialOpen = useTutorialStore((s) => s.isOpen);
  const isRevealed = useShortcutRevealStore((s) => s.isRevealed);

  const ctx = {
    isTouch: isSmartphone(),
    currentScene,
    isTraveling,
    isCodexOpen,
    isTutorialOpen,
    isRevealed,
  };

  const inScope = shouldShowShortcutHint({ ...ctx, isRevealed: false });
  if (!inScope) return null;

  return (
    <p
      className={styles.root}
      style={{ visibility: shouldShowShortcutHint(ctx) ? 'visible' : 'hidden' }}
    >
      {getLabel('shortcutRevealHint', { replacements: { key: keycapForCode('Shift') } })}
    </p>
  );
};

export default ShortcutHintBanner;
