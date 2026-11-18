// Only this child process receives the isolated browser path. No npm/npx installs.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const [command = 'all', ...extra] = process.argv.slice(2);
const commands = ['all', 'chromium', 'firefox', 'webkit', 'verify', 'install', 'acceptance'];
if (!commands.includes(command)) {
  console.error(`Usage: node browser-tests/run.cjs ${commands.join('|')} [Playwright test options]`);
  process.exit(2);
}
const browsers = 'D:\\PlaywrightBrowsers';
if (!fs.existsSync('D:\\')) { console.error('D: is unavailable; no fallback directory will be used.'); process.exit(1); }
const base = process.env.BROWSER_TEST_BASE_URL || 'http://localhost:3020';
const url = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  console.error('This no-spend suite requires an existing LOCAL server.'); process.exit(2);
}
const resultDir = path.join(root, 'work', 'browser-compat', new Date().toISOString().replace(/[:.]/g, '-'));
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsers, PLAYWRIGHT_SKIP_BROWSER_GC: '1',
  BROWSER_TEST_BASE_URL: base, BROWSER_TEST_RESULT_DIR: resultDir };
let args;
if (command === 'verify') args = [path.join(__dirname, 'verify.cjs')];
else if (command === 'acceptance') args = [path.join(__dirname, 'acceptance.cjs'), ...extra];
else if (command === 'install') args = [require.resolve('playwright/cli'), 'install', 'chromium', 'firefox', 'webkit'];
else args = [require.resolve('@playwright/test/cli'), 'test', '--config', path.join(__dirname, 'playwright.config.cjs'),
  ...(command === 'all' ? [] : ['--project', command]), ...extra];
const before = ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'playwright.a1.config.ts']
  .map(file => [file, fs.readFileSync(path.join(root, file))]);
console.log(`Playwright ${require('@playwright/test/package.json').version}; child cache: ${browsers}`);
console.log(`Existing server: ${base}; results: ${resultDir}; no server start/stop.`);
const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
let changed = false;
for (const [file, bytes] of before) {
  if (!bytes.equals(fs.readFileSync(path.join(root, file)))) { console.error(`PROTECTED FILE CHANGED: ${file}`); changed = true; }
}
if (result.error) console.error(result.error.message);
process.exit(changed ? 1 : result.status ?? 1);
