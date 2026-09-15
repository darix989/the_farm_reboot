import type { Locator, Page } from '@playwright/test';
import getLabel from '../src/data/labels';
import { expect, LEVEL_1_HEADING, test, waitForMainMenu, waitForOverlayChrome } from './helpers';

async function expectUnfocusable(button: Locator) {
  await expect(button).toBeDisabled();
  await button.evaluate((element: HTMLButtonElement) => element.focus());
  await expect(button).not.toBeFocused();
}

async function expectAnalysisClosed(page: Page) {
  await expect(page.locator('[data-tutorial-analysis-action="close"]')).toHaveCount(0);
}

test('Cass introduces analysis at round 5, including access through the log', async ({ page }) => {
  await page.goto('/');
  await waitForMainMenu(page);
  await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
  await page.getByRole('button', { name: getLabel('level1CassTeaches') }).click();
  await waitForOverlayChrome(page);

  const analyze = page.locator('[data-tutorial-interactive-action="analyze"]');
  const next = page.locator('[data-tutorial-interactive-action="continue"]');
  const wizard = page.locator('[data-tutorial-panel="wizard"]');
  const gotIt = page.getByRole('button', { name: getLabel('tutorialGotIt') });

  await gotIt.click();
  await expectUnfocusable(analyze);
  await next.click();
  await expect(wizard).toContainText('When I first spoke at the Public Farm');
  await expectUnfocusable(analyze);

  await page.locator('[data-debate-log-toggle-panel]').click();
  await page.locator('[data-debate-log-toggle-expand-round-id="round-1"]').click();
  const earlierAnalysis = page.locator('[data-debate-log-analyze-round-id="round-1"]');
  await expectUnfocusable(earlierAnalysis);
  await earlierAnalysis.evaluate((element: HTMLButtonElement) => element.click());
  await analyze.evaluate((element: HTMLButtonElement) => element.click());
  await page.keyboard.press('a');
  await expectAnalysisClosed(page);

  await next.click();
  await expect(wizard).toContainText('There is a name for that trick');
  await expectUnfocusable(analyze);
  await next.click();
  await gotIt.click();
  await expect(wizard).toContainText('Here is my claim');
  await expectUnfocusable(analyze);
  await page.locator('[data-tutorial-interactive-option-id="r3-opt-a"]').click();
  await next.click();
  await expect(wizard).toContainText('You are a fox');
  await expectUnfocusable(analyze);
  await next.click();
  await expect(wizard).toContainText('One look at the tail');
  await expectUnfocusable(analyze);
  await next.click();
  await expect(wizard).toContainText('Notice how easily we lost sight of the inspection');
  await expectUnfocusable(analyze);
  await expectUnfocusable(earlierAnalysis);

  await next.click();
  await expect(wizard).toContainText('Now we swap. I am Tobias');
  await expect(analyze).toBeEnabled();
  await expect(earlierAnalysis).toBeEnabled();
  await analyze.focus();
  await expect(analyze).toBeFocused();
  // The round-5 tutorial must allow the newly taught shortcut to open the modal.
  await page.keyboard.press('a');
  await expect(page.locator('[data-tutorial-analysis-sentence-id="s-r5-2"]')).toBeVisible();
  await gotIt.click();
  await page.locator('[data-tutorial-analysis-action="close"]').click();
  // Advancing rounds collapses previous log cards; reopen the history before using it.
  await page.locator('[data-debate-log-toggle-expand-round-id="round-1"]').click();
  await earlierAnalysis.click();
  await expect(page.locator('[data-tutorial-analysis-sentence-id="s-r1-1"]')).toBeVisible();
});
