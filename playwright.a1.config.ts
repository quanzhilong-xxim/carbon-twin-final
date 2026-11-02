import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__', testMatch: /.*\.(test|spec)\.ts/,
  fullyParallel: false, workers: 1, timeout: 20000,
  outputDir: './work/a1-test-results',
  reporter: [['list'], ['json', { outputFile: 'work/a1-test-results.json' }]],
  use: { browserName: 'chromium', launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
});
