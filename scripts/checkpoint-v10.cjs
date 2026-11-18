/* Local incremental checkpoint. Never restores, deletes or uploads files. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const label = (process.argv[2] || 'WIP').replace(/[^a-zA-Z0-9_-]/g, '-');
const destination = path.join('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild', `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(destination, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(destination, 'git-status.txt'), git('status', '--porcelain=v1', '-uall'));
fs.writeFileSync(path.join(destination, 'git-diff.patch'), git('diff', '--binary', 'HEAD'));
fs.writeFileSync(path.join(destination, 'git-head.txt'), git('rev-parse', 'HEAD'));
const candidates = git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = [];
for (const relative of new Set(candidates)) {
  if (!/^(app|components|lib|scripts|docs\/(recovery|academic-ai-assets)|public\/(models\/(urban-vegetation|characters-v10|research)|media\/explore-v10|textures\/research))\//.test(relative) && !/^(package(-lock)?\.json|next\.config\.[cm]?js|tsconfig\.json)$/.test(relative)) continue;
  const source = path.join(root, relative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  const target = path.join(destination, 'files', relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const sha256 = hash(source);
  if (hash(target) !== sha256) throw new Error('Hash mismatch: ' + relative);
  manifest.push({ file: relative, bytes: fs.statSync(source).size, sha256 });
}
const frozen = ['app/api/tts', 'lib/speech', 'components/simulator', 'lib/learning', 'lib/stores', 'public/models/citylight'];
const integrity = [];
function scan(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return;
  if (fs.statSync(file).isDirectory()) for (const name of fs.readdirSync(file)) scan(relative + '/' + name);
  else integrity.push({ file: relative, sha256: hash(file) });
}
frozen.forEach(scan);
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ created: new Date().toISOString(), base: 'CP-00 retained; this is a scoped source and Explore-asset increment', verified: true, files: manifest }, null, 2));
fs.writeFileSync(path.join(destination, 'frozen-integrity.json'), JSON.stringify(integrity, null, 2));
console.log(JSON.stringify({ destination, files: manifest.length, bytes: manifest.reduce((n, x) => n + x.bytes, 0), frozenFiles: integrity.length, verified: true }));
