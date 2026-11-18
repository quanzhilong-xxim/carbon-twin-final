/* Preserve current scoped source, models and real evidence outside the project.
 * No restore, deletion, Git mutation, deployment or credential collection. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), pack = path.join(root, 'outputs/v10-explore/V104-CURRENT-REVIEW');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); assert.equal(hash(from), hash(to), from); };
function walk(folder) { return fs.readdirSync(folder, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(folder, x.name)) : x.isFile() ? [path.join(folder, x.name)] : []); }
const qa = json(path.join(pack, 'qa.json')), video = json(path.join(pack, 'video-sources.json'));
assert(video.assembled && fs.existsSync(video.assembled.file)); assert.equal(hash(video.assembled.file), video.assembled.sha256);
assert.equal(qa.assetVersion, 'v104g'); assert.equal(qa.finalAccepted, false); assert.equal(qa.finalScore, null);
const protection = json(path.join(root, 'outputs/v10-explore/protection-and-restore.json')); assert(protection.passed);
const checkpoint = JSON.parse(execFileSync(process.execPath, ['scripts/checkpoint-v10.cjs', 'V104G-VERIFIED-CHECKPOINT'], { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 }));
assert(checkpoint.verified);
const destination = checkpoint.destination;
// Counts before adding the new checkpoint pointer are explicitly preliminary;
// final counts are read from the sealed manifests/result at the end.
const { files: initialSnapshotFiles, bytes: initialSnapshotBytes, ...checkpointInfo } = checkpoint;
const pointer = { ...checkpointInfo, initialSnapshotFiles, initialSnapshotBytes, at: new Date().toISOString(), scope: 'Scoped code/model increment plus separately verified selected raw evidence. Original CP-00 remains required for the full historical baseline.',
  originalBaseline: 'D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/CP-00', sourceManifest: path.join(destination, 'manifest.json'),
  evidenceManifest: path.join(destination, 'evidence-manifest.json'), preview: qa.preview, assetVersion: qa.assetVersion,
  finalAccepted: false, finalScore: null, frozenFiles: protection.frozenFiles, liveRestorePerformed: false };
qa.checkpoint = pointer; qa.protection = protection; qa.recording = video.assembled;
qa.evidence.academicDesktop = 'outputs/academic-archive/desktop-video-1794204611102';
qa.at = pointer.at;
write(path.join(pack, 'qa.json'), qa); write(path.join(root, 'docs/recovery/v10.4/qa.json'), qa);
write(path.join(pack, 'recovery/checkpoint.json'), pointer); write(path.join(root, 'docs/recovery/v10.4/latest-safe-checkpoint.json'), pointer);
copy(path.join(root, 'outputs/v10-explore/protection-and-restore.json'), path.join(pack, 'recovery/protection-and-restore.json'));
const stateFile = path.join(root, 'docs/recovery/PROJECT_CURRENT_STATE.md');
const state = `\n\n## V10.4 current saved checkpoint — ${pointer.at}\n\n- Root: ${root}. HEAD retained at 7aff20a198991db9694e32d86d2f972943ca128f. No reset/clean/stash or commit. All prior character versions, live Blender and original 3020 service retained.\n- Explicit G production candidate: http://127.0.0.1:3044/ ; identities: /#identities ; archive: /learn. Build directory .next-v104g-review; stable default character revision remains v10. No V10.4 online deployment or production overwrite. Do not restart an already-listening server.\n- Current G source/GLB masters, actual 3x9 camera captures, gesture/blink/pause/lite continuity, actual three-page screenshots and unretouched target/before/current comparisons are retained. Last successful step: fixed-desktop Academic recording exercises the real quiz invitation, answer saving and modal close alongside book/Scope/search/fabric.\n- Browser evidence: Chrome156 and tested WebKit27.2 paths pass; visible Firefox157 rendering/input stalls. Headless reduced-motion Firefox reading is a separate limited pass. City sample about31FPS, not60. Actual GPU/browser detail remains in the raw reports.\n- Art acceptance remains FAILED: all three faces/expression, helmet/ribbon-like hair, cloth drape and hands/tablet contact need substantial work. Academic space/garment realism remains partial. Do not rerun one-shot sculpt scripts or imply 98/100. Do not promote the candidate as accepted art.\n- No paid generation/API/new TTS calls in V10.4; no new agents. Prior TTS permissions are consumed. Saved genuine14-character audio replay matches original PCM hash in Chromium/Firefox; human loudspeaker audition and WebKit WebAudio are unverified. No platform export rights/balance has been inferred from a public page.\n- Recovery: ${destination}. Scope and verified manifest: docs/recovery/v10.4/latest-safe-checkpoint.json.53 frozen files unchanged, actual scratch restore passed. Full CP-00 and earlier increments remain. Evidence package: outputs/v10-explore/V104-CURRENT-REVIEW/README.md.\n- Next unresolved local work: choose a materially better character topology/groom/tailoring method against original074/078/080 references, then verify in both card forms. External generation paths require actual official account/export/budget rights before any paid operation. Current desktop UI restriction remains; no further input/bypass or new agent. Existing local tools remain usable. Preserve failed Firefox/recording attempts; do not equate them with service-wide or Wi-Fi failure.\n- This is a preserved runnable checkpoint, not final product acceptance; no unattended continuation is promised.\n`;
fs.appendFileSync(stateFile, state);
fs.appendFileSync(path.join(pack, 'README.md'), `\n当前外部增量备份：${destination}。实际拼接录像 ${video.assembled.seconds.toFixed(2)} 秒；固定桌面学术档案展示替换了带灰边的响应式测试片段，原始录像与第一次拼接均保留。当前100项状态为46通过、45部分完成、8失败、1待核实；这些数量不是质量评分。\n`);
// The snapshot is new in this invocation. Include the just-created metadata in
// it, updating the corresponding manifest entries before final verification.
const manifestFile = path.join(destination, 'manifest.json'), manifest = json(manifestFile);
for (const relative of ['docs/recovery/v10.4/qa.json', 'docs/recovery/v10.4/latest-safe-checkpoint.json', 'docs/recovery/PROJECT_CURRENT_STATE.md']) {
  const from = path.join(root, relative); copy(from, path.join(destination, 'files', relative));
  const item = { file: relative, bytes: fs.statSync(from).size, sha256: hash(from) }, index = manifest.files.findIndex(x => x.file === relative);
  if (index < 0) manifest.files.push(item); else manifest.files[index] = item;
}
manifest.metadataSealedAt = pointer.at; write(manifestFile, manifest);
copy(manifestFile, path.join(pack, 'recovery/source-manifest.json'));
copy(path.join(destination, 'frozen-integrity.json'), path.join(pack, 'recovery/frozen-integrity.json'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
fs.writeFileSync(path.join(pack, 'recovery/git-status.txt'), git('status', '--porcelain=v1', '-uall'));
fs.writeFileSync(path.join(pack, 'recovery/git-head.txt'), git('rev-parse', 'HEAD'));
// Refresh only the changed-file inventory; never rerun the package generator
// after sealing, since it deliberately initializes checkpoint metadata to null.
const baseline = json(path.join(root, 'docs/recovery/v10.4/baseline.json'));
const before = new Map(json(path.join(baseline.checkpoint, 'manifest.json')).files.map(x => [x.file, x.sha256]));
const changed = [];
for (const file of new Set(git('ls-files', '-co', '--exclude-standard', '-z').split('\0').filter(Boolean))) {
  if (!/^(app|components|lib|scripts|docs\/(recovery|academic-ai-assets)|public\/(models\/(characters-v10|research)|media\/explore-v10|textures\/research))\//.test(file)) continue;
  const from = path.join(root, file); if (!fs.existsSync(from) || !fs.statSync(from).isFile()) continue;
  const sha256 = hash(from); if (before.get(file) !== sha256) changed.push({ file, change: before.has(file) ? 'modified since V10.4 baseline' : 'new or absent from scoped baseline', bytes: fs.statSync(from).size, sha256 });
}
write(path.join(pack, 'recovery/changed-files.json'), { at: pointer.at, baseline: baseline.checkpoint, scope: 'Scoped comparison, not proof all absent-baseline files were authored this turn.', files: changed });
const integrity = walk(pack).filter(p => path.basename(p) !== 'package-manifest.json').map(file => ({ file: path.relative(pack, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) }));
write(path.join(pack, 'package-manifest.json'), { at: pointer.at, excludes: ['package-manifest.json itself'], files: integrity });
const selected = new Set(walk(pack));
for (const value of Object.values(qa.evidence)) {
  const file = path.join(root, value); if (!fs.existsSync(file)) continue;
  (fs.statSync(file).isDirectory() ? walk(file) : [file]).forEach(p => selected.add(p));
}
for (const source of video.sources) selected.add(source.file);
for (const relative of ['outputs/v10-explore/pose-surface-regression.json', 'outputs/v10-explore/tts-local-browser-v104-retest.log']) selected.add(path.join(root, relative));
const evidence = [];
for (const from of selected) {
  const relative = path.relative(root, from); assert(!relative.startsWith('..') && !path.isAbsolute(relative));
  const to = path.join(destination, 'evidence', relative); copy(from, to);
  evidence.push({ file: relative.replaceAll('\\', '/'), bytes: fs.statSync(from).size, sha256: hash(from) });
}
write(path.join(destination, 'evidence-manifest.json'), { at: pointer.at, verified: true, files: evidence });
for (const item of manifest.files) assert.equal(hash(path.join(destination, 'files', item.file)), item.sha256, item.file);
for (const item of integrity) assert.equal(hash(path.join(pack, item.file)), item.sha256, item.file);
const result = { ...pointer, files: manifest.files.length, bytes: manifest.files.reduce((n, f) => n + f.bytes, 0), evidenceFiles: evidence.length, evidenceBytes: evidence.reduce((n, f) => n + f.bytes, 0), packageFiles: integrity.length + 1, changedFiles: changed.length, verified: true };
write(path.join(destination, 'seal-result.json'), result); console.log(JSON.stringify(result));
