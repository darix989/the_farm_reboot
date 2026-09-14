import {
  attachScreenshot,
  ANIMATION_GALLERY,
  CONTINUE,
  DOT_INTRO_GREETING,
  ENTER_THE_FARM,
  FIELD_NOTES,
  LEVEL_1_FIRST,
  LEVEL_1_HEADING,
  MAIN_MENU_PROGRESS,
  expect,
  test,
  waitForMainMenu,
  waitForOverlayChrome,
} from './helpers';

test.describe('boot and overlays', () => {
  test('boots to the main menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).waitFor();
    await page.getByRole('button', { name: ANIMATION_GALLERY }).waitFor();
    await page.getByRole('button', { name: MAIN_MENU_PROGRESS }).waitFor();
  });

  test('opens a Level 1 Trial from the menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
    await page.getByRole('button', { name: LEVEL_1_FIRST }).click();
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await attachScreenshot(page, 'trial-overlay');
  });

  test('opens Field Notes from Progress & Settings', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: MAIN_MENU_PROGRESS }).click();
    await page.getByRole('button', { name: FIELD_NOTES }).click();
    await expect(page.getByRole('heading', { name: FIELD_NOTES })).toBeVisible();
  });

  test('enters the farm into Dot intro talk', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
    // First farm visit auto-opens Dot's greeting (TrialLayout, no canvas walking).
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await expect(page.getByText(DOT_INTRO_GREETING).first()).toBeVisible();
    await attachScreenshot(page, 'farm-intro-talk');
  });
});
