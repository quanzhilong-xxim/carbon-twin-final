const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

async function omitMeshes(buffer, names) {
  const length = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + length));
  for (const node of gltf.nodes) if (names.includes(node.name)) delete node.mesh;
  const body = gltf.nodes.find(node => node.name === 'Body');
  if (names.includes('@body-skin')) gltf.meshes[body.mesh].primitives = gltf.meshes[body.mesh].primitives.filter(p => !gltf.materials[p.material].name.includes('SKIN'));
  if (names.includes('@body-hair')) gltf.meshes[body.mesh].primitives = gltf.meshes[body.mesh].primitives.filter(p => !gltf.materials[p.material].name.includes('HAIR'));
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const tail = buffer.subarray(20 + length);
  const header = Buffer.alloc(20);
  header.write('glTF'); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + tail.length, 8);
  header.writeUInt32LE(padded.length, 12); header.write('JSON', 16);
  return Buffer.concat([header, padded, tail]);
}

(async () => {
  const output = path.resolve('outputs/v108/internal/v11-chest-visibility');
  await fs.mkdir(output, { recursive: true });
  const original = await fs.readFile('public/models/characters-v10/CT_Student_Explore_v108w.glb');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [name, hidden] of [
    ['body-skin-hidden', ['@body-skin']],
    ['body-hair-hidden', ['@body-hair']],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/api/**', route => route.abort());
    await context.route('**/CT_Student_Explore_v108w.glb', async route => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: await omitMeshes(original, hidden) }));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3064/#identities', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const card = page.locator('.identity-unit[data-character=student]');
    await card.locator('.identity-card').click();
    await card.getByRole('button', { name: '进入角色展厅' }).click();
    const dialog = page.getByRole('dialog');
    await page.waitForFunction(() => document.querySelector('.character-room canvas')?.dataset.assetVersion === 'v108w', null, { timeout: 60000 });
    await dialog.getByRole('button', { name: '暂停动作', exact: true }).click();
    await dialog.getByRole('button', { name: '服装', exact: true }).click();
    await page.waitForTimeout(1800);
    await dialog.screenshot({ path: path.join(output, `${name}.png`) });
    await context.close();
  }
  await browser.close();
  console.log(output);
})().catch(error => { console.error(error); process.exitCode = 1; });
