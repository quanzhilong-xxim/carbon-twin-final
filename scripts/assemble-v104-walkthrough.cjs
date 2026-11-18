/* Join actual G browser recordings without trimming or speeding up. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/v10-explore/V104-CURRENT-REVIEW');
// Capability checks: the Playwright binary encodes VP9/pad but has no concat.
// The installed editor binary has concat demuxing but no VP9 encoder.
// Normalize with the former, then concatenate without encoding with the latter.
const ffmpeg = 'D:/PlaywrightBrowsers/ffmpeg-1013/ffmpeg-win64.exe';
const joiner = 'C:/Users/23242/AppData/Local/JianyingPro/Apps/8.4.0.13142/ffmpeg.exe';
const record = JSON.parse(fs.readFileSync(path.join(out, 'video-sources.json'), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const item of record.sources) {
  if (hash(item.file) !== item.sha256) throw new Error('Source video changed: ' + item.name);
}
const output = path.join(out, 'walkthrough.webm');
if (fs.existsSync(output)) throw new Error('Preserve existing walkthrough; do not overwrite.');
function run(exe, args, logFile) {
  return new Promise((resolve, reject) => {
    const log = fs.openSync(logFile, 'wx');
    const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'ignore', log] });
    child.on('error', error => { fs.closeSync(log); reject(error); });
    child.on('close', code => { fs.closeSync(log); code === 0 ? resolve() : reject(new Error('FFmpeg exit: ' + code)); });
  });
}
function inspect(file) {
  const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8', windowsHide: true }).stderr;
  const time = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!time) throw new Error('Duration unavailable: ' + file);
  return { seconds: +time[1] * 3600 + +time[2] * 60 + +time[3], commonSize: /1440x1000/.test(probe) };
}
async function main() {
  const media = path.join(out, 'evidence/media-work');
  fs.mkdirSync(media, { recursive: true });
  const normalized = [], chapters = [];
  const previousFile = path.join(out, 'evidence/video-sources-responsive-tests.json');
  const previous = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null;
  let total = 0;
  for (const item of record.sources) {
    chapters.push({ name: item.name, start: total }); total += inspect(item.file).seconds;
    const file = path.join(media, item.name + '.webm');
    if (fs.existsSync(file)) {
      if (!previous?.sources.some(x => x.name === item.name && x.sha256 === item.sha256) || !inspect(file).commonSize) throw new Error('Unverified normalized recording: ' + item.name);
    } else if (item.name === 'characters') fs.copyFileSync(item.file, file);
    else await run(ffmpeg, ['-hide_banner', '-nostdin', '-n', '-i', item.file,
      '-vf', 'pad=1440:1000:0:(oh-ih)/2:color=0x10271b', '-an', '-c:v', 'libvpx-vp9',
      '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-threads', '4',
      '-b:v', '0', '-crf', '30', '-r', '25', file], path.join(media, item.name + '.log'));
    normalized.push(file); item.normalized = { file, sha256: hash(file) };
    console.log('Prepared actual recording: ' + item.name);
  }
  const list = path.join(media, 'concat.txt');
  fs.writeFileSync(list, normalized.map(file => "file '" + file.replaceAll('\\', '/') + "'").join('\n') + '\n');
  await run(joiner, ['-hide_banner', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', list,
    '-map', '0:v:0', '-c', 'copy', output], path.join(out, 'walkthrough-desktop-join.log'));
  const seconds = inspect(output).seconds;
  if (Math.abs(seconds - total) > 0.12) throw new Error('Unexpected assembled duration: ' + seconds);
  const frames = [];
  for (const [name, position] of [['explore', 65], ['characters', 155], ['academic', chapters[2].start + 10], ['fabric', total - 5]]) {
    const file = path.join(out, 'evidence', `walkthrough-current-${name}.png`);
    const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-n', '-ss', String(position), '-i', output,
      '-frames:v', '1', '-c:v', 'png', file], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error(result.stderr);
    frames.push({ name, second: position, file: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(file) });
  }
  record.assembled = { file: output, sha256: hash(output), bytes: fs.statSync(output).size, seconds,
    format: 'VP9 WebM, 1440x1000, 25fps; originals padded, not cropped', audio: 'No audio in original browser recordings',
    chapters, frames };
  record.verifiedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'video-sources.json'), JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record.assembled));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
