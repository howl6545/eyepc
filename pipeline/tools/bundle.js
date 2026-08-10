#!/usr/bin/env node
/**
 * Costruisce una versione a file unico dell'app, con i dati incorporati.
 *
 *   node pipeline/tools/bundle.js [destinazione.html]
 *
 * Serve per consultare l'app senza un server: il file si apre con un doppio
 * clic, si manda per email, si pubblica ovunque. Rispetto alla versione
 * normale cambia solo il modo in cui arrivano i dati (incorporati invece che
 * via `fetch`), il resto del codice e' identico.
 *
 * I moduli ES vengono concatenati in un unico script: non hanno dipendenze
 * circolari ne' simboli con lo stesso nome, quindi togliere `import`/`export`
 * e' sufficiente (lo verifica `npm run bundle` stesso, fallendo se il
 * risultato non e' valido).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
// `--artifact` produce il frammento senza guscio HTML, per le pagine ospitate
// che forniscono gia' <!doctype>, <head> e <body>.
const ARTIFACT = args.includes('--artifact');
const OUTPUT = resolve(ROOT, args.find((a) => !a.startsWith('--'))
  ?? (ARTIFACT ? 'dist/artifact.html' : 'dist/tech-offers-hub.html'));

// L'ordine e' quello delle dipendenze: format non dipende da nulla, app da tutti.
const MODULES = ['format', 'filters', 'render', 'app'];

const read = (relative) => readFile(resolve(ROOT, relative), 'utf8');

/** Toglie le istruzioni di modulo, lasciando le dichiarazioni. */
function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[\s\S]*?from\s+'[^']+';\s*$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?function|const|class)/gm, '')
    .replace(/^export\s*\{[^}]*\};\s*$/gm, '');
}

const dataset = JSON.parse(await read('data/offers.json'));

// Le immagini stanno sui CDN dei negozi: in un file autonomo (e sotto una CSP
// restrittiva) non sarebbero comunque raggiungibili, quindi si evita di
// chiederle. Il segnaposto compare al loro posto.
for (const offer of dataset.offers) offer.image = null;

const scripts = [];
for (const name of MODULES) {
  let source = stripModuleSyntax(await read(`web/assets/js/${name}.js`));

  if (name === 'app') {
    // Unica differenza funzionale: i dati sono gia' in pagina.
    source = source.replace(
      /async function loadDataset\(\)\s*\{[\s\S]*?\n\}/,
      'async function loadDataset() {\n  return window.__OFFERS__;\n}',
    );
    // Senza server non c'e' service worker da registrare.
    source = source.replace(/\n\s*if \('serviceWorker' in navigator\)[\s\S]*?\n\s{2}\}\n/, '\n');
  }

  scripts.push(`/* ===== ${name}.js ===== */\n${source.trim()}`);
}

const css = await read('web/assets/css/style.css');
const html = await read('index.html');

/** Sostituisce il tag <script type="module"> con dati e codice incorporati. */
function applyScripts(markup) {
  return markup.replace(
    /<script type="module"[^>]*><\/script>/,
    `<script>\nwindow.__OFFERS__ = ${JSON.stringify(dataset)};\n</script>\n`
    + `<script>\n${scripts.join('\n\n')}\n</script>`,
  );
}

// Dal guscio si tolgono i riferimenti a file esterni, che qui non esistono.
const body = html
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  .replace(/<link rel="icon"[^>]*>\s*/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/, `<style>\n${css}\n</style>`);

const bodyWithScripts = applyScripts(body);

// Il guscio (doctype, html, head, body) lo mette la pagina ospitante: qui
// restano soltanto il titolo, gli stili e il contenuto.
//
// Il ritaglio si fa sul markup originale, non su `body`: il CSS inlineato
// contiene un commento con la stringa "<body>" che sposterebbe il taglio.
const inner = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1];
if (ARTIFACT && !inner) throw new Error('impossibile isolare il contenuto di <body>');

const output = ARTIFACT
  ? [
    `<title>${html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? 'Tech Offers Hub'}</title>`,
    `<style>\n${css}\n</style>`,
    applyScripts(inner).trim(),
  ].join('\n')
  : bodyWithScripts;

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, output, 'utf8');

const kb = Math.round(Buffer.byteLength(output) / 1024);
console.log(`Scritto ${OUTPUT} (${kb} KB, ${dataset.offers.length} offerte, dati ${dataset.dataQuality}).`);
