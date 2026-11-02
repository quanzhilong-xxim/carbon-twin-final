import { test, expect } from '@playwright/test';
import { startWorkerServer } from './helpers/workerServer';
import type {} from './helpers/browserHarness';

test('real Chrome module Worker: computation, forced termination, replay and cleanup', async ({ page }) => {
  const server = await startWorkerServer();
  const errors: string[] = [], recoveryLogs: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.text().startsWith('[Worker Self-Healing]')) recoveryLogs.push(message.text());
  });
  try {
    await page.goto(server.url); await page.waitForFunction(() => Boolean(window.__a1));
    await page.evaluate(() => window.__a1.start());
    await expect.poll(() => page.evaluate(() => window.__a1.status().status)).toBe('READY');
    await page.evaluate(() => window.__a1.calculate(15));
    await expect.poll(() => page.evaluate(() => window.__a1.data().revision)).toBe(1);
    const data = await page.evaluate(() => window.__a1.data());
    expect(data.raw.value).toBe(15); expect(data.normalized.value).toBeCloseTo(1 / (1 + Math.exp(-1.45)), 12);
    expect(await page.evaluate(() => window.__a1.machine().state)).toBe('IDLE');
    await page.evaluate(() => { window.__a1.block(true); window.__a1.calculate(88); window.__a1.block(false); window.__a1.kill(); });
    const killedAt = Date.now();
    await expect.poll(() => page.evaluate(() => window.__a1.data().raw.value)).toBe(88);
    expect(await page.evaluate(() => window.__a1.status().generation)).toBe(2);
    expect(await page.evaluate(() => window.__a1.workerCount())).toBe(2);
    expect(recoveryLogs).toHaveLength(1);
    console.log('[REAL WORKER]', JSON.stringify({ raw: 88, generation: 2, observationMs: Date.now() - killedAt, recoveryLogs }));
    await page.evaluate(() => window.__a1.stop());
    expect(await page.evaluate(() => window.__a1.status().status)).toBe('STOPPED');
    await page.evaluate(() => window.__a1.start());
    await expect.poll(() => page.evaluate(() => window.__a1.status().status)).toBe('READY');
    expect(await page.evaluate(() => window.__a1.status().generation)).toBe(3);
    await page.evaluate(() => window.__a1.stop());
    expect(errors).toEqual([]);
  } finally { await page.close(); await server.close(); }
});
