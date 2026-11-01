/* Quality gate run after the build. Errors stop the deployment; warnings are
   only reported. Checks: content data, links and files, SEO basics, security
   rules of thumb (no inline scripts/styles) and sitemap coverage. */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, extname } from 'node:path';

const DIST = process.argv[2] || 'dist';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const exists = (p) => stat(p).then(() => true, () => false);
const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full); else yield full;
  }
}

/* ---------- Content ---------- */
const { modules } = await readJSON(join(DIST, 'assets/data/modules.json'));
const verses = await readJSON(join(DIST, 'assets/data/kjv-verses.json'));
for (const m of modules) {
  const base = join(DIST, 'assets/data', m.id);
  const index = await readJSON(join(base, 'index.json'));
  const ids = index.studies.map((s) => s.id);
  if (ids.join() !== ids.map((_, i) => i + 1).join()) err(`${m.id}: study ids must run 1..N without gaps`);
  for (const s of index.studies) {
    const file = join(base, `study-${s.id}.json`);
    if (!(await exists(file))) { err(`${m.id}: missing study-${s.id}.json`); continue; }
    const study = await readJSON(file);
    if (!study.cards?.length) err(`${m.id} study ${s.id}: no cards`);
    const refs = JSON.stringify(study).match(/\{\{([^|}]+)\|/g) || [];
    for (const raw of refs) {
      for (const key of raw.slice(2, -1).split(',').map((k) => k.trim())) {
        if (!verses[key]) warn(`${m.id} study ${s.id}: scripture key "${key}" is not in kjv-verses.json (shown as plain text)`);
      }
    }
    for (const mv of study.memoryVerse || []) {
      if (!mv.keys.some((k) => verses[k])) warn(`${m.id} study ${s.id}: memory verse "${mv.label}" has no matching verse text`);
    }
  }
  const bank = (await readJSON(join(base, 'quiz-bank.json'))).questions || [];
  if (!bank.length) err(`${m.id}: quiz bank is empty`);
  bank.forEach((q, i) => {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) err(`${m.id} quiz #${i + 1}: needs a question and at least 2 options`);
    else if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) err(`${m.id} quiz #${i + 1}: correctIndex out of range`);
  });
  for (const p of [m.path + 'index.html', m.path + 'reader.html', m.testPath + 'index.html']) {
    if (!(await exists(join(DIST, p)))) err(`${m.id}: page ${p} is missing`);
  }
}

/* ---------- HTML ---------- */
const htmlFiles = [];
for await (const f of walk(DIST)) if (f.endsWith('.html')) htmlFiles.push(f);
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

for (const file of htmlFiles) {
  const rel = file.slice(DIST.length + 1);
  const html = await readFile(file, 'utf8');
  const is404 = rel === '404.html' || rel === 'offline.html';
  if (!/<html lang="/.test(html)) err(`${rel}: missing <html lang>`);
  if (!/<title>[^<]+<\/title>/.test(html)) err(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) err(`${rel}: missing or very short meta description`);
  if (!/<link rel="canonical"/.test(html)) err(`${rel}: missing canonical link`);
  if (!/<meta name="viewport"/.test(html)) err(`${rel}: missing viewport meta`);
  if (!/<h1[\s>]/.test(html)) err(`${rel}: missing <h1>`);
  if (!/id="main"/.test(html)) err(`${rel}: missing main landmark with id="main"`);
  if (/\sstyle="/.test(html)) err(`${rel}: inline style attribute (blocked by the Content Security Policy)`);
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/g)) err(`${rel}: inline <script> (blocked by the Content Security Policy): ${m[0]}`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (attr(m[0], 'alt') === undefined) err(`${rel}: <img> without alt`);
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) if (!/noopener/.test(m[0])) err(`${rel}: target=_blank link without rel=noopener`);

  const baseHref = (html.match(/<base href="([^"]+)"/) || [])[1];
  const linkable = html.replace(/<base\b[^>]*>/g, '');
  for (const m of linkable.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (!url || /^(https?:|mailto:|tel:|data:|#|\{)/.test(url)) continue;
      const clean = url.split('#')[0].split('?')[0];
      if (!clean) continue;
      let target;
      if (is404 && baseHref) target = join(DIST, clean);
      else target = clean.startsWith('/') ? join(DIST, clean) : resolve(dirname(file), clean);
      if (await stat(target).then((s) => s.isDirectory(), () => null)) target = join(target, 'index.html');
      if (!(await exists(target))) err(`${rel}: broken link/asset "${url}"`);
    }
  }
}

/* ---------- JavaScript imports & service worker ---------- */
for await (const file of walk(join(DIST, 'assets/js'))) {
  if (extname(file) !== '.js') continue;
  const code = await readFile(file, 'utf8');
  for (const m of code.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
    if (!(await exists(resolve(dirname(file), m[1])))) err(`${file.slice(DIST.length + 1)}: imports missing file "${m[1]}"`);
  }
}
const sw = await readFile(join(DIST, 'sw.js'), 'utf8');
const coreBlock = (sw.match(/const CORE = \[([\s\S]*?)\]/) || [])[1] || '';
for (const m of coreBlock.matchAll(/['"]([^'"]+)['"]/g)) {
  const p = m[1] === './' ? 'index.html' : m[1];
  if (!(await exists(join(DIST, p)))) err(`sw.js: precache entry "${m[1]}" does not exist`);
}

/* ---------- Sitemap ---------- */
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const needed = ['', ...modules.flatMap((m) => [m.path + 'index.html', m.testPath + 'index.html'])];
for (const n of needed) if (!locs.some((l) => l.endsWith('/' + n) || (n === '' && l.endsWith('/')))) err(`sitemap.xml: missing ${n || 'homepage'}`);
for (const m of modules) {
  const total = (await readJSON(join(DIST, 'assets/data', m.id, 'index.json'))).studies.length;
  for (let i = 1; i <= total; i++) if (!locs.some((l) => l.endsWith(`${m.path}reader.html?study=${i}`))) err(`sitemap.xml: missing ${m.path}reader.html?study=${i}`);
}
for (const l of locs) {
  const path = new URL(l).pathname.replace(/^\/[^/]+\//, '').split('?')[0] || 'index.html';
  if (!(await exists(join(DIST, path.endsWith('/') ? path + 'index.html' : path)))) err(`sitemap.xml lists a page that does not exist: ${l}`);
}

warnings.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`ERROR ${e}`));
console.log(`\nCheck finished: ${errors.length} error(s), ${warnings.length} warning(s), ${htmlFiles.length} pages.`);
process.exit(errors.length ? 1 : 0);
