import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local so JWT_SECRET and MONGODB_URI are available to the test process
// (needed for generating valid JWTs in auth fixtures)
dotenv.config({ path: path.join(__dirname, '../.env.local') });

/**
 * Auth state file — produced by auth.setup.ts and reused by all test projects.
 * Keeps the auth cookie alive across the whole test run.
 */
export const AUTH_STATE_PATH = path.join(__dirname, '.auth', 'user.json');

export default defineConfig({
  testDir: './tests',

  /* Auto-start the Next.js dev server before running tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    cwd: path.join(__dirname, '..'),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['list'],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL so we can use relative URLs like page.goto('/locations') */
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    /* Collect trace, screenshot, and video on failure */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    /* Default navigation timeout */
    navigationTimeout: 15_000,
    /* Default action timeout (clicks, fills, etc.) */
    actionTimeout: 10_000,
  },

  projects: [
    /**
     * 1. Auth setup — runs first, produces .auth/user.json with valid cookies.
     *    All other projects depend on this project.
     */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    /**
     * 2. Chromium — main test runner.
     *    Depends on 'setup' so .auth/user.json is available.
     */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },

    /**
     * 3. Firefox — optional secondary browser for CI.
     */
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_STATE_PATH,
      },
      dependencies: ['setup'],
    },
  ],

  /* Global test timeout */
  timeout: 30_000,
  /* Expect assertion timeout */
  expect: {
    timeout: 8_000,
  },

  /* Output directory for test artifacts */
  outputDir: '../test-results',
});
