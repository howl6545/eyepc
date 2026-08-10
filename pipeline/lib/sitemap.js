/**
 * Lettura delle sitemap XML.
 *
 * Perche' le sitemap e non le pagine di listino: verificando i negozi italiani
 * sul campo, i loro listini sono tutti applicazioni JavaScript (Angular su
 * Unieuro, Algolia su Comet) e l'HTML servito non contiene un solo link a un
 * prodotto. Le sitemap invece sono XML statico, dichiarato in robots.txt e
 * pubblicato apposta per essere letto dai crawler: e' la fonte giusta.
 */

import { gunzipSync } from 'node:zlib';
import { fetchPage, fetchBuffer } from './http.js';

const LOC_RE = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
const URL_BLOCK_RE = /<url>([\s\S]*?)<\/url>/gi;
const LASTMOD_RE = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i;

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

/** Scarica una sitemap, scompattandola se e' `.gz`. */
async function loadSitemap(url, options) {
  if (url.endsWith('.gz')) {
    const buffer = await fetchBuffer(url, options);
    return gunzipSync(buffer).toString('utf8');
  }
  return fetchPage(url, options);
}

/** `true` se il documento e' un indice di sitemap anziche' un elenco di URL. */
function isIndex(xml) {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * Estrae le voci di una sitemap: `{ loc, lastmod }`.
 * Funziona sia sugli indici sia sugli elenchi di URL.
 */
export function parseSitemap(xml) {
  const entries = [];
  const blocks = [...xml.matchAll(URL_BLOCK_RE)];

  if (blocks.length) {
    for (const block of blocks) {
      const loc = block[1].match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i);
      if (!loc) continue;
      const lastmod = block[1].match(LASTMOD_RE);
      entries.push({
        loc: decodeXml(loc[1]),
        lastmod: lastmod ? decodeXml(lastmod[1]) : null,
      });
    }
    return entries;
  }

  // Indice di sitemap (o elenco senza wrapper <url>): bastano le <loc>.
  for (const match of xml.matchAll(LOC_RE)) {
    entries.push({ loc: decodeXml(match[1]), lastmod: null });
  }
  return entries;
}

/**
 * Raccoglie gli URL di una sitemap, seguendo gli indici in profondita'.
 *
 * @param {string} rootUrl        sitemap di partenza
 * @param {object} [options]
 * @param {(url: string) => boolean} [options.keepIndex]  quali sotto-sitemap seguire
 * @param {(url: string) => boolean} [options.keepUrl]    quali URL tenere
 * @param {number} [options.maxSitemaps]  limite di sotto-sitemap da scaricare
 * @param {number} [options.maxUrls]      limite di URL raccolti
 */
export async function collectSitemapUrls(rootUrl, options = {}) {
  const {
    keepIndex = () => true,
    keepUrl = () => true,
    maxSitemaps = 6,
    maxUrls = 5000,
    logger = console,
  } = options;

  const seen = new Set();
  const found = [];
  const queue = [rootUrl];
  let downloaded = 0;

  while (queue.length && found.length < maxUrls && downloaded <= maxSitemaps) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);

    let xml;
    try {
      xml = await loadSitemap(current, options);
      downloaded += 1;
    } catch (error) {
      logger.warn?.(`sitemap non leggibile (${current}): ${error.message}`);
      continue;
    }

    const entries = parseSitemap(xml);

    if (isIndex(xml)) {
      for (const entry of entries) {
        if (entry.loc !== current && keepIndex(entry.loc)) queue.push(entry.loc);
      }
      continue;
    }

    for (const entry of entries) {
      if (found.length >= maxUrls) break;
      if (keepUrl(entry.loc)) found.push(entry);
    }
  }

  return found;
}
