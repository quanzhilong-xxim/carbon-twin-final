// Tests connectivity with Chromium's synthetic camera, not garment quality.
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:3010/workspace', { waitUntil: 'domcontentloaded' });
    const button = page.getByRole('button', { name: '开启云端试穿', exact: true });
    await button.waitFor();
    await button.click();
    await page.waitForFunction(() => {
      const state = document.querySelector('.ar-lab')?.getAttribute('data-tracking');
      const label = document.querySelector('.mirror-meta > span:last-child')?.textContent;
      return state === 'unavailable' || (state === 'connected' && label !== 'LOCAL CAMERA PREVIEW');
    }, null, { timeout: 45000 });
    console.log('State:', await page.locator('.ar-lab').getAttribute('data-tracking'));
    console.log('Remote video playing:', await page.locator('#ai-tryon-video').evaluate(video => !!video.srcObject && !video.paused && video.videoWidth > 0));
    console.log('Local preview playing:', await page.locator('#local-camera-preview').evaluate(video => !!video.srcObject && !video.paused && video.videoWidth > 0));
    console.log('Error:', await page.locator('.ar-error-notice').textContent().catch(() => 'none'));
    await page.locator('.ar-viewport').scrollIntoViewIfNeeded();
    await page.locator('.ar-viewport').screenshot({ path: 'work/decart-tests/connection-actual.png' });
    // Layout-only check: a cloned synthetic camera stream is not a Decart result.
    await page.evaluate(async () => {
      const local = document.querySelector('#local-camera-preview');
      const remote = document.querySelector('#ai-tryon-video');
      remote.srcObject = local.srcObject.clone();
      local.classList.add('ar-local-pip');
      await remote.play();
    });
    await page.locator('.ar-viewport').screenshot({ path: 'work/decart-tests/pip-layout-mock.png' });
    console.log('Saved actual connection and mock PiP layout screenshots');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
