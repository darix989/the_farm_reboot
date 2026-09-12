import {
  attachScreenshot,
  ENTER_THE_FARM,
  FARM_SIDE_BACK_TO_MENU,
  FARM_SIDE_PORTAL_BACK_TO_ROAD,
  FARM_SIDE_PORTAL_BARN,
  FARM_SIDE_PORTAL_GATE,
  TALK_TO_BRAM,
  TALK_TO_CASS,
  seedLevel1Started,
  test,
  waitForMainMenu,
} from './helpers';

test.describe('lateral farm scene', () => {
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

    // Walk right: barn door first (Dot is nearby but the portal wins on radius fraction),
    // then the picket gate (Cass stands where Hetty used to, same focus contest).
    await page.keyboard.down('ArrowRight');
    await page.getByRole('button', { name: FARM_SIDE_PORTAL_BARN }).waitFor({ timeout: 45_000 });
    await page.getByRole('button', { name: FARM_SIDE_PORTAL_GATE }).waitFor({ timeout: 45_000 });
    await page.keyboard.up('ArrowRight');

    // The config runs every e2e test under `prefers-reduced-motion: reduce`, so this hop
    // cuts straight through rather than fading — but `scene.scene.start()` still tears
    // down and rebuilds the scene (and its `Key` objects) across a real tick or two. A
    // held key's next `down` dispatched into that gap lands on no `Key` at all — nothing
    // is listening for it yet — and is silently lost for the rest of the hold, since
    // Playwright's synthetic input never repeats a `down` on its own. This settles that
    // race rather than racing the exact restart timing.
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // gateLane's own entry portal disarms itself on arrival, and Bram (x=1600) is too
    // far from the ~x=360 spawn to be in range yet — walk over until his talk prompt
    // confirms his level actually loaded.
    await page.keyboard.down('ArrowRight');
    await page.getByRole('button', { name: TALK_TO_BRAM }).waitFor({ timeout: 45_000 });
    await page.keyboard.up('ArrowRight');
    await attachScreenshot(page, 'farm-side-gate-lane');

    // Walk back to the return gate and travel home through it.
    await page.keyboard.down('ArrowLeft');
    await page
      .getByRole('button', { name: FARM_SIDE_PORTAL_BACK_TO_ROAD })
      .waitFor({ timeout: 45_000 });
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Cass stands close enough to the main road's gate that she's the only candidate
    // once the just-arrived portal disarms itself — confirms the main road is back,
    // not merely some `FarmSide` instance.
    await page.getByRole('button', { name: TALK_TO_CASS }).waitFor({ timeout: 15_000 });
    await attachScreenshot(page, 'farm-side-back-on-road');

    await page.getByRole('button', { name: FARM_SIDE_BACK_TO_MENU }).click();
    await waitForMainMenu(page);
  });
});
