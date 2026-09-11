import { useEffect, useMemo, useState } from 'react';
import { useCodexStore } from '../../store/codexStore';
import { useCodexUiStore, type CodexSection } from '../../store/codexUiStore';
import { useProgressStore } from '../../store/progressStore';
import { conditionContextSnapshot } from '../../utils/gameConditions';
import { useConditionContext } from '../hooks/useGameConditions';
import { firstUnreadSection, liveCodexNotices, type CodexNotice } from './codexNotices';

function usePersistHydrated(store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return store.persist.onFinishHydration(() => setHydrated(true));
  }, [store]);

  return hydrated;
}

/**
 * Live Field Notes cards vs persisted `seenNoticeIds`.
 *
 * Seeds the seen list once both persist stores have rehydrated — doing it earlier would
 * snapshot empty arrays and then treat a restored journal as all-new.
 */
export function useCodexNotices(): {
  notices: CodexNotice[];
  unreadIds: readonly string[];
  unreadIdSet: ReadonlySet<string>;
  hasUnread: boolean;
  firstUnreadSection: CodexSection | null;
  markNoticesSeen: (ids: readonly string[]) => void;
} {
  const ctx = useConditionContext();
  const seenNoticeIds = useCodexStore((s) => s.seenNoticeIds);
  const markNoticesSeen = useCodexStore((s) => s.markNoticesSeen);
  const hydrateNotices = useCodexStore((s) => s.hydrateNotices);

  const codexHydrated = usePersistHydrated(useCodexStore);
  const progressHydrated = usePersistHydrated(useProgressStore);

  const notices = useMemo(() => liveCodexNotices(ctx), [ctx]);

  useEffect(() => {
    if (!codexHydrated || !progressHydrated) return;
    if (seenNoticeIds !== null) return;
    useCodexUiStore.getState().resetAnimatedNotices();
    const liveIds = liveCodexNotices(conditionContextSnapshot()).map((notice) => notice.id);
    hydrateNotices(liveIds);
  }, [codexHydrated, progressHydrated, hydrateNotices, seenNoticeIds]);

  const unreadIds = useMemo(() => {
    if (!codexHydrated || !progressHydrated || seenNoticeIds === null) return [];
    const seen = new Set(seenNoticeIds);
    return notices.filter((notice) => !seen.has(notice.id)).map((notice) => notice.id);
  }, [codexHydrated, progressHydrated, seenNoticeIds, notices]);

  const unreadIdSet = useMemo(() => new Set(unreadIds), [unreadIds]);

  return {
    notices,
    unreadIds,
    unreadIdSet,
    hasUnread: unreadIds.length > 0,
    firstUnreadSection: firstUnreadSection(notices, unreadIdSet),
    markNoticesSeen,
  };
}
