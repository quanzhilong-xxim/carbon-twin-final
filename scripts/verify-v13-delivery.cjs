// Run one delivery module at a time. No paid API, camera, AI or voice calls.
const { chromium, firefox, webkit, expect: baseExpect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

const moduleName = process.env.CT_MODULE || 'pages';
const engine = process.env.CT_BROWSER || 'chromium';
const mobile = /^(1|true|yes)$/i.test(process.env.CT_MOBILE || '');
const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3099').replace(/\/$/, '');
const out = path.resolve(process.env.CT_EVIDENCE_DIR || `D:/CarbonTwin_Workspace/Test_Evidence/v13-delivery-${moduleName}-${engine}-${mobile ? 'mobile-' : ''}${Date.now()}`);
const expect = baseExpect.configure({ timeout: 60000 });
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
const report = {
  base, module: moduleName, engine, mobile, viewport, started: new Date().toISOString(),
  checks: [], errors: [], http: [], blockedApis: [], requestsFailed: [], screenshots: [],
  paidApisTested: false, cameraTested: false,
  boundary: 'All /api/ requests are blocked. These checks cover local website behavior, not paid AI, voice, Decart, live camera, physical mobile or actual Safari.',
  passed: false,
};
let browser, context, page;
const check = (name, data = true) => { report.checks.push({ name, data }); console.log(`PASS ${name}`); };
const snapshot = async (locator, name) => {
  const file = `${name}.png`;
  await page.mouse.move(1, 1);
  // Animated/responsive scene bounds need not become stable to remain usable.
  // Capture the actual viewport after the caller has made the scene visible;
  // locator.screenshot would scroll and wait for a stable box indefinitely.
  await expect(locator).toBeVisible();
  await page.screenshot({ path: path.join(out, file) });
  report.screenshots.push(file);
};
const noOverflow = async () => {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(dimensions.document <= dimensions.viewport + 1, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
  return dimensions;
};
const goto = async route => {
  const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert(response && response.status() === 200, `Document failed: ${route} ${response?.status()}`);
  return response;
};
const canvasState = canvas => canvas.evaluate(c => {
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) throw new Error('No WebGL context');
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return { ...c.dataset, lost: gl.isContextLost(), buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], glRenderer: String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) };
});
const realFrame = async canvas => {
  await expect(canvas).toBeVisible();
  await expect.poll(async () => Number(await canvas.getAttribute('data-scene-triangles'))).toBeGreaterThan(0);
  const state = await canvasState(canvas);
  assert(!state.lost && state.buffer.every(value => value > 0), 'Invalid WebGL drawing buffer');
  return state;
};
const range = async (selector, value) => {
  // Use the real range control's keyboard semantics, including its min and step.
  const input = page.locator(selector);
  await input.focus();
  await input.press('Home');
  const { min, step } = await input.evaluate(el => ({ min: Number(el.min), step: Number(el.step) || 1 }));
  for (let i = 0; i < Math.round((value - min) / step); i++) await input.press('ArrowRight');
  await expect(input).toHaveValue(String(value));
};

async function learning() {
  await goto('/learn#garment-journey');
  const study = page.locator('#garment-study');
  await expect(study).toBeVisible();
  const scene = study.locator('.scene-stage'), canvas = scene.locator('canvas');
  await scene.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-garment-ready', 'true');
  check('learning-real-tshirt-GLB-frame', await realFrame(canvas));
  assert(report.assets.some(asset => /\/models\/clothing\/tshirt\.glb(?:\?|$)/.test(asset.url) && asset.status === 200), 'No successful real T-shirt GLB response');
  await snapshot(scene, 'learning-tshirt');
  const stages = study.getByRole('group', { name: '服装生命周期阶段', exact: true }).getByRole('button');
  await expect(stages).toHaveCount(9);
  const stageNames = [];
  for (let i = 0; i < 9; i++) {
    const button = stages.nth(i), name = (await button.innerText()).replace(/^\d+\s*/, '').trim();
    stageNames.push(name);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(study.locator('.lifecycle-note h3')).toHaveText(name);
    await expect(study.locator('.lifecycle-note .section-kicker')).toContainText(`${i + 1} / 9`);
  }
  assert.equal(new Set(stageNames).size, 9);
  check('all-nine-distinct-lifecycle-stages', stageNames);
  await study.getByRole('button', { name: '展开核算所需数据', exact: true }).click();
  await expect(study.locator('.lifecycle-data-needs')).toContainText('未提供这些数据');
  check('lifecycle-data-boundary-expands');
  const fabrics = [['棉', 'cotton'], ['聚酯', 'polyester'], ['羊毛', 'wool'], ['牛仔斜纹', 'denim']];
  for (const [label, key] of fabrics) {
    await study.getByRole('group', { name: '织物结构观察预设', exact: true }).getByRole('button', { name: label, exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-fabric-study', key);
    await expect(canvas).toHaveAttribute('data-material-layers', 'true');
    await realFrame(canvas);
  }
  check('all-four-existing-fabric-presets', fabrics);
  for (const [i, name] of ['正面', '侧面', '背面'].entries()) {
    await study.getByRole('button', { name, exact: true }).click();
    await scene.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-garment-angle', String(i));
  }
  await study.getByRole('button', { name: '结构观察', exact: true }).click();
  const diagram = study.locator('.textile-diagram');
  await expect(diagram).toHaveAttribute('data-fabric', 'denim');
  await expect(diagram.locator('svg')).toBeVisible();
  for (const [i, label] of ['经纬织物', '加捻纱线', '纤维束'].entries()) {
    await diagram.getByRole('button', { name: new RegExp(label) }).click();
    await expect(diagram).toHaveAttribute('data-level', String(i));
    await expect(diagram.locator('svg')).toHaveAttribute('aria-label', new RegExp(label));
  }
  await expect(study.locator('.lifecycle-note h3')).toHaveText(stageNames[8]);
  check('structure-mode-three-scales-retains-material-and-stage', await diagram.evaluate(el => ({ ...el.dataset })));
  await snapshot(diagram, 'learning-structure');
  await study.getByRole('button', { name: '三维成衣', exact: true }).click();
  await scene.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-garment-ready', 'true');
  check('return-to-real-model-after-structure', await realFrame(canvas));
  check('learning-no-horizontal-overflow', await noOverflow());
}

async function supply() {
  await goto('/simulator#pasture-letter');
  const chapter = page.locator('#pasture-letter');
  await chapter.scrollIntoViewIfNeeded();
  const stages = chapter.getByRole('navigation', { name: '乳品四节点', exact: true }).getByRole('button');
  await expect(stages).toHaveCount(4);
  const nodeStates = [];
  for (let i = 0; i < 4; i++) {
    await stages.nth(i).click();
    await expect(chapter).toHaveAttribute('data-milk-stage', String(i));
    await expect(stages.nth(i)).toHaveAttribute('aria-pressed', 'true');
    const scene = chapter.locator('.story-pasture-scene .scene-stage');
    await scene.scrollIntoViewIfNeeded();
    const canvas = scene.locator('canvas');
    await expect(canvas).toHaveAttribute('data-story-scene', 'pasture');
    await expect(canvas).toHaveAttribute('data-story-state', String(i));
    nodeStates.push({ stage: i, frame: await realFrame(canvas), description: await chapter.locator('.story-controls h3').innerText() });
  }
  assert.equal(new Set(nodeStates.map(state => state.description)).size, 4);
  check('four-distinct-milk-nodes-real-3d', nodeStates);
  await range('#milk-consumption', 3);
  for (const loss of [0, 30]) {
    await range('#milk-loss', loss);
    const expected = (3 / (1 - loss / 100)).toFixed(2);
    await expect(chapter.locator('.story-live-strip strong')).toContainText(expected);
    check(`milk-upstream-formula-loss-${loss}`, { litres: 3, lossPercent: loss, expectedLitres: expected, actual: await chapter.locator('.story-live-strip strong').innerText() });
  }
  await expect(chapter).toContainText('这是物质量教学模型');
  await expect(chapter).toContainText('不把牛肉 27 kg CO₂e/kg 套给牛奶');
  await snapshot(chapter.locator('.story-split'), 'supply-milk-loss-30');
  const details = chapter.locator('details.story-method');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  const legacy = details.locator('#supply-chain');
  const nodes = legacy.getByRole('group', { name: '供应链八阶段', exact: true }).getByRole('button');
  await expect(nodes).toHaveCount(8);
  const names = [];
  for (let i = 0; i < 8; i++) {
    names.push(await nodes.nth(i).innerText());
    await nodes.nth(i).click();
    await expect(legacy.locator('.supply-story')).toHaveAttribute('data-story', String(i));
    await expect(nodes.nth(i)).toHaveAttribute('aria-pressed', 'true');
  }
  assert.equal(new Set(names).size, 8);
  const scene = legacy.locator('.scene-stage');
  await scene.scrollIntoViewIfNeeded();
  check('retained-eight-node-supply-chain-real-3d', { names, frame: await realFrame(scene.locator('canvas')) });
  await snapshot(legacy, 'supply-eight-node-legacy');
  check('supply-no-horizontal-overflow', await noOverflow());
}

async function visibleScenes() {
  await goto('/simulator');
  const hero=page.locator('.behaviour-intro-world');
  await hero.scrollIntoViewIfNeeded();
  await expect(hero.locator('.sakura-scene')).toHaveAttribute('data-load-state','rendered');
  const caption=await hero.locator('figcaption').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,children:[...el.children].map(child=>({text:child.textContent,width:child.clientWidth,scroll:child.scrollWidth,whiteSpace:getComputedStyle(child).whiteSpace}))}));
  assert(caption.scroll<=caption.width+1,'Hero caption is clipped');
  for(const child of caption.children)assert(child.scroll<=child.width+1,'Caption child is clipped: '+child.text);
  check('mobile-caption-wraps-without-clipping',caption);
  await snapshot(hero,'simulator-hero-caption');
  for(const[id,kind]of[['coffee-time','cafe'],['eco-companion','cat'],['pasture-letter','pasture']]){
    const stage=page.locator('#'+id+' .scene-stage').first();
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-load-state','rendered');
    const canvas=stage.locator('canvas');await expect(canvas).toHaveAttribute('data-story-scene',kind);
    check('visible-'+kind+'-real-frame',await realFrame(canvas));
    await snapshot(stage,'visible-'+kind+'-3d');
    await expect(stage).toHaveAttribute('data-mode','3d');
  }
  check('visible-scenes-no-overflow',await noOverflow());
}

async function pages() {
  report.performance = [];
  for (const [route, selector, name, canvasSelector] of [
    ['/', '.carbon-experience', 'home', '.city-formation canvas'], ['/learn', '.learn-page', 'learn', '.library-hero-world .scene-stage canvas'],
    ['/simulator', '.simulator-page', 'simulator', '#sakura-meeting .sakura-scene canvas'], ['/workspace', '.workspace-page', 'workspace', '.clothing-gallery canvas'],
    ['/citylight', '.citylight-page', 'citylight', '.citylight-viewport canvas'], ['/city-studies', '.city-studies-page', 'city-studies', '.city-studies-viewport canvas'], ['/search', '.site-search-page', 'search', null],
  ]) {
    const response = await goto(route);
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const performanceData = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const sum = field => resources.reduce((total, entry) => total + (entry[field] || 0), nav?.[field] || 0);
      const metrics = window.__ctDeliveryMetrics;
      return {
        url: location.href, title: document.title, measuredAtMs: performance.now(),
        navigation: nav ? { type: nav.type, responseStartMs: nav.responseStart, domContentLoadedMs: nav.domContentLoadedEventEnd, loadMs: nav.loadEventEnd, durationMs: nav.duration } : null,
        lcpMs: metrics.lcp, cls: metrics.cls, observerSupport: metrics.supported,
        bytes: { transferred: sum('transferSize'), encoded: sum('encodedBodySize'), decoded: sum('decodedBodySize'), resourceCount: resources.length },
        note: 'One local navigation sample at this checkpoint; resources may continue loading. Zero transfer sizes may mean cache or unavailable browser timing. No Lighthouse score or physical-device claim.',
      };
    });
    check(`page-${name}-ready-and-no-overflow`, await noOverflow());
    const file = `page-${name}.png`;
    await page.screenshot({ path: path.join(out, file) }); report.screenshots.push(file);
    if (canvasSelector) {
      // Scroll the owner into view before requiring a canvas: several scenes load lazily.
      const ownerSelector = canvasSelector.replace(/ canvas$/, '');
      await page.locator(ownerSelector).scrollIntoViewIfNeeded();
      const canvas = page.locator(canvasSelector);
      await expect(canvas).toBeVisible();
      await expect.poll(async () => Number(await canvas.getAttribute('data-scene-triangles') || await canvas.getAttribute('data-triangles'))).toBeGreaterThan(0);
      const initial = await canvasState(canvas);
      assert(!initial.lost && initial.buffer.every(value => value > 0));
      const key = ['sceneFrames', 'renderFrame', 'cityFrame'].find(field => Number.isFinite(Number(initial[field])) && initial[field] !== undefined);
      const start = Date.now();
      await page.waitForTimeout(1200);
      const end = await canvasState(canvas), elapsedMs = Date.now() - start;
      const delta = key ? Number(end[key]) - Number(initial[key]) : null;
      performanceData.canvas = {
        selector: canvasSelector, before: initial, after: end, elapsedMs,
        frameCounter: key || 'unavailable', frameDelta: delta,
        observedFramesPerSecond: delta === null ? null : delta * 1000 / elapsedMs,
        note: 'Short visible-canvas sample. Demand rendering can intentionally show zero frames while idle; no frame-rate pass threshold is imposed. This is not a sustained benchmark.',
      };
      await snapshot(page.locator(ownerSelector), `page-${name}-3d`);
      check(`page-${name}-real-canvas-and-frame-sample`, performanceData.canvas);
    } else performanceData.canvas = { status: 'not-applicable', note: 'The local search page has no core 3D canvas.' };
    report.performance.push({ route, status: response.status(), ...performanceData });
  }
  // Exercise the actual site navigation and local search, in addition to document loads.
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '学术档案', exact: true }).click();
  await expect(page).toHaveURL(base + '/learn');
  await expect(page.locator('.learn-page')).toBeVisible();
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '行为沙盘', exact: true }).click();
  await expect(page).toHaveURL(base + '/simulator');
  await page.getByRole('link', { name: '搜索全站', exact: true }).click();
  await expect(page).toHaveURL(base + '/search');
  const search = page.locator('#site-search');
  await search.fill('咖啡');
  await expect(page.locator('.site-search-result').first()).toBeVisible();
  await expect(page).toHaveURL(/q=/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(search).toHaveValue('咖啡');
  const destination = await page.locator('.site-search-result').first().getAttribute('href');
  await page.locator('.site-search-result').first().click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).hash).toBe(new URL(destination, base).pathname + new URL(destination, base).hash);
  check('main-navigation-local-search-refresh-and-result-link', { query: '咖啡', destination });
  check('pages-final-no-horizontal-overflow', await noOverflow());
}

async function galleryActivity() {
  await goto('/workspace');
  const gallery = page.locator('.clothing-gallery'), canvas = gallery.locator('canvas');
  await gallery.locator('.clothing-gallery-canvas').scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute('data-load-state', 'rendered');
  await realFrame(canvas);
  await canvas.evaluate(c => { window.__ctDeliveryCanvas = c; });
  const sameCanvas = async () => assert(await canvas.evaluate(c => c === window.__ctDeliveryCanvas), 'Gallery canvas was replaced');
  const frame = async () => Number(await canvas.getAttribute('data-render-frame'));
  const stopped = async () => {
    await expect.poll(async () => { const before = await frame(); await page.waitForTimeout(250); return (await frame()) - before; }).toBe(0);
    const before = await frame(); await page.waitForTimeout(700); assert.equal(await frame(), before, 'Paused canvas continued rendering');
    return before;
  };
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'continuous');
  let before = await frame();
  await expect.poll(frame).toBeGreaterThan(before);
  check('gallery-visible-frames-advance', await canvasState(canvas));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'paused');
  check('gallery-offscreen-frames-stop', { frame: await stopped() });
  await sameCanvas();
  before = await frame();
  await gallery.locator('.clothing-gallery-canvas').scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'continuous');
  await expect.poll(frame).toBeGreaterThan(before);
  await sameCanvas();
  check('gallery-reentry-same-canvas-resumes');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'paused');
  check('gallery-simulated-hidden-document-stops', { frame: await stopped(), simulation: 'document.hidden override and visibilitychange; not OS background-tab measurement' });
  await sameCanvas(); before = await frame();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'continuous');
  await expect.poll(frame).toBeGreaterThan(before);
  await sameCanvas();
  check('gallery-visible-document-same-canvas-resumes');
  await page.getByRole('button', { name: '减弱动效', exact: true }).click();
  await gallery.locator('.clothing-gallery-canvas').scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-gallery-activity', 'on-demand');
  await stopped();
  await sameCanvas();
  before = await frame();
  await gallery.getByRole('button', { name: '背面', exact: true }).click();
  await expect.poll(frame).toBeGreaterThan(before);
  await sameCanvas();
  await stopped();
  check('gallery-reduced-demand-updates-on-camera-control', await canvasState(canvas));
  await snapshot(gallery, 'gallery-reduced-demand');
  check('gallery-no-horizontal-overflow', await noOverflow());
}

(async () => {
  await fs.mkdir(out, { recursive: true });
  // An explicit directory may contain valuable previous failure evidence.
  try { await fs.access(path.join(out, 'result.json')); throw new Error(`Refusing to overwrite existing evidence: ${out}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try {
    assert(['learning', 'supply', 'pages', 'gallery-activity','visible-scenes'].includes(moduleName), `Unsupported CT_MODULE ${moduleName}`);
    assert(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported CT_BROWSER ${engine}`);
    browser = await ({ chromium, firefox, webkit }[engine]).launch({ headless: true, ...require('./browser-runtime.cjs').launchOptions(), ...(engine === 'chromium' ? { channel: 'chrome' } : {}) });
    report.version = browser.version();
    context = await browser.newContext({ viewport, reducedMotion: moduleName === 'gallery-activity' ? 'no-preference' : 'reduce', recordVideo: { dir: out, size: viewport } });
    await context.route('**/api/**', async route => { report.blockedApis.push({ method: route.request().method(), path: new URL(route.request().url()).pathname }); await route.abort('blockedbyclient'); });
    await context.addInitScript(() => {
      const metrics = { lcp: null, cls: null, supported: typeof PerformanceObserver === 'function' ? PerformanceObserver.supportedEntryTypes || [] : [] };
      window.__ctDeliveryMetrics = metrics;
      if (metrics.supported.includes('largest-contentful-paint')) new PerformanceObserver(list => { for (const entry of list.getEntries()) metrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      if (metrics.supported.includes('layout-shift')) {
        metrics.cls = 0; let first = 0, last = 0, sum = 0;
        new PerformanceObserver(list => { for (const entry of list.getEntries()) { if (entry.hadRecentInput) continue; if (!first || entry.startTime - last >= 1000 || entry.startTime - first >= 5000) { first = entry.startTime; sum = 0; } last = entry.startTime; sum += entry.value; metrics.cls = Math.max(metrics.cls, sum); } }).observe({ type: 'layout-shift', buffered: true });
      }
    });
    page = await context.newPage(); page.setDefaultTimeout(60000);
    report.assets = [];
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => {
      const url = response.url(), pathname = new URL(url).pathname;
      if (response.status() >= 400) report.http.push({ path: pathname, status: response.status() });
      if (/\.(glb|hdr|gltf)(?:\?|$)/i.test(url)) report.assets.push({ url, status: response.status() });
    });
    page.on('requestfailed', request => report.requestsFailed.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText, apiBlockedByTest: new URL(request.url()).pathname.startsWith('/api/') }));
    await ({ learning, supply, pages, 'gallery-activity': galleryActivity, 'visible-scenes':visibleScenes }[moduleName])();
    assert.deepEqual(report.errors, [], 'Unexpected page exceptions');
    assert.deepEqual(report.http, [], 'Unexpected HTTP errors');
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error); process.exitCode = 1;
    if (page) {
      await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
      report.lastUrl = page.url();
      report.canvases = await page.locator('canvas').evaluateAll(canvases => canvases.map(canvas => ({ ...canvas.dataset }))).catch(() => []);
    }
  } finally {
    report.finished = new Date().toISOString();
    await context?.close().catch(error => { report.closeError = error.message; });
    await browser?.close().catch(error => { report.browserCloseError = error.message; });
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out, module: moduleName, engine, mobile, passed: report.passed, checks: report.checks.length, errors: report.errors, http: report.http, failure: report.failure }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
