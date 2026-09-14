import type { CDPSession, Page } from '@playwright/test';
import getLabel from '../src/data/labels';
import { JOYSTICK_CENTER, JOYSTICK_DRAG_RADIUS } from '../src/phaser/farm/virtualJoystickMath';
import {
  ENTER_THE_FARM,
  FARM_SIDE_BACK_TO_MENU,
  FARM_SIDE_PORTAL_BARN,
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

test.describe('farm touch movement', () => {
  test.use({ hasTouch: true });

  test('moves through the live lateral farm with the fixed joystick', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();

    const session = await holdJoystick(
      page,
      JOYSTICK_CENTER.x + JOYSTICK_DRAG_RADIUS,
      JOYSTICK_CENTER.y,
    );
    try {
      await page.getByRole('button', { name: FARM_SIDE_PORTAL_BARN }).waitFor({ timeout: 45_000 });
    } finally {
      await releaseJoystick(session);
    }
  });

  test('moves away from the spawn NPC in the top-down farm', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
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
      await dotPrompt.waitFor({ state: 'hidden', timeout: 15_000 });
    } finally {
      await releaseJoystick(session);
    }
  });
});
