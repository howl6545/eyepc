/**
 * Collector generico: dato un negozio del registro, ne visita i listini,
 * raccoglie i link alle pagine prodotto e li normalizza in record grezzi.
 *
 * Il collector e' volutamente conservativo: se un listino non e' leggibile o
 * robots.txt lo vieta, il negozio viene semplicemente saltato e l'errore
 * finisce nel report della run, senza far fallire l'intera raccolta.
 */

import { fetchPage, RobotsDisallowedError } from '../lib/http.js';
import { parseProductPage, extractLinks } from '../lib/html.js';

const DEFAULT_MAX_PRODUCTS_PER_CATEGORY = 40;

/**
 * @param {object} store voce del registro
 * @param {'laptop'|'desktop'} category
 * @param {object} [options]
 */
export async function collectFromStore(store, category, options = {}) {
  const {
    maxProducts = DEFAULT_MAX_PRODUCTS_PER_CATEGORY,
    logger = console,
  } = options;

  if (store.mode !== 'structured') {
    return { records: [], skipped: `${store.id}: modalita' "${store.mode}" non gestita dal collector generico` };
  }

  const listings = store.listings?.[category] ?? [];
  if (!listings.length) return { records: [], skipped: `${store.id}: nessun listino per ${category}` };

  const productUrls = new Set();

  for (const listingUrl of listings) {
    try {
      const html = await fetchPage(listingUrl);
      for (const link of extractLinks(html, listingUrl, store.isProductUrl)) {
        productUrls.add(link);
        if (productUrls.size >= maxProducts) break;
      }
    } catch (error) {
      if (error instanceof RobotsDisallowedError) {
        return { records: [], skipped: `${store.id}: ${error.message}` };
      }
      logger.warn?.(`[${store.id}] listino non leggibile (${listingUrl}): ${error.message}`);
    }
    if (productUrls.size >= maxProducts) break;
  }

  const records = [];
  const errors = [];

  for (const url of productUrls) {
    try {
      const html = await fetchPage(url);
      const parsed = parseProductPage(html, url);
      if (!parsed?.price) continue;
      records.push({ ...parsed, storeId: store.id, storeName: store.name, category });
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  return { records, errors };
}

/** Esegue la raccolta su tutti i negozi indicati, in sequenza per host. */
export async function collectAll(stores, options = {}) {
  const { categories = ['laptop', 'desktop'], logger = console } = options;
  const records = [];
  const report = [];

  // I negozi girano in parallelo tra loro (host diversi), le categorie in
  // sequenza dentro ogni negozio: il throttle di `http.js` e' per host.
  const runs = stores.map(async (store) => {
    const storeRecords = [];
    const notes = [];

    for (const category of categories) {
      const result = await collectFromStore(store, category, { ...options, logger });
      storeRecords.push(...result.records);
      if (result.skipped) notes.push(result.skipped);
      if (result.errors?.length) notes.push(`${result.errors.length} pagine prodotto non leggibili`);
    }

    return { store, storeRecords, notes };
  });

  for (const settled of await Promise.allSettled(runs)) {
    if (settled.status === 'rejected') {
      report.push({ store: 'sconosciuto', count: 0, notes: [String(settled.reason?.message ?? settled.reason)] });
      continue;
    }
    const { store, storeRecords, notes } = settled.value;
    records.push(...storeRecords);
    report.push({ store: store.id, count: storeRecords.length, notes });
  }

  return { records, report };
}
