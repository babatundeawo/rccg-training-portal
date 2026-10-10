/* Tiny static file server for previewing the site (used by tests and by developers).
   Usage: node scripts/serve.mjs [folder] [port] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

export function startServer(folder = '.', port = 8080) {
  const root = resolve(folder);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }
      let info = await stat(path).catch(() => null);
      if (info?.isDirectory()) { path = join(path, 'index.html'); info = await stat(path).catch(() => null); }
      if (!info) {
        const notFound = await readFile(join(root, '404.html')).catch(() => Buffer.from('Not found'));
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(notFound);
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
      res.end(await readFile(path));
    } catch {
      res.writeHead(500).end('Server error');
    }
  });
  return new Promise((done) => server.listen(port, () => done(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await startServer(process.argv[2] || 'dist', Number(process.argv[3]) || 8080);
  console.log(`Serving on http://localhost:${server.address().port}`);
}
