import { useCodexUiStore, type CodexSection } from '../../store/codexUiStore';
import type { TutorialTargetRef } from '../../types/debateEntities';
import { isOpenCodexShortcut } from '../codex/codexShortcut';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import { useWindowKeyDown } from './useWindowKeyDown';

const CODEX_OPEN_TARGET: TutorialTargetRef = { kind: 'codex_open' };

export function useOpenCodexShortcut(enabled: boolean, section?: CodexSection): void {
  const isOpen = useCodexUiStore((s) => s.isOpen);
  const openCodex = useCodexUiStore((s) => s.openCodex);

  useWindowKeyDown((event) => {
    if (!isOpenCodexShortcut(event)) return;
    if (!canRunTutorialTargetAction(CODEX_OPEN_TARGET)) return;
    event.preventDefault();
    openCodex(section);
    notifyTutorialTargetAction(CODEX_OPEN_TARGET);
  }, enabled && !isOpen);
}
