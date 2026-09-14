import { test as base, type Locator, type Page } from '@playwright/test';
import getLabel from '../src/data/labels';

export const GAME_TITLE = getLabel('gameTitle');
export const ENTER_THE_FARM = getLabel('enterTheFarm');
export const ANIMATION_GALLERY = getLabel('animationGallery');
export const SIDE_SCENES_HEADING = getLabel('sideScenesHeading');
export const SIDE_SCENE_OLD_POND = getLabel('sideSceneOldPond');
export const FIELD_NOTES = getLabel('codexOpen');
export const LEVEL_1_HEADING = getLabel('level1Heading');
export const LEVEL_1_FIRST = getLabel('level1BramDialog');
export const MAIN_MENU_PROGRESS = getLabel('mainMenuProgressSettings');
export const CONTINUE = getLabel('continue');
export const FARM_SIDE_BACK_TO_MENU = getLabel('farmSideBackToMenu');
export const TALK_TO_DOT = getLabel('farmTalkPrompt', { replacements: { name: 'Dot' } });
export const TALK_TO_CASS = getLabel('farmTalkPrompt', { replacements: { name: 'Cass' } });
export const TALK_TO_BRAM = getLabel('farmTalkPrompt', { replacements: { name: 'Bram' } });
export const TALK_TO_HETTY = getLabel('farmTalkPrompt', { replacements: { name: 'Hetty' } });
export const FARM_SIDE_PORTAL_BARN = getLabel('farmSidePortalBarn');
export const FARM_SIDE_PORTAL_GATE = getLabel('farmSidePortalGate');
export const FARM_SIDE_PORTAL_BACK_TO_ROAD = getLabel('farmSidePortalBackToRoad');
/** First-beat Dot greeting — case-insensitive so title-case tweaks in the label still match. */
export const DOT_INTRO_GREETING = /guardian of the farm/i;

/**
 * Wipe persisted zustand keys before any app script runs, so smokes always
 * start as a first visit (Dot's intro talk, no completed encounters).
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      window.localStorage.removeItem('the-farm-progress');
      window.localStorage.removeItem('the-farm-codex');
      window.localStorage.removeItem('the-farm-dev-settings');
    });
    await use(context);
  },
});

export { expect } from '@playwright/test';

/** Boot + Preloader + first playable scene — wait for menu copy, not `<canvas>`. */
export async function waitForMainMenu(page: Page): Promise<void> {
  await page.getByRole('heading', { name: GAME_TITLE, level: 1 }).waitFor({
    timeout: 60_000,
  });
}

/**
 * Skip Dot's auto-open intro so walking smokes can reach the road. Must run before
 * `page.goto` — the suite fixture already wipes progress, and this writes the started
 * flag on top of that wipe.
 */
export async function seedLevel1Started(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'the-farm-progress',
      JSON.stringify({
        state: { completedScenarios: [], completedTutorials: [], level1Started: true },
        version: 8,
      }),
    );
  });
}

/** Shared TrialLayout Dialog panel — debates and farm talks both mount it. */
export async function waitForOverlayChrome(page: Page): Promise<void> {
  await page.locator('[data-tutorial-panel="wizard"]').waitFor({ timeout: 60_000 });
}

export async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(name, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
}

const WASD: Record<'ArrowLeft' | 'ArrowRight', 'a' | 'd'> = {
  ArrowLeft: 'a',
  ArrowRight: 'd',
};

/**
 * Hold a walk key until `locator` is visible.
 *
 * Linux CI is the load-bearing case: Phaser keys on `keyCode`, and Playwright's
 * ArrowLeft/ArrowRight events often arrive with `keyCode` 0 there, so the cursor
 * keys never go `isDown`. WASD (`a`/`d`) still carries a letter keyCode. A held
 * key (re-asserted every tick) also overlaps slow software-WebGL frames; a 200ms
 * tap can sit entirely between two updates and move nothing.
 */
export async function walkUntilVisible(
  page: Page,
  key: 'ArrowLeft' | 'ArrowRight',
  locator: Locator,
  timeout = 45_000,
): Promise<void> {
  const wasd = WASD[key];
  // Sky band, centre: no `pointer-events: auto` control. Focuses the canvas so
  // the next keydowns are not delivered only to a leftover overlay button.
  await page.mouse.click(960, 80);
  await page.keyboard.down(key);
  await page.keyboard.down(wasd);
  try {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await locator.isVisible()) return;
      await page.keyboard.down(key);
      await page.keyboard.down(wasd);
      await page.waitForTimeout(250);
    }
    await locator.waitFor({ timeout: 5_000 });
  } finally {
    await page.keyboard.up(wasd);
    await page.keyboard.up(key);
  }
}
