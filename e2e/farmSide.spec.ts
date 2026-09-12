import {
  attachScreenshot,
  ENTER_FARM_SIDE_PREVIEW,
  FARM_SIDE_BACK_TO_MENU,
  test,
  waitForMainMenu,
} from './helpers';

test.describe('lateral farm scene (iteration 1 preview)', () => {
  test('boots the scene and shows the back button', async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_FARM_SIDE_PREVIEW }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();
    await attachScreenshot(page, 'farm-side-scene');
  });

  test('walking right moves the debug walker without leaving the main menu behind', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_FARM_SIDE_PREVIEW }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();

    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(16);
    }
    await page.keyboard.up('ArrowRight');
    await attachScreenshot(page, 'farm-side-scene-scrolled');

    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).click();
    await waitForMainMenu(page);
  });
});
