const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const output = path.resolve(`outputs/v108/internal/v11-student-candidate-${Date.now()}`);
  await fs.mkdir(output, { recursive: true });
  const candidate = await fs.readFile('public/models/characters-v10/CT_Student_Explore_v11a-portrait.glb');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const result = [];
  try {
    for (const [device, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ viewport });
      await context.route('**/api/**', route => route.abort());
      await context.route('**/CT_Student_Explore_v108w*.glb', route => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: candidate }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto('http://127.0.0.1:3064/#identities', { waitUntil: 'domcontentloaded', timeout: 60000 });
        const card = page.locator('.identity-unit[data-character=student]');
        await card.locator('.identity-card').click();
        await card.getByRole('button', { name: '进入角色展厅' }).click();
        const dialog = page.getByRole('dialog');
        await page.waitForFunction(() => document.querySelector('.character-room canvas')?.dataset.assetVersion === 'v108w', null, { timeout: 60000 });
        await dialog.getByRole('button', { name: '暂停动作', exact: true }).click();
        for (const [name, label] of [['front', '正面'], ['outfit', '服装'], ['hands', '手部'], ['side', '左侧'], ['back', '背面']]) {
          await dialog.getByRole('button', { name: label, exact: true }).click();
          await page.waitForTimeout(1500);
          await dialog.screenshot({ path: path.join(output, `${device}-${name}.png`) });
        }
        await dialog.getByRole('button', { name: '正面', exact: true }).click();
        await dialog.getByRole('button', { name: '继续动作', exact: true }).click();
        await dialog.getByRole('button', { name: '挥手', exact: true }).click();
        await page.waitForTimeout(2200);
        await dialog.screenshot({ path: path.join(output, `${device}-wave.png`) });
        result.push({ device, errors, canvas: await dialog.locator('canvas').evaluate(el => ({ ...el.dataset })) });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ output, result }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
