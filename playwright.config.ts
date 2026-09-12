import { defineConfig } from '@playwright/test';

const PORT = 8080;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Chromium smokes against the Vite dev server. Viewport matches the 1920×1080
 * design stage so Scale.FIT does not letterbox. Reduced motion skips the
 * wizard typewriter so overlay waits stay deterministic.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    browserName: 'chromium',
    viewport: { width: 1920, height: 1080 },
    baseURL: BASE_URL,
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev-nolog',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
