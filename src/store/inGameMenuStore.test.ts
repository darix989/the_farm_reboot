import { beforeEach, describe, expect, it } from 'vitest';
import { useInGameMenuStore } from './inGameMenuStore';

describe('in-game menu state', () => {
  beforeEach(() => useInGameMenuStore.getState().closeMenu());

  it('moves between the menu and exit confirmation without leaving the menu open on close', () => {
    const store = useInGameMenuStore.getState();
    store.openMenu();
    expect(useInGameMenuStore.getState().view).toBe('menu');

    store.showExitConfirmation();
    expect(useInGameMenuStore.getState().view).toBe('exit_confirm');

    store.cancelExit();
    expect(useInGameMenuStore.getState().view).toBe('menu');

    store.closeMenu();
    expect(useInGameMenuStore.getState().view).toBe('closed');
  });
});
