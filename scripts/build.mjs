/* Builds the deployable site into ./dist. Runs inside GitHub Actions; nobody
   needs to run it by hand.

   What it does
   - copies only the files the website needs (no docs, tests or tooling)
   - minifies JavaScript and CSS (file by file, so every URL stays the same)
   - bundles the three stylesheets into one for faster first paint
   - compacts JSON data files
   - points canonical links, the sitemap and the 404 page at the real address
     of the site (SITE_URL / BASE_PATH, supplied by GitHub Pages)
   - swaps in Firebase settings from repository secrets, when they are set
   - stamps the offline cache with the commit, so updates reach visitors */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { transform } from 'esbuild';

const OUT = 'dist';
const DEFAULT_SITE = 'https://babatundeawo.github.io/rccg-training-portal/';
const DEFAULT_BASE = '/rccg-training-portal/';
const COPY = ['index.html', '404.html', 'favicon.ico', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'sw.js', 'assets'];

const withSlash = (s) => (s.endsWith('/') ? s : `${s}/`);
const siteUrl = withSlash(process.env.SITE_URL || DEFAULT_SITE);
const basePath = withSlash(process.env.BASE_PATH || new URL(siteUrl).pathname);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Page folders (track and test pages) are found automatically. */
async function pageFolders() {
  const skip = ['assets', 'docs', 'scripts', 'tests', 'node_modules', 'dist'];
  const found = [];
  for (const entry of await readdir('.', { withFileTypes: true })) {
    if (!entry.isDirectory() || skip.includes(entry.name) || entry.name.startsWith('.')) continue;
    if ((await readdir(entry.name)).some((f) => f.endsWith('.html'))) found.push(entry.name);
  }
  return found;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const item of [...COPY, ...(await pageFolders())]) {
  if (await stat(item).catch(() => null)) await cp(item, join(OUT, item), { recursive: true });
}
// Folder READMEs are for people browsing the repository, not for visitors.
for await (const file of walk(OUT)) if (file.endsWith('README.md')) await rm(file);

let saved = 0;
for await (const file of walk(OUT)) {
  const ext = extname(file);
  const before = await readFile(file);
  let after = null;
  if (ext === '.js') {
    after = (await transform(before.toString(), { loader: 'js', minify: true, target: 'es2022', legalComments: 'none' })).code;
  } else if (ext === '.css') {
    after = (await transform(before.toString(), { loader: 'css', minify: true, target: 'esnext' })).code;
  } else if (ext === '.json') {
    after = JSON.stringify(JSON.parse(before.toString()));
  } else if (['.html', '.xml', '.txt', '.webmanifest'].includes(ext)) {
    let text = before.toString();
    if (siteUrl !== DEFAULT_SITE) text = text.split(DEFAULT_SITE).join(siteUrl);
    if (file.endsWith('404.html')) text = text.replace(`<base href="${DEFAULT_BASE}">`, `<base href="${basePath}">`);
    after = text;
  }
  if (after !== null) {
    await writeFile(file, after);
    saved += before.length - Buffer.byteLength(after);
  }
}

/* One stylesheet instead of three: fewer round trips before the page can paint. */
const cssDir = join(OUT, 'assets/css');
let bundle = '';
for (const part of ['tokens', 'base', 'components']) {
  bundle += await readFile(join(cssDir, `${part}.css`), 'utf8');
  await rm(join(cssDir, `${part}.css`));
}
await writeFile(join(cssDir, 'site.css'), bundle);
const linkPattern = /<link rel="stylesheet" href="([^"]*)assets\/css\/tokens\.css">\s*<link rel="stylesheet" href="[^"]*assets\/css\/base\.css">\s*<link rel="stylesheet" href="[^"]*assets\/css\/components\.css">/;
for await (const file of walk(OUT)) {
  if (!file.endsWith('.html')) continue;
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace(linkPattern, '<link rel="stylesheet" href="$1assets/css/site.css">'));
}

/* Firebase settings from GitHub secrets (all-or-nothing). */
const fb = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};
if (['apiKey', 'authDomain', 'projectId', 'appId'].every((k) => fb[k])) {
  const config = Object.fromEntries(Object.entries(fb).filter(([, v]) => v));
  await writeFile(join(OUT, 'assets/js/firebase-config.js'), `export const firebaseConfig=${JSON.stringify(config)};`);
  console.log('Firebase settings: taken from GitHub secrets.');
} else {
  console.log('Firebase settings: GitHub secrets not set, using assets/js/firebase-config.js as committed.');
}

/* Offline cache name changes with every deployment; precache list follows the bundled stylesheet. */
const stamp = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);
const swPath = join(OUT, 'sw.js');
const swSource = (await readFile(swPath, 'utf8'))
  .replace('rccg-learning-path-v1', `rccg-learning-path-${stamp}`)
  .replace(/["']assets\/css\/tokens\.css["'],\s*["']assets\/css\/base\.css["'],\s*["']assets\/css\/components\.css["']/, '"assets/css/site.css"');
await writeFile(swPath, swSource);

console.log(`Built ./${OUT} for ${siteUrl} (saved ${(saved / 1024).toFixed(0)} KB by minifying).`);
