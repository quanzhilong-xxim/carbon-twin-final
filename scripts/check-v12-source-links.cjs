const fs = require('node:fs/promises'), path = require('node:path'), crypto = require('node:crypto');
(async () => {
  const text = await fs.readFile(path.join(__dirname, '../lib/knowledge-v12.ts'), 'utf8');
  const urls = [...text.matchAll(/url:'([^']+)'/g)].map(m => m[1]);
  const rows = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent':'CarbonTwin source-link verification/1.0' } });
      const html = await response.text();
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
      rows.push({url, finalUrl:response.url, status:response.status, title, sha256:crypto.createHash('sha256').update(html).digest('hex'), checkedAt:new Date().toISOString()});
    } catch (e) { rows.push({url, error:String(e), checkedAt:new Date().toISOString()}); }
    console.log(JSON.stringify(rows.at(-1)));
  }
  const out = path.resolve(process.env.CT_SOURCE_REPORT || 'outputs/v12/source-links.json');
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.writeFile(out, JSON.stringify({rows, note:'HTTP reachability is separate from content accuracy; blocked requests are not counted as verified.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
