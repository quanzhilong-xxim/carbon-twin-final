/* Read-only CC0 source acquisition; no generation, account or paid API. */
const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
const id = 'jacaranda_tree';
const base = 'D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/' + id;
async function json(url) { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
async function acquire(relative, item) {
  const target = path.join(base, relative);
  try { const previous = await fs.readFile(target); if (crypto.createHash('md5').update(previous).digest('hex') === item.md5) return { file: relative, bytes: previous.length, retained: true }; } catch {}
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(item.url, { signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = Buffer.from(await r.arrayBuffer()); const md5 = crypto.createHash('md5').update(data).digest('hex');
      if (md5 !== item.md5) throw new Error('Source hash mismatch: ' + relative);
      await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, data);
      return { file: relative, bytes: data.length, md5, sha256: crypto.createHash('sha256').update(data).digest('hex') };
    } catch (e) { error = e; }
  }
  throw error;
}
(async () => {
  await fs.mkdir(base, { recursive: true });
  const files = await json('https://api.polyhaven.com/files/' + id), info = await json('https://api.polyhaven.com/info/' + id);
  const gltf = files.gltf['1k'].gltf, queue = [[id + '_1k.gltf', gltf], ...Object.entries(gltf.include)];
  const manifest = [];
  for (let i = 0; i < queue.length; i += 3) { const batch = await Promise.allSettled(queue.slice(i, i + 3).map(([name, file]) => acquire(name, file))); for (const result of batch) { if (result.status !== 'fulfilled') throw result.reason; manifest.push(result.value); } }
  await fs.writeFile(path.join(base, 'source.json'), JSON.stringify({ source: 'https://polyhaven.com/a/' + id, license: 'CC0', licenseUrl: 'https://polyhaven.com/license', info, files: manifest, paidCalls: 0 }, null, 2));
  console.log(JSON.stringify({ source: id, files: manifest.length, bytes: manifest.reduce((n, f) => n + f.bytes, 0), hashesVerified: true }));
})().catch(e => { console.error(String(e)); process.exitCode = 1; });
