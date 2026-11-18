import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'outputs/academic-archive');
const base = process.env.CHECK_URL ?? 'http://127.0.0.1:3020';
fs.mkdirSync(path.join(output, 'video'), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const results = [];
const pageErrors = [];
const failedRequests = [];
let modelResponse = null;
let videoPath = null;
const started = new Date().toISOString();

async function step(name, run) {
  const startedAt = Date.now();
  const detail = await run();
  results.push({ name, passed: true, durationMs: Date.now() - startedAt, detail });
}

function countLearningEvents(text) {
  return Number(text.match(/(\d+) 条持久记录/)?.[1] ?? 0);
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(output, 'video'), size: { width: 1440, height: 960 } },
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.url().endsWith('/models/research/CT_AcademicPlant_LOD.glb')) {
      modelResponse = { status: response.status(), contentLength: response.headers()['content-length'] ?? null };
    }
  });

  await step('本地学术档案页面可打开', async () => {
    const response = await page.goto(`${base}/learn`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    await expect(page.getByRole('heading', { name: /Read the science/ })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    return { url: page.url(), status: response.status(), title: await page.title() };
  });

  await step('桌面三维图书馆和植物 LOD 实际加载', async () => {
    await page.waitForFunction(() => document.querySelector('.scene-stage canvas')?.dataset.libraryReady === 'true', null, { timeout: 20000 });
    await expect.poll(() => modelResponse?.status, { timeout: 15000 }).toBe(200);
    const canvas = page.locator('.scene-stage canvas');
    await canvas.screenshot({ path: path.join(output, '02-library-canvas.png') });
    await page.mouse.move(1428, 948);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(output, '01-hero-desktop.png') });
    const png = await sharp(path.join(output, '02-library-canvas.png')).stats();
    const pixelVariance = png.channels.slice(0, 3).map(channel => channel.stdev);
    assert.ok(pixelVariance.some(value => value > 5), `Canvas screenshot appears blank: ${pixelVariance.join(', ')}`);
    await expect.poll(async () => Number(await canvas.getAttribute('data-fps') ?? 0), { timeout: 12000 }).toBeGreaterThan(0);
    const scene = await canvas.evaluate(element => ({
      width: element.width,
      height: element.height,
      drawCalls: Number(element.dataset.libraryDrawCalls),
      triangles: Number(element.dataset.libraryTriangles),
      fps: Number(element.dataset.fps || 0),
      rendererQuality: element.dataset.quality ?? null,
    }));
    assert.ok(scene.width > 0 && scene.height > 0);
    assert.ok(scene.drawCalls > 0 && scene.triangles > 0);
    return { ...scene, pixelVariance, model: modelResponse };
  });

  await step('三维书籍可点击并打开对应证据', async () => {
    const canvas = page.locator('.scene-stage canvas');
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    await page.mouse.click(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.59);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText('Unequivocal.');
    await dialog.getByRole('button', { name: '关闭文献' }).click();
    await expect.poll(() => page.locator('.citation-overlay').evaluate(element => getComputedStyle(element).opacity)).toBe('0');
    return { clickedRelativePoint: { x: 0.3, y: 0.59 }, source: 'Unequivocal.' };
  });

  await step('主题、检索、收藏、证据详情和关联阅读', async () => {
    const archive = page.locator('.research-register-v7');
    await archive.scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /理解碳排放/ }).click();
    const topicCount = Number(await page.locator('.research-current-count b').innerText());
    assert.ok(topicCount > 0 && topicCount < 50);

    const search = page.getByRole('searchbox', { name: '检索学术档案' });
    await search.fill('Scope 1');
    const searchCount = Number(await page.locator('.research-current-count b').innerText());
    assert.ok(searchCount > 0);
    await page.getByRole('button', { name: '重置筛选' }).click();

    const firstCard = page.locator('.archive-grid article').first();
    const title = await firstCard.locator('h2').innerText();
    const saveButton = firstCard.locator('.research-save-v7');
    await saveButton.click();
    await expect(saveButton).toHaveAttribute('aria-pressed', 'true');

    await firstCard.locator('.citation-badge').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText(title);
    await page.mouse.move(1428, 948);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, '04-citation-dialog.png') });
    const related = dialog.locator('.citation-related-v7 button').first();
    const relatedTitle = await related.locator('strong').innerText();
    await related.click();
    await expect(dialog.getByRole('heading', { level: 2 })).toContainText(relatedTitle);
    await page.evaluate(() => {
      window.__archiveEscapeSeen = false;
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') window.__archiveEscapeSeen = true;
      }, { capture: true, once: true });
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    const escapeState = await page.evaluate(() => ({
      keySeen: window.__archiveEscapeSeen,
      dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map(element => ({
        className: element.className,
        title: element.querySelector('h2')?.textContent?.trim() ?? null,
        opacity: getComputedStyle(element).opacity,
        rect: element.getBoundingClientRect().toJSON(),
      })),
      citationOverlay: document.querySelector('.citation-overlay') ? getComputedStyle(document.querySelector('.citation-overlay')).opacity : null,
      activeElement: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? null,
    }));
    assert.equal(escapeState.keySeen, true, 'Escape key did not reach the document');
    await expect.poll(() => page.evaluate(() => {
      const overlay = document.querySelector('.citation-overlay');
      return overlay ? getComputedStyle(overlay).opacity : '0';
    }), { timeout: 5000 }).toBe('0');
    escapeState.finalOverlayOpacity = await page.evaluate(() => {
      const overlay = document.querySelector('.citation-overlay');
      return overlay ? getComputedStyle(overlay).opacity : '0';
    });
    assert.equal(escapeState.activeElement, `阅读文献：${title}`, 'Focus was not returned to the citation opener');
    await page.screenshot({ path: path.join(output, '03-archive-desktop.png') });
    return { topicMatches: topicCount, searchMatches: searchCount, savedTitle: title, relatedTitle, escapeState };
  });

  await step('Scope 卡片仅在点击后写入学习记录', async () => {
    const progress = page.locator('.learning-progress small');
    const matchingAnchors = await page.locator('[id="scope-boundaries"]').count();
    assert.equal(matchingAnchors, 1, 'Scope section anchor must be unique');
    await page.locator('.scope-flips').scrollIntoViewIfNeeded();
    const first = page.locator('.scope-flip').first();
    const before = countLearningEvents(await progress.innerText());
    await first.hover();
    await page.waitForTimeout(400);
    const afterHover = countLearningEvents(await progress.innerText());
    assert.equal(afterHover, before);
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => countLearningEvents(await progress.innerText())).toBe(before + 1);
    return { before, afterHover, afterClick: countLearningEvents(await progress.innerText()) };
  });

  await step('移动端轻量回退和横向溢出检查', async () => {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', error => pageErrors.push(`mobile: ${error.message}`));
    const response = await mobile.goto(`${base}/learn`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(response?.status(), 200);
    await expect(mobile.getByRole('heading', { name: /Read the science/ })).toBeVisible();
    await mobile.waitForTimeout(1000);
    await mobile.screenshot({ path: path.join(output, '05-mobile-desktop-width.png') });
    await mobile.getByRole('region', { name: '可旋转的三维研究图书馆与地球' }).scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(500);
    const dimensions = await mobile.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      stageMode: document.querySelector('[aria-label="可旋转的三维研究图书馆与地球"]')?.getAttribute('data-mode') ?? null,
      fallbackVisible: Boolean(document.querySelector('.library-reading-fallback')?.getClientRects().length),
    }));
    assert.equal(dimensions.document > dimensions.viewport, false);
    assert.ok(dimensions.stageMode === 'lite' && dimensions.fallbackVisible, `Expected the explicit mobile reading fallback: ${JSON.stringify(dimensions)}`);
    await mobile.evaluate(() => document.querySelector('#archive')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    const archiveHeading = mobile.getByRole('heading', { name: '把问题，带到证据面前。' });
    await archiveHeading.scrollIntoViewIfNeeded();
    await expect(archiveHeading).toBeInViewport();
    await expect(mobile.locator('.research-current-count')).toBeVisible();
    await mobile.waitForTimeout(250);
    await mobile.screenshot({ path: path.join(output, '06-mobile-archive.png') });
    await mobileContext.close();
    return dimensions;
  });

  const resourceSummary = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return {
      resourceCount: resources.length,
      transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      largestLocalResources: resources
        .filter(entry => entry.name.startsWith(location.origin))
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 8)
        .map(entry => ({ path: new URL(entry.name).pathname, transferBytes: entry.transferSize || 0, durationMs: Math.round(entry.duration) })),
  };
  });
  await page.close();
  videoPath = await page.video().path();
  await context.close();

  assert.deepEqual(pageErrors, []);
  const report = {
    started,
    completed: new Date().toISOString(),
    base,
    browser: 'Playwright bundled Chromium (SwiftShader enabled for deterministic WebGL availability)',
    results,
    resources: resourceSummary,
    video: path.relative(root, videoPath).replaceAll('\\', '/'),
    pageErrors,
    failedRequests,
    overall: 'PASS',
  };
  fs.writeFileSync(path.join(output, 'acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {
    started,
    completed: new Date().toISOString(),
    base,
    results,
    pageErrors,
    failedRequests,
    overall: 'FAIL',
    failure: error instanceof Error ? error.stack : String(error),
  };
  fs.writeFileSync(path.join(output, 'acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
