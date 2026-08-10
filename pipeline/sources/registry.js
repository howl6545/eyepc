/**
 * Registro dei negozi italiani da cui vengono raccolte le offerte.
 *
 * Ogni voce descrive *dove* cercare, non *come* leggere l'HTML: la lettura e'
 * delegata ai dati strutturati schema.org (vedi `lib/html.js`), quindi qui
 * bastano le URL di listino e un predicato che riconosca le pagine prodotto.
 *
 * `mode`:
 *   - `structured` : listino pubblico + pagine prodotto con JSON-LD
 *   - `api`        : richiede credenziali (es. Amazon PA-API); attivo solo se
 *                    le variabili d'ambiente indicate sono presenti
 */

export const STORES = [
  {
    id: 'amazon-it',
    name: 'Amazon.it',
    homepage: 'https://www.amazon.it',
    mode: 'api',
    // Lo scraping di Amazon e' vietato dalle condizioni d'uso: si usa la
    // Product Advertising API, che va abilitata con un account affiliato.
    requiresEnv: ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_PARTNER_TAG'],
    browseNodes: { laptop: '460090031', desktop: '460091031' },
    affiliateParam: 'tag',
  },
  {
    id: 'unieuro',
    name: 'Unieuro',
    homepage: 'https://www.unieuro.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.unieuro.it/online/Notebook'],
      desktop: ['https://www.unieuro.it/online/PC-Desktop'],
    },
    isProductUrl: (url) => /unieuro\.it\/online\/.+\/pdp\/|\/p\//i.test(url),
  },
  {
    id: 'mediaworld',
    name: 'MediaWorld',
    homepage: 'https://www.mediaworld.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.mediaworld.it/it/category/_notebook-687923.html'],
      desktop: ['https://www.mediaworld.it/it/category/_pc-desktop-687925.html'],
    },
    isProductUrl: (url) => /mediaworld\.it\/it\/product\//i.test(url),
  },
  {
    id: 'euronics',
    name: 'Euronics',
    homepage: 'https://www.euronics.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.euronics.it/informatica/notebook/'],
      desktop: ['https://www.euronics.it/informatica/computer-desktop/'],
    },
    isProductUrl: (url) => /euronics\.it\/.+\/p\/|\/prodotto\//i.test(url),
  },
  {
    id: 'monclick',
    name: 'Monclick',
    homepage: 'https://www.monclick.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.monclick.it/notebook'],
      desktop: ['https://www.monclick.it/pc-desktop'],
    },
    isProductUrl: (url) => /monclick\.it\/.+-\d{5,}/i.test(url),
  },
  {
    id: 'comet',
    name: 'Comet',
    homepage: 'https://www.comet.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.comet.it/informatica/notebook'],
      desktop: ['https://www.comet.it/informatica/pc-desktop'],
    },
    isProductUrl: (url) => /comet\.it\/.+\/p\d+|\/prodotto\//i.test(url),
  },
  {
    id: 'trony',
    name: 'Trony',
    homepage: 'https://www.trony.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.trony.it/online/notebook'],
      desktop: ['https://www.trony.it/online/pc-desktop'],
    },
    isProductUrl: (url) => /trony\.it\/online\/.+\/\d+/i.test(url),
  },
  {
    id: 'drop',
    name: 'Drop (Next)',
    homepage: 'https://www.drop.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.drop.it/notebook'],
      desktop: ['https://www.drop.it/pc-desktop'],
    },
    isProductUrl: (url) => /drop\.it\/.+\/\d+/i.test(url),
  },
  {
    id: 'bpm-power',
    name: 'BPM Power',
    homepage: 'https://www.bpm-power.com',
    mode: 'structured',
    listings: {
      laptop: ['https://www.bpm-power.com/it/notebook'],
      desktop: ['https://www.bpm-power.com/it/pc-desktop'],
    },
    isProductUrl: (url) => /bpm-power\.com\/it\/.+\/\d+/i.test(url),
  },
  {
    id: 'yeppon',
    name: 'Yeppon',
    homepage: 'https://www.yeppon.it',
    mode: 'structured',
    listings: {
      laptop: ['https://www.yeppon.it/informatica/notebook'],
      desktop: ['https://www.yeppon.it/informatica/pc-desktop'],
    },
    isProductUrl: (url) => /yeppon\.it\/.+-p\d+/i.test(url),
  },
];

export function storeById(id) {
  return STORES.find((store) => store.id === id) ?? null;
}

/** I negozi effettivamente utilizzabili con le credenziali disponibili. */
export function enabledStores(env = process.env) {
  const only = env.STORES ? new Set(env.STORES.split(',').map((s) => s.trim())) : null;

  return STORES.filter((store) => {
    if (only && !only.has(store.id)) return false;
    if (store.requiresEnv) return store.requiresEnv.every((key) => Boolean(env[key]));
    return true;
  });
}
