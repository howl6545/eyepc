/**
 * Collector: dal registro dei negozi alle offerte grezze.
 *
 * Il percorso e' sempre lo stesso:
 *   sitemap → prefiltro sugli slug → pagina prodotto → JSON-LD → specifiche
 *
 * L'ultimo filtro non guarda l'URL ma il risultato dell'estrazione: se da una
 * pagina non escono processore, RAM e archiviazione, quello non e' un computer
 * e viene scartato. E' cosi' che monitor, cavi e toner non entrano nell'app
 * anche quando il prefiltro sugli slug li lascia passare.
 */

import { fetchPage, RobotsDisallowedError, VisitTimeError } from '../lib/http.js';
import { parseProductPage } from '../lib/html.js';
import { collectSitemapUrls } from '../lib/sitemap.js';
import {
  ACCESSORY_SLUG, ACCESSORY_TITLE, COMPUTER_SLUG_HINTS, DESKTOP_SLUG_HINTS,
} from './registry.js';

const DEFAULT_MAX_PRODUCTS = 60;

/** Un'offerta e' un computer se ne conosciamo i tre componenti portanti. */
export function looksLikeComputer(offer) {
  if (!offer) return false;
  if (ACCESSORY_TITLE.test(offer.title)) return false;

  const { specs } = offer;
  const hasCpu = Boolean(specs.cpu);
  const hasRam = Boolean(specs.ram);
  const hasStorage = Boolean(specs.storage?.length);

  return hasCpu && hasRam && hasStorage;
}

/**
 * Raccoglie le offerte di un singolo negozio.
 * @returns {{records: object[], notes: string[]}}
 */
export async function collectFromStore(store, options = {}) {
  const {
    maxProducts = DEFAULT_MAX_PRODUCTS,
    logger = console,
  } = options;

  const notes = [];

  if (store.mode !== 'sitemap') {
    return { records: [], notes: [`modalita' "${store.mode}" non gestita dal collector`] };
  }

  /* -------------------------------------------------- scoperta degli URL -- */

  let entries = [];
  for (const sitemap of store.sitemaps ?? []) {
    try {
      const found = await collectSitemapUrls(sitemap, {
        keepIndex: store.keepIndex ?? (() => true),
        keepUrl: (url) => store.isProductUrl(url),
        logger,
      });
      entries.push(...found);
    } catch (error) {
      if (error instanceof VisitTimeError || error instanceof RobotsDisallowedError) {
        return { records: [], notes: [error.message] };
      }
      notes.push(`sitemap non leggibile: ${error.message}`);
    }
  }

  if (!entries.length) return { records: [], notes: [...notes, 'nessun URL prodotto trovato'] };

  const discovered = entries.length;

  // Prefiltro. Dove il negozio espone la categoria nell'URL si usa quella,
  // altrimenti ci si affida allo slug escludendo gli accessori.
  const keep = store.productUrlFilter
    ?? ((url) => COMPUTER_SLUG_HINTS.test(url) && !ACCESSORY_SLUG.test(url));

  const candidates = entries.filter((entry) => keep(entry.loc));

  // Le pagine aggiornate di recente sono quelle in cui il prezzo e' appena
  // cambiato: a parita' di tutto vengono prima.
  const byFreshness = (a, b) => String(b.lastmod ?? '').localeCompare(String(a.lastmod ?? ''));

  // I fissi sono sempre una minoranza del catalogo: senza riservare loro meta'
  // del budget, una raccolta a campione restituirebbe soltanto portatili.
  const desktops = candidates.filter((entry) => DESKTOP_SLUG_HINTS.test(entry.loc)).sort(byFreshness);
  const laptops = candidates.filter((entry) => !DESKTOP_SLUG_HINTS.test(entry.loc)).sort(byFreshness);

  const half = Math.floor(maxProducts / 2);
  const picked = [
    ...desktops.slice(0, Math.max(half, maxProducts - laptops.length)),
    ...laptops.slice(0, maxProducts - Math.min(desktops.length, half)),
  ].slice(0, maxProducts);

  notes.push(
    `${discovered} in sitemap, ${candidates.length} candidati, `
    + `${picked.length} scaricati (${desktops.length} fissi disponibili)`,
  );

  /* ------------------------------------------------------- pagine prodotto */

  const records = [];
  let failed = 0;

  for (const entry of picked) {
    try {
      const html = await fetchPage(entry.loc);
      const parsed = parseProductPage(html, entry.loc);
      if (!parsed?.price) continue;
      records.push({ ...parsed, storeId: store.id, storeName: store.name });
    } catch (error) {
      if (error instanceof VisitTimeError) {
        notes.push(error.message);
        break;
      }
      failed += 1;
    }
  }

  if (failed) notes.push(`${failed} pagine prodotto non leggibili`);

  return { records, notes };
}

/** Esegue la raccolta su tutti i negozi indicati; gli host girano in parallelo. */
export async function collectAll(stores, options = {}) {
  const { logger = console } = options;
  const records = [];
  const report = [];

  const runs = stores.map(async (store) => {
    const result = await collectFromStore(store, { ...options, logger });
    return { store, ...result };
  });

  for (const settled of await Promise.allSettled(runs)) {
    if (settled.status === 'rejected') {
      report.push({ store: 'sconosciuto', count: 0, notes: [String(settled.reason?.message ?? settled.reason)] });
      continue;
    }
    const { store, records: storeRecords, notes } = settled.value;
    records.push(...storeRecords);
    report.push({ store: store.id, count: storeRecords.length, notes });
    logger.log?.(`[${store.id}] ${storeRecords.length} record — ${notes.join('; ') || 'ok'}`);
  }

  return { records, report };
}
