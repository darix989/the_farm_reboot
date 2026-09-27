import { test as base, type Page } from '@playwright/test';
import getLabel from '../src/data/labels';

export const GAME_TITLE = getLabel('gameTitle');
export const MAIN_MENU_CONTINUE = getLabel('mainMenuContinue');
export const MAIN_MENU_NEW_GAME = getLabel('mainMenuNewGame');
export const MAIN_MENU_NEW_GAME_CONFIRM = getLabel('newGameConfirmAction');
export const MAIN_MENU_SETTINGS = getLabel('mainMenuProgressSettings');
export const DEV_MODE_OFF = getLabel('devModeToggle', {
  replacements: { state: getLabel('devFarmTalkSkipOff') },
});
export const ANIMATION_GALLERY = getLabel('animationGallery');
export const SIDE_SCENES_HEADING = getLabel('sideScenesHeading');
export const SIDE_SCENE_OLD_POND = getLabel('sideSceneOldPond');
export const FIELD_NOTES = getLabel('codexOpen');
export const LEVEL_1_HEADING = getLabel('level1Heading');
export const LEVEL_1_FIRST = getLabel('level1BramDialog');
export const CONTINUE = getLabel('continue');
export const IN_GAME_MENU = getLabel('inGameMenuOpen');
export const IN_GAME_MENU_EXIT = getLabel('inGameMenuExit');
export const FARM_SIDE_MOVE_HINT = getLabel('farmSideMoveHint');
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

/** Turn on the hidden authoring launcher, then return to its menu root. */
export async function enableDevMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: MAIN_MENU_SETTINGS }).click();
  await page.getByRole('button', { name: DEV_MODE_OFF }).click();
  await page.getByRole('button', { name: getLabel('mainMenuBack') }).click();
}

/** Continue a save when one exists; otherwise begin a fresh game and confirm the replacement. */
export async function enterFarmFromMenu(page: Page): Promise<void> {
  const continueButton = page.getByRole('button', { name: MAIN_MENU_CONTINUE });
  if (await continueButton.isVisible()) {
    await continueButton.click();
    return;
  }
  await page.getByRole('button', { name: MAIN_MENU_NEW_GAME }).click();
  await page.getByRole('button', { name: MAIN_MENU_NEW_GAME_CONFIRM }).click();
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

/**
 * Seed the `analysis` feature as unlocked, as if the player had already reached Cass's
 * round 5 tutorial. Must run before `page.goto` — the suite fixture wipes `the-farm-codex`
 * on every context, so this seed has to land on top of that wipe.
 */
export async function seedAnalysisUnlocked(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'the-farm-codex',
      JSON.stringify({
        state: {
          knownFallacies: [],
          spottedFallacies: [],
          dialogFlags: [],
          unlockedFeatures: ['analysis'],
          seenNoticeIds: null,
        },
        version: 4,
      }),
    );
  });
}

/** Shared TrialLayout Dialog panel — debates and farm talks both mount it. */
export async function waitForOverlayChrome(page: Page): Promise<void> {
  await page.locator('[data-tutorial-panel="wizard"]').waitFor({ timeout: 60_000 });
}

/**
 * Bram's lesson opens on a two-step intro. Step 1's button is Continue — the same
 * accessible name as the disabled trial footer — so the click stays inside the dialog.
 * Step 2 is Got it.
 */
export async function dismissBramIntroTutorial(page: Page): Promise<void> {
  const intro = page.getByRole('dialog', {
    name: getLabel('tutorialDialogTitle', {
      replacements: { currentStep: 1, totalSteps: 2 },
    }),
  });
  await intro.waitFor();
  await intro.getByRole('button', { name: CONTINUE }).click();
  await page.getByRole('button', { name: getLabel('tutorialGotIt') }).click();
}

export async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(name, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
}

const WASD: Record<
  'ArrowLeft' | 'ArrowRight',
  { key: 'a' | 'd'; code: 'KeyA' | 'KeyD'; keyCode: 65 | 68 }
> = {
  ArrowLeft: { key: 'a', code: 'KeyA', keyCode: 65 },
  ArrowRight: { key: 'd', code: 'KeyD', keyCode: 68 },
};

/** Phaser `KeyCodes.SPACE`. Same legacy `keyCode` path as WASD — Playwright's Space often arrives as 0 on Linux CI. */
const FARM_INTERACT_KEY = { key: ' ', code: 'Space', keyCode: 32 };

type FarmKeyInit = { key: string; code: string; keyCode: number };

async function dispatchFarmKey(
  page: Page,
  type: 'keydown' | 'keyup',
  key: FarmKeyInit,
): Promise<void> {
  await page.evaluate(
    ({ eventType, init }) => {
      const event = new KeyboardEvent(eventType, {
        key: init.key,
        code: init.code,
        bubbles: true,
        cancelable: true,
      });
      // Phaser 3.90 indexes its Key objects by legacy `keyCode`. Chromium's constructor
      // leaves that property at zero, so define the same values a physical key emits.
      Object.defineProperties(event, {
        keyCode: { value: init.keyCode },
        which: { value: init.keyCode },
      });
      window.dispatchEvent(event);
    },
    { eventType: type, init: key },
  );
}

/**
 * Hold a walk key until a button with this accessible name is on screen.
 *
 * Phaser 3.90 reads legacy `keyCode`, which Playwright's arrow events leave at 0 on
 * Linux CI, so the hold is a synthetic WASD event. Polling that from Playwright
 * freezes the page between checks and the next frame steps through a gate-sized
 * interact radius, so the watch runs on `requestAnimationFrame` and releases the
 * key before control returns to the test.
 */
export async function walkUntilVisible(
  page: Page,
  key: 'ArrowLeft' | 'ArrowRight',
  name: string,
  timeout = 45_000,
): Promise<void> {
  const wasd = WASD[key];
  try {
    const found = await page.evaluate(
      ({ init, timeoutMs, buttonName }) => {
        const dispatch = (eventType: 'keydown' | 'keyup') => {
          const event = new KeyboardEvent(eventType, {
            key: init.key,
            code: init.code,
            bubbles: true,
            cancelable: true,
          });
          Object.defineProperties(event, {
            keyCode: { value: init.keyCode },
            which: { value: init.keyCode },
          });
          window.dispatchEvent(event);
        };
        const deadline = performance.now() + timeoutMs;
        const target = buttonName.toLowerCase();
        const buttonVisible = () => {
          for (const button of document.querySelectorAll('button')) {
            const label = (button.getAttribute('aria-label') ?? '').toLowerCase();
            if (!label.includes(target)) continue;
            const style = getComputedStyle(button);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            const box = button.getBoundingClientRect();
            if (box.width > 0 && box.height > 0) return true;
          }
          return false;
        };
        const stop = (seen: boolean) => {
          // Release before yielding to Playwright. A key still down across that
          // round trip walks Rue out of the interact radius she just reached.
          dispatch('keyup');
          return seen;
        };
        dispatch('keydown');
        return new Promise<boolean>((resolve) => {
          const tick = () => {
            dispatch('keydown');
            if (buttonVisible()) {
              resolve(stop(true));
              return;
            }
            if (performance.now() >= deadline) {
              resolve(stop(false));
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { init: wasd, timeoutMs: timeout, buttonName: name },
    );
    if (!found) {
      await page.getByRole('button', { name }).waitFor({ timeout: 5_000 });
    }
  } finally {
    await dispatchFarmKey(page, 'keyup', wasd);
  }
}

/** Space, with an explicit `keyCode`, so a portal hop is not a no-op on Linux CI. */
export async function pressFarmInteract(page: Page): Promise<void> {
  await dispatchFarmKey(page, 'keydown', FARM_INTERACT_KEY);
  await dispatchFarmKey(page, 'keyup', FARM_INTERACT_KEY);
}
