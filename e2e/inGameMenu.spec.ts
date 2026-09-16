import {
  CONTINUE,
  FIELD_NOTES,
  IN_GAME_MENU,
  IN_GAME_MENU_EXIT,
  LEVEL_1_FIRST,
  LEVEL_1_HEADING,
  attachScreenshot,
  enableDevMode,
  enterFarmFromMenu,
  expect,
  seedLevel1Started,
  test,
  waitForMainMenu,
  waitForOverlayChrome,
} from './helpers';
import getLabel from '../src/data/labels';

test.describe('in-game menu', () => {
  test('shields farm input while open and resumes the current scene', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await enterFarmFromMenu(page);

    await page.getByRole('button', { name: IN_GAME_MENU }).waitFor();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: getLabel('inGameMenuTitle') })).toBeVisible();

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowRight');
    await expect(page.getByText(getLabel('farmSideMoveHint'))).toBeVisible();

    await page.getByRole('button', { name: getLabel('inGameMenuResume') }).click();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(100);
    await page.keyboard.up('ArrowRight');
    await expect(page.getByText(getLabel('farmSideMoveHint'))).toBeHidden();
  });

  test('cancels an exit confirmation without leaving the current scene', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await enterFarmFromMenu(page);

    await page.getByRole('button', { name: IN_GAME_MENU }).click();
    await page.getByRole('button', { name: IN_GAME_MENU_EXIT }).click();
    await expect(page.getByText(getLabel('inGameMenuExitFarmBody'))).toBeVisible();
    await page.getByRole('button', { name: getLabel('cancel') }).click();
    await expect(page.getByRole('button', { name: getLabel('inGameMenuResume') })).toBeVisible();
    await page.getByRole('button', { name: getLabel('inGameMenuResume') }).click();
    await expect(page.getByRole('button', { name: IN_GAME_MENU })).toBeVisible();
  });

  test('opens Field Notes during farm dialogue and a Trial', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await enterFarmFromMenu(page);
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: FIELD_NOTES }).click();
    await expect(page.getByRole('heading', { name: FIELD_NOTES })).toBeVisible();
    await page.getByRole('button', { name: getLabel('codexClose') }).click();

    await page.getByRole('button', { name: IN_GAME_MENU }).click();
    await page.getByRole('button', { name: IN_GAME_MENU_EXIT }).click();
    await page.getByRole('button', { name: IN_GAME_MENU_EXIT }).click();
    await waitForMainMenu(page);
    await enableDevMode(page);
    await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
    await page.getByRole('button', { name: LEVEL_1_FIRST }).click();
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    const gotIt = page.getByRole('button', { name: getLabel('tutorialGotIt') });
    if (await gotIt.isVisible()) await gotIt.click();
    await page.getByRole('button', { name: FIELD_NOTES }).click();
    await expect(page.getByRole('heading', { name: FIELD_NOTES })).toBeVisible();
    await attachScreenshot(page, 'trial-field-notes');
  });
});
