import type { CDPSession, Locator, Page } from '@playwright/test';
import getLabel from '../src/data/labels';
import { JOYSTICK_CENTER, JOYSTICK_DRAG_RADIUS } from '../src/phaser/farm/virtualJoystickMath';
import {
  enableDevMode,
  enterFarmFromMenu,
  FARM_SIDE_BACK_TO_MENU,
  seedLevel1Started,
  TALK_TO_DOT,
  test,
  waitForMainMenu,
} from './helpers';

const OTHER = getLabel('mainMenuOther');
const TOP_DOWN_FARM = getLabel('enterTopDownFarm');

async function holdJoystick(page: Page, x: number, y: number): Promise<CDPSession> {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: JOYSTICK_CENTER.x, y: JOYSTICK_CENTER.y, id: 1 }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y, id: 1 }],
  });
  return session;
}

async function releaseJoystick(session: CDPSession): Promise<void> {
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

async function waitForHiddenWhileHolding(
  session: CDPSession,
  locator: Locator,
  x: number,
  y: number,
  timeout = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeout;
  let nudge = 0;
  while (Date.now() < deadline) {
    if (!(await locator.isVisible())) return;
    // Re-assert the held drag so slow headless frames cannot miss the only move event.
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + nudge, y, id: 1 }],
    });
    nudge = nudge === 0 ? 1 : 0;
    await locator.page().waitForTimeout(100);
  }
  await locator.waitFor({ state: 'hidden', timeout: 1_000 });
}

test.describe('farm touch movement', () => {
  test.use({ hasTouch: true });

  test('moves away from the spawn NPC in the live lateral farm', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await enterFarmFromMenu(page);
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();
    const dotPrompt = page.getByRole('button', { name: TALK_TO_DOT });
    await dotPrompt.waitFor();

    const session = await holdJoystick(
      page,
      JOYSTICK_CENTER.x + JOYSTICK_DRAG_RADIUS,
      JOYSTICK_CENTER.y,
    );
    try {
      await waitForHiddenWhileHolding(
        session,
        dotPrompt,
        JOYSTICK_CENTER.x + JOYSTICK_DRAG_RADIUS,
        JOYSTICK_CENTER.y,
      );
    } finally {
      await releaseJoystick(session);
    }
  });

  test('moves away from the spawn NPC in the top-down farm', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await enableDevMode(page);
    await page.getByRole('button', { name: OTHER }).click();
    await page.getByRole('button', { name: TOP_DOWN_FARM }).click();

    const dotPrompt = page.getByRole('button', { name: TALK_TO_DOT });
    await dotPrompt.waitFor();
    const session = await holdJoystick(
      page,
      JOYSTICK_CENTER.x - JOYSTICK_DRAG_RADIUS,
      JOYSTICK_CENTER.y,
    );
    try {
      await waitForHiddenWhileHolding(
        session,
        dotPrompt,
        JOYSTICK_CENTER.x - JOYSTICK_DRAG_RADIUS,
        JOYSTICK_CENTER.y,
      );
    } finally {
      await releaseJoystick(session);
    }
  });
});
