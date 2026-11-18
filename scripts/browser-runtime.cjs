const fs = require('node:fs');
// Reuse the verified local browser retained by the previous recovery. Do not
// reinstall or overwrite the default installation after a launch-path failure.
exports.launchOptions = () => {
  if (process.env.CT_BROWSER !== 'firefox') return {};
  const clean = process.env.CT_FIREFOX_EXECUTABLE || 'C:/Users/23242/Documents/Codex/2026-11-12/files-pasted-by-the-user-carbontwin/work/firefox-1555-clean/firefox/firefox.exe';
  return fs.existsSync(clean) ? { executablePath: clean } : {};
};
