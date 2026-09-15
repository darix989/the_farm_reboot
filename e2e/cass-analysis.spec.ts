import type { Page } from '@playwright/test';
import getLabel from '../src/data/labels';
import { expect, LEVEL_1_HEADING, test, waitForMainMenu, waitForOverlayChrome } from './helpers';

async function expectAnalysisClosed(page: Page) {
  await expect(page.locator('[data-tutorial-analysis-action="close"]')).toHaveCount(0);
}

test('Cass reveals analysis at round 5 and persists it for other encounters', async ({ page }) => {
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
  await expect(analyze).toHaveCount(0);
  await next.click();
  await expect(wizard).toContainText('When I first spoke at the Public Farm');
  await expect(analyze).toHaveCount(0);

  await page.locator('[data-debate-log-toggle-panel]').click();
  await page.locator('[data-debate-log-toggle-expand-round-id="round-1"]').click();
  const earlierAnalysis = page.locator('[data-debate-log-analyze-round-id="round-1"]');
  await expect(earlierAnalysis).toHaveCount(0);
  await page.keyboard.press('a');
  await expectAnalysisClosed(page);

  await next.click();
  await expect(wizard).toContainText('There is a name for that trick');
  await expect(analyze).toHaveCount(0);
  await next.click();
  await gotIt.click();
  await expect(wizard).toContainText('Here is my claim');
  await expect(analyze).toHaveCount(0);
  await page.locator('[data-tutorial-interactive-option-id="r3-opt-a"]').click();
  await next.click();
  await expect(wizard).toContainText('You are a fox');
  await expect(analyze).toHaveCount(0);
  await next.click();
  await expect(wizard).toContainText('One look at the tail');
  await expect(analyze).toHaveCount(0);
  await next.click();
  await expect(wizard).toContainText('Notice how easily we lost sight of the inspection');
  await expect(analyze).toHaveCount(0);
  await expect(earlierAnalysis).toHaveCount(0);

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

  const savedCodex = await page.evaluate(() => localStorage.getItem('the-farm-codex'));
  expect(JSON.parse(savedCodex!).state.unlockedFeatures).toContain('analysis');
  // The shared fixture clears saves on navigation; restore this actual saved value to
  // verify hydration and another encounter without having to finish Cass's lesson.
  await page.addInitScript((saved) => localStorage.setItem('the-farm-codex', saved!), savedCodex);
  await page.reload();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
  await page.getByRole('button', { name: getLabel('level1HettyBarrage') }).click();
  await waitForOverlayChrome(page);
  await expect(analyze).toBeVisible();
});

for (const encounter of ['level1BramDialog', 'level1HettyBarrage'] as const) {
  test(`hides analysis before Cass's tutorial in ${encounter}`, async ({ page }) => {
    await page.goto('/');
    await waitForMainMenu(page);
    await page.getByRole('button', { name: LEVEL_1_HEADING }).click();
    await page.getByRole('button', { name: getLabel(encounter) }).click();
    await waitForOverlayChrome(page);
    await expect(page.locator('[data-tutorial-interactive-action="analyze"]')).toHaveCount(0);
    await page.keyboard.press('a');
    await expectAnalysisClosed(page);
    if (encounter === 'level1HettyBarrage') {
      await page.getByRole('button', { name: getLabel('tutorialGotIt') }).click();
      const next = page.locator('[data-tutorial-interactive-action="continue"]');
      await next.click();
      // A menu preview must not require a hidden control to advance its first round.
      await expect(next).toBeEnabled();
      await page.locator('[data-debate-log-toggle-panel]').click();
      await page.locator('[data-debate-log-toggle-expand-round-id="round-1"]').click();
      await expect(page.locator('[data-debate-log-analyze-round-id]')).toHaveCount(0);
    }
  });
}
