import { spawn } from 'node:child_process';

const env = { ...process.env };
// Playwright controls child color settings. Remove conflicting inherited flags, not warnings.
delete env.NO_COLOR;
delete env.FORCE_COLOR;
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.a1.config.ts', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
