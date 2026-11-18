import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import nextConfig from '../next.config.mjs';
import postcss from '../postcss.config.mjs';

const [tailwind, css, layout] = await Promise.all([
  readFile(new URL('../tailwind.config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8'),
]);
for (const folder of ['app', 'components']) {
  assert(tailwind.includes(`./${folder}/**/*.{js,ts,jsx,tsx,mdx}`), `Tailwind must scan ${folder}/.`);
}
for (const directive of ['base', 'components', 'utilities']) {
  assert(css.includes(`@tailwind ${directive};`), `Missing Tailwind ${directive} directive.`);
}
assert(/import\s+['"]\.\/globals\.css['"]/.test(layout), 'Root layout must import globals.css.');
assert('tailwindcss' in postcss.plugins && 'autoprefixer' in postcss.plugins, 'PostCSS plugins are incomplete.');
assert.notEqual(nextConfig('phase-development-server').distDir, nextConfig('phase-production-build').distDir);
assert.equal(nextConfig('phase-production-build').distDir, process.env.CARBONTWIN_PREVIEW_DIR || '.next');
console.log('Config verified: Tailwind / PostCSS / CSS import / separate development and production output directories.');
