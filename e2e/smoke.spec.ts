import {
  ANIMATION_GALLERY,
  attachScreenshot,
  CONTINUE,
  DOT_INTRO_GREETING,
  FIELD_NOTES,
  LEVEL_1_FIRST,
  LEVEL_1_HEADING,
  MAIN_MENU_CONTINUE,
  MAIN_MENU_NEW_GAME,
  MAIN_MENU_SETTINGS,
  DEV_MODE_OFF,
  enableDevMode,
  enterFarmFromMenu,
  expect,
  seedLevel1Started,
  test,
  waitForMainMenu,
  waitForOverlayChrome,
} from './helpers';

test.describe('boot and overlays', () => {
  test('boots to the main menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: MAIN_MENU_NEW_GAME }).waitFor();
    await page.getByRole('button', { name: MAIN_MENU_SETTINGS }).waitFor();
    await expect(page.getByRole('button', { name: ANIMATION_GALLERY })).toHaveCount(0);
  });

  test('shows Continue when saved progress exists', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: MAIN_MENU_CONTINUE }).waitFor();
  });

  test('opens a Level 1 Trial from the menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await enableDevMode(page);
    await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
    await page.getByRole('button', { name: LEVEL_1_FIRST }).click();
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await attachScreenshot(page, 'trial-overlay');
  });

  test('opens Field Notes from developer settings', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: MAIN_MENU_SETTINGS }).click();
    await page.getByRole('button', { name: DEV_MODE_OFF }).click();
    await page.getByRole('button', { name: FIELD_NOTES }).click();
    await expect(page.getByRole('heading', { name: FIELD_NOTES })).toBeVisible();
  });

  test('enters the farm into Dot intro talk', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await enterFarmFromMenu(page);
    // First farm visit auto-opens Dot's greeting (TrialLayout, no canvas walking).
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await expect(page.getByText(DOT_INTRO_GREETING).first()).toBeVisible();
    await attachScreenshot(page, 'farm-intro-talk');
  });
});
