const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.EXPLORE_BASE_URL || 'http://127.0.0.1:3020';
const outputDir = process.env.EXPLORE_OUTPUT_DIR || 'C:/Users/23242/Documents/Codex/2026-11-07/ni/outputs/explore-v8-continuation';
const expectedStages = ['dust', 'tree', 'site', 'street', 'building', 'activate'];
const expectedProgress = [0, 0.22, 0.42, 0.58, 0.78, 1];
const result = { startedAt: new Date().toISOString(), baseUrl, browsers: {}, routes: [], failures: [] };

function record(name, detail = {}) { result.failures.push({ name, ...detail }); }

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: process.env.EXPLORE_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu'] : [],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } } });
  const page = await context.newPage();
  const errors = [];
  const badRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text().slice(0, 400)); });
  page.on('requestfailed', request => { const failure = request.failure()?.errorText; if (failure && !failure.includes('ERR_ABORTED')) badRequests.push({ url: request.url(), failure }); });

  const desktop = result.browsers.chromium = { checks: [], errors, badRequests };
  const captureCity = async file => {
    await page.evaluate(() => document.querySelector('.city-formation')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.join(outputDir, file), fullPage: false, timeout: 60000 });
  };
  const check = async (name, operation) => {
    try { desktop.checks.push({ name, status: 'running' }); await operation(); desktop.checks[desktop.checks.length - 1].status = 'passed'; }
    catch (error) { const entry = desktop.checks[desktop.checks.length - 1]; entry.status = 'failed'; entry.error = String(error.message).slice(0, 800); record(name, { error: entry.error }); }
  };

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('.city-formation canvas')?.dataset.rendered === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  desktop.version = browser.version();
  desktop.renderer = await page.locator('.city-formation canvas').getAttribute('data-renderer');
  desktop.startingStage = await page.locator('.city-formation canvas').getAttribute('data-city-stage');
  desktop.startingProgress = await page.locator('.city-formation canvas').getAttribute('data-city-progress');
  desktop.renderFps = await page.locator('.city-formation canvas').evaluate(async canvas => {
    const start = Number(canvas.dataset.cityFrame || 0);
    await new Promise(resolve => setTimeout(resolve, 2500));
    return Math.round((Number(canvas.dataset.cityFrame || start) - start) / 2.5);
  });
  await page.screenshot({ path: path.join(outputDir, 'explore-home-desktop.png'), fullPage: false });
  await captureCity('explore-city-desktop.png');

  await check('首页首帧从微尘章节开始', async () => {
    if (desktop.startingStage !== 'dust') throw new Error(`默认场景=${desktop.startingStage}`);
    if (!(await page.locator('.city-atlas-card').nth(0).getAttribute('aria-pressed') === 'true')) throw new Error('第一章应默认选中');
  });
  await check('真实城市视频底图与 WebGL 合成', async () => {
    const scene = await page.locator('.city-observatory').evaluate(el => {
      const canvas = el.querySelector('.city-formation canvas');
      const stage = canvas?.closest('.scene-stage');
      return { background: getComputedStyle(el).backgroundImage, stageBackground: stage && getComputedStyle(stage).backgroundColor, transparent: canvas?.getContext('webgl2')?.getContextAttributes()?.alpha ?? canvas?.getContext('webgl')?.getContextAttributes()?.alpha };
    });
    desktop.composite = scene;
    if (!scene.background.includes('/media/golden-hour.jpg')) throw new Error(`城市背景图未应用：${scene.background}`);
    if (scene.transparent !== true) throw new Error('WebGL Canvas 未开启透明合成');
  });
  await check('六个章节卡依次驱动城市生成阶段', async () => {
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const card = page.locator('.dust-story-steps button').nth(i);
      await card.click();
      await page.evaluate(() => document.querySelector('.city-formation')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await page.waitForFunction(() => document.querySelector('.city-formation canvas')?.dataset.rendered === 'true', null, { timeout: 30000 });
      await page.waitForFunction(target => Math.abs(Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress ?? -1) - target) < .01, expectedProgress[i], { timeout: 30000 });
      const active = await card.getAttribute('aria-current');
      const stage = await page.locator('.city-formation canvas').getAttribute('data-city-stage');
      const target = Number(await page.locator('#city-formation').inputValue());
      const progress = Number(await page.locator('.city-formation canvas').getAttribute('data-city-progress'));
      rows.push({ index: i, active, target, progress, stage });
      if (active !== 'step' || stage !== expectedStages[i] || Math.abs(target - expectedProgress[i]) > .01 || Math.abs(progress - expectedProgress[i]) > .06) throw new Error(`第 ${i + 1} 生成阶段：${JSON.stringify(rows.at(-1))}`);
      if (i === 0) await captureCity('explore-particles.png');
      if (i === 1) await captureCity('explore-tree.png');
      if (i === 2) await captureCity('explore-site.png');
      if (i === 3) await captureCity('explore-streets.png');
      if (i === 4) await captureCity('explore-buildings.png');
      if (i === 5) await captureCity('explore-city-life.png');
    }
    desktop.stageSelections = rows;
  });
  await check('六个城市主题切换设施、光照与镜头', async () => {
    desktop.themes = [];
    for (let i = 0; i < 6; i++) {
      await page.locator('.city-atlas-card').nth(i).click();
      await page.evaluate(() => document.querySelector('.city-formation')?.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await page.waitForFunction(index => document.querySelector('.city-formation canvas')?.dataset.cityTheme === String(index) && Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress) > .98, i, { timeout: 30000 });
      desktop.themes.push({ index: i, theme: await page.locator('.city-formation').getAttribute('data-theme'), time: await page.locator('.city-formation').getAttribute('data-time'), camera: await page.locator('.city-formation canvas').getAttribute('data-camera-position') });
      await captureCity(`explore-theme-${i + 1}.png`);
      if (i === 5) {
        const canvas = page.locator('.city-formation canvas');
        const before = await canvas.getAttribute('data-camera-position');
        const bounds = await canvas.boundingBox();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, -900);
        await page.waitForTimeout(650);
        const after = await canvas.getAttribute('data-camera-position');
        const distance = position => Math.hypot(...position.split(',').map(Number));
        desktop.cityCloseup = { before, after, distanceBefore: distance(before), distanceAfter: distance(after) };
        if (!(desktop.cityCloseup.distanceAfter < desktop.cityCloseup.distanceBefore - .5)) throw new Error(`城市近景滚轮缩放未生效：${JSON.stringify(desktop.cityCloseup)}`);
        await captureCity('explore-city-closeup.png');
      }
    }
  });
  await check('车辆和道路资源加载', async () => {
    const checks = await page.evaluate(async () => {
      const paths = ['/models/urban-vegetation/UrbanTree_Master.glb', '/models/city-studies/vehicle-sedan.glb', '/models/city-studies/vehicle-taxi.glb', '/models/city-studies/vehicle-bus.glb', '/media/golden-hour.mp4', '/media/quiet-dawn.jpg', '/media/still-water.jpg', '/media/deep-woods.jpg', '/media/avatars/business.png', '/media/avatars/city.png', '/media/avatars/student.png'];
      const responses = await Promise.all(paths.map(async path => ({ path, status: (await fetch(path, { method: 'HEAD' })).status })));
      return responses;
    });
    desktop.assets = checks;
    const failed = checks.filter(item => item.status !== 200);
    if (failed.length) throw new Error(JSON.stringify(failed));
  });
  await check('三张角色卡选择对应身份', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('.role-preview-grid').scrollIntoViewIfNeeded();
    const initialCanvasCount = await page.locator('.role-preview .avatar-stage canvas').count();
    if (initialCanvasCount !== 0) throw new Error(`角色导览应使用静态场景图，实际创建了 ${initialCanvasCount} 个 WebGL 画布`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(outputDir, 'explore-roles-desktop.png') });
    const rows = [];
    for (const id of ['business', 'city', 'student']) {
      const card = page.locator(`.role-preview-${id}`);
      await card.click();
      await page.waitForFunction(id => document.querySelector(`.identity-unit[data-character="${id}"] .identity-card`)?.classList.contains('selected'), id);
      rows.push({ id, selected: true, href: await page.evaluate(() => location.hash) });
    }
    await page.locator('#identities').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#identities .identity-card.selected .avatar-stage[data-ready="true"] canvas') !== null, null, { timeout: 45000 });
    const previewCanvasCount = await page.locator('.role-preview .avatar-stage canvas').count();
    const identityCanvasCount = await page.locator('#identities .avatar-stage canvas').count();
    if (previewCanvasCount !== 0) throw new Error(`角色导览创建了 ${previewCanvasCount} 个画布`);
    if (identityCanvasCount !== 1) throw new Error(`当前身份视角应有 1 个画布，实际 ${identityCanvasCount}`);
    desktop.roles = rows;
    desktop.rolePreviewCanvasCount = previewCanvasCount;
    desktop.identityCanvasCountAfterRoleSelection = identityCanvasCount;
  });

  await check('播放城市故事实际推进六秒动画', async () => {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const formation = page.locator('.city-formation');
    await formation.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.city-formation canvas')?.dataset.rendered === 'true');
    await page.locator('.research-actions').getByRole('link', { name: /观看城市生长之旅/ }).click();
    const frames = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(850);
      frames.push({ stage: await page.locator('.city-formation canvas').getAttribute('data-city-stage'), progress: Number(await page.locator('.city-formation canvas').getAttribute('data-city-progress')) });
    }
    desktop.storyPlayback = frames;
    if (frames[0].progress > .2 || frames.at(-1).progress < .9) throw new Error(`生长进度异常：${JSON.stringify(frames)}`);
    desktop.cityLifeFps = await page.locator('.city-formation canvas').evaluate(async canvas => {
      const start = Number(canvas.dataset.cityFrame || 0);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return Math.round((Number(canvas.dataset.cityFrame || start) - start) / 2);
    });
    if (desktop.cityLifeFps < 30) throw new Error(`完整城市阶段帧率低于 30 FPS：${desktop.cityLifeFps}`);
  });

  await check('学术档案与行为沙盘过渡路径有效', async () => {
    const links = await page.locator('.explore-handoff-actions a').evaluateAll(items => items.map(link => ({ text: link.textContent.trim(), href: link.getAttribute('href') })));
    for (const item of links) {
      const response = await context.request.get(new URL(item.href, baseUrl).toString());
      result.routes.push({ name: item.text, href: item.href, status: response.status() });
      if (response.status() >= 400) throw new Error(`${item.href} 返回 ${response.status()}`);
    }
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.querySelector('.explore-handoff')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(outputDir, 'explore-academic-handoff.png'), fullPage: false, timeout: 60000 });
  });

  await check('移动端无横向溢出且主题卡可操作', async () => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const widths = [];
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 375 ? 844 : 1000 });
      await page.waitForTimeout(180);
      widths.push(await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })));
    }
    desktop.responsiveWidths = widths;
    const overflow = widths.filter(item => item.scroll > item.viewport + 1);
    if (overflow.length) throw new Error(`页面横向溢出 ${JSON.stringify(overflow)}`);
    await page.setViewportSize({ width: 375, height: 844 });
    await page.locator('.city-atlas-card').nth(3).click();
    if (await page.locator('.city-atlas-card').nth(3).getAttribute('aria-pressed') !== 'true') throw new Error('移动端主题选择没有生效');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, 'explore-home-mobile.png'), fullPage: false });
  });
  await check('札记六主题与知识卡翻转真实可用', async () => {
    const seen = [];
    for (let i = 0; i < 6; i++) {
      await page.locator('.notebook-tabs button').nth(i).click();
      const before = await page.locator('.notebook-reader blockquote').innerText();
      await page.getByRole('button', { name: '下一条城市札记' }).click();
      const after = await page.locator('.notebook-reader blockquote').innerText();
      if (before === after) throw new Error(`第 ${i + 1} 组札记未翻页`);
      seen.push({ category: i, content: after });
    }
    desktop.notebook = seen;
    const flip = page.locator('.scope-flip').first();
    await flip.click();
    await page.mouse.move(0, 0);
    if (await flip.getAttribute('data-flipped') !== 'true') throw new Error('知识卡未保持翻转');
    await page.locator('#boundaries').screenshot({ path: path.join(outputDir, 'explore-knowledge-flip.png') });
    await page.locator('.explore-notebook').screenshot({ path: path.join(outputDir, 'explore-notebook.png') });
  });

  await check('关键网站路由仍可访问', async () => {
    for (const route of ['/learn', '/simulator', '/city-studies', '/citylight/studio']) {
      const response = await context.request.get(new URL(route, baseUrl).toString());
      result.routes.push({ route, status: response.status() });
      if (response.status() >= 400) throw new Error(`${route} 返回 ${response.status()}`);
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const anchors = await page.locator('main a[href]').evaluateAll(items => items.map(link => ({ text: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), href: link.getAttribute('href') })).filter(item => item.href));
  desktop.mainLinks = anchors;
  await page.evaluate(async () => {
    const sections = ['#home', '#city-journey', '.explore-roles', '.explore-handoff', '#boundaries', '#identities'];
    for (const selector of sections) {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(resolve => setTimeout(resolve, 450));
    }
  });
  await page.locator('#identities').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#identities .identity-card.selected .avatar-stage canvas') !== null, null, { timeout: 45000 });
  const selectedIdentity = await page.locator('#identities .identity-unit').filter({ has: page.locator('.identity-card.selected') }).getAttribute('data-character');
  const identityCanvasCount = await page.locator('#identities .avatar-stage canvas').count();
  if (identityCanvasCount !== 1) throw new Error(`身份轮播同时创建了 ${identityCanvasCount} 个 WebGL 画布`);
  desktop.identityCanvasCount = identityCanvasCount;
  desktop.selectedIdentity = selectedIdentity;
  await page.locator('#identities').screenshot({ path: path.join(outputDir, 'explore-identities.png') });
  await page.locator('.explore-journey').screenshot({ path: path.join(outputDir, 'explore-journey.png') });
  await page.locator('.explore-notebook').screenshot({ path: path.join(outputDir, 'explore-notebook-full.png') });
  await page.locator('#boundaries').screenshot({ path: path.join(outputDir, 'explore-boundaries.png') });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, 'explore-full-page-capture.png'), fullPage: true, animations: 'disabled' });
  await context.close();
  desktop.video = await page.video().path();
  await browser.close();
  desktop.errorCount = errors.length;
  desktop.requestFailureCount = badRequests.length;
  result.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outputDir, 'explore-v8-acceptance.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
})().catch(error => { result.fatal = error.stack || String(error); fs.mkdirSync(outputDir, { recursive: true }); fs.writeFileSync(path.join(outputDir, 'explore-v8-acceptance.json'), JSON.stringify(result, null, 2)); console.error(result.fatal); process.exitCode = 1; });
