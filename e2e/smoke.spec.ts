import {
  attachScreenshot,
  CONTINUE,
  ENTER_THE_FARM,
  FIELD_NOTES,
  LEVEL_1_FIRST,
  test,
  waitForMainMenu,
  waitForOverlayChrome,
} from './helpers';

test.describe('boot and overlays', () => {
  test('boots to the main menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).waitFor();
    await page.getByRole('button', { name: FIELD_NOTES }).waitFor();
  });

  test('opens a Level 1 Trial from the menu', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: LEVEL_1_FIRST }).click();
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await attachScreenshot(page, 'trial-overlay');
  });

  test('enters the farm into Dot intro talk', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
    // First farm visit auto-opens Dot's greeting (TrialLayout, no canvas walking).
    await waitForOverlayChrome(page);
    await page.getByRole('button', { name: CONTINUE }).waitFor();
    await attachScreenshot(page, 'farm-intro-talk');
  });
});
