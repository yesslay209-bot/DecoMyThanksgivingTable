// Checks the production build before anything is deployed.
// Run with: npm run build && npm run smoke
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };

check(existsSync(join(dist, 'index.html')), 'dist/index.html is missing. Did the build run?');
if (problems.length) finish();

const html = readFileSync(join(dist, 'index.html'), 'utf8');
check(html.includes('<title>DecoThanks'), 'index.html has no DecoThanks title');
check(!html.includes('/src/main.js'), 'index.html still points at the unbuilt /src/main.js');
check(!html.includes('%SITE_URL%'), 'the %SITE_URL% placeholder was not replaced');
if (process.env.SITE_URL) {
  check(/property="og:image" content="https:\/\/[^"]+og-image\.jpg"/.test(html), 'og:image is not an absolute https URL');
}

// Every local file the page references must exist.
for (const [, ref] of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)) {
  check(existsSync(join(dist, ref)), `index.html references ${ref}, which is not in dist`);
}

const js = readdirSync(join(dist, 'assets')).filter(f => f.endsWith('.js'));
check(js.length > 0, 'no JavaScript bundle in dist/assets');
const bundle = js.map(f => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');

check(bundle.includes('thank_you_cards') || bundle.includes('thank-you'), 'the JavaScript bundle looks wrong (no card code found)');
for (const file of ['thanksgiving-table.webp', 'cozy-thanksgiving-feast.webp', 'og-image.jpg']) {
  check(existsSync(join(dist, file)), `${file} is missing from dist`);
}
const foodDir = join(dist, 'assets', 'foods');
const foodCount = existsSync(foodDir) ? readdirSync(foodDir).reduce((n, d) => n + (statSync(join(foodDir, d)).isDirectory() ? readdirSync(join(foodDir, d)).length : 0), 0) : 0;
check(foodCount >= 40, `expected at least 40 food images in dist/assets/foods, found ${foodCount}`);

const size = (dir) => readdirSync(dir).reduce((n, f) => { const p = join(dir, f); const s = statSync(p); return n + (s.isDirectory() ? size(p) : s.size); }, 0);
const mb = size(dist) / 1024 / 1024;
check(mb < 8, `the build is ${mb.toFixed(1)} MB; keep it under 8 MB so phones load it quickly`);

finish();
function finish() {
  if (problems.length) {
    console.error(`Smoke test failed:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Smoke test passed (${mb.toFixed(1)} MB build).`);
  process.exit(0);
}
