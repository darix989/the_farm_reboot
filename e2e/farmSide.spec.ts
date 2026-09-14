import {
  attachScreenshot,
  ENTER_THE_FARM,
  FARM_SIDE_BACK_TO_MENU,
  FARM_SIDE_PORTAL_BACK_TO_ROAD,
  FARM_SIDE_PORTAL_GATE,
  SIDE_SCENE_OLD_POND,
  SIDE_SCENES_HEADING,
  TALK_TO_BRAM,
  TALK_TO_CASS,
  TALK_TO_DOT,
  TALK_TO_HETTY,
  seedLevel1Started,
  test,
  waitForMainMenu,
  walkUntilVisible,
} from './helpers';

test.describe('lateral farm scene', () => {
  test('jumps from the menu straight onto the old pond beside Hetty', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: SIDE_SCENES_HEADING }).click();
    await page.getByRole('button', { name: SIDE_SCENE_OLD_POND }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();
    await page.getByRole('button', { name: TALK_TO_HETTY }).waitFor();
    await attachScreenshot(page, 'farm-side-menu-jump-pond');
  });

  test('holding Shift keeps the talk prompt locatable by accessible name', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: SIDE_SCENES_HEADING }).click();
    await page.getByRole('button', { name: SIDE_SCENE_OLD_POND }).click();
    const prompt = page.getByRole('button', { name: TALK_TO_HETTY });
    await prompt.waitFor();
    await page.keyboard.down('Shift');
    await prompt.waitFor();
    await attachScreenshot(page, 'farm-side-shift-reveal-hetty');
    await page.keyboard.up('Shift');
    await prompt.waitFor();
  });

  test('boots the scene and shows the back button', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();
    await attachScreenshot(page, 'farm-side-scene');
  });

  test('walking right scrolls the road without leaving the main menu behind', async ({ page }) => {
    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
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

  test('walks through the gate to gateLane and back through the same gate', async ({ page }) => {
    // Three legs of walking, each polled rather than held for a fixed duration computed
    // from `PLAYER_SPEED` (so this stays correct whatever frame rate the runner actually
    // delivers) — but real time nonetheless, and slower again under parallel workers
    // contending for the GPU. Comfortably above Playwright's own factory default of 30s.
    test.setTimeout(150_000);

    await seedLevel1Started(page);
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: ENTER_THE_FARM }).click();
    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).waitFor();
    // First-visit spawn is beside Dot — wait for her prompt so Phaser keys exist before we walk.
    await page.getByRole('button', { name: TALK_TO_DOT }).waitFor();

    // Walk directly to the picket gate. Stopping at the barn and synthesizing a second held
    // key transition made this unnecessarily timing-sensitive on slow software-WebGL CI.
    // `walkUntilVisible` holds WASD because Linux CI drops arrow keyCodes.
    await walkUntilVisible(
      page,
      'ArrowRight',
      page.getByRole('button', { name: FARM_SIDE_PORTAL_GATE }),
    );

    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // gateLane's own entry portal disarms itself on arrival, and Bram (x=1600) is too
    // far from the ~x=360 spawn to be in range yet — walk over until his talk prompt
    // confirms his level actually loaded.
    await walkUntilVisible(page, 'ArrowRight', page.getByRole('button', { name: TALK_TO_BRAM }));
    await attachScreenshot(page, 'farm-side-gate-lane');

    // Walk back to the return gate and travel home through it.
    await walkUntilVisible(
      page,
      'ArrowLeft',
      page.getByRole('button', { name: FARM_SIDE_PORTAL_BACK_TO_ROAD }),
    );
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Cass stands west of the gate, past the combined talk/portal radii — walk left
    // until her prompt confirms the main road is back, not merely some `FarmSide` instance.
    await walkUntilVisible(page, 'ArrowLeft', page.getByRole('button', { name: TALK_TO_CASS }));
    await attachScreenshot(page, 'farm-side-back-on-road');

    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).click();
    await waitForMainMenu(page);
  });
});
