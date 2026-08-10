#!/usr/bin/env node
/**
 * Server statico minimale per lo sviluppo locale.
 * L'app usa moduli ES e `fetch`, quindi non funziona aprendo il file
 * direttamente con `file://`: serve un vero server HTTP.
 *
 *   node pipeline/tools/serve.js [porta]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  // `normalize` + prefisso controllato: nessuna richiesta puo' uscire da ROOT.
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, relative);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 — non trovato');
    return;
  }

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403).end('403');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Tech Offers Hub in ascolto su http://localhost:${PORT}`);
});
