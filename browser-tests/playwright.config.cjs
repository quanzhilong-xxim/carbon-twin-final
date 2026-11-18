const path = require('node:path');
const { defineConfig } = require('@playwright/test');
if (process.env.PLAYWRIGHT_BROWSERS_PATH !== 'D:\\PlaywrightBrowsers') {
  throw new Error('Use node browser-tests/run.cjs all (isolated child browser cache required).');
}
const results = process.env.BROWSER_TEST_RESULT_DIR;
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.cjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 15000 },
  outputDir: path.join(results, 'artifacts'),
  reporter: [['list'], ['json', { outputFile: path.join(results, 'results.json') }],
    ['html', { outputFolder: path.join(results, 'html'), open: 'never' }]],
  use: {
    baseURL: process.env.BROWSER_TEST_BASE_URL,
    headless: true,
    viewport: { width: 1365, height: 900 },
    actionTimeout: 15000,
    navigationTimeout: 60000,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({ name: browserName, use: { browserName } })),
  // Deliberately no webServer: never start, stop or restart the app.
});
