// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8787';

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid local database lock issues
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Keep workers at 1 to prevent D1 database lock contention during concurrent test mutations
  reporter: [['list'], ['html']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 7'],
      },
    },
  ],

  // Run local webServer only if BASE_URL is not set (i.e., we are running tests locally)
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run db:init:local && npm run dev',
    url: 'http://127.0.0.1:8787/api/config', // Wait for the worker to respond
    reuseExistingServer: true,
    timeout: 120000,
  },
});
