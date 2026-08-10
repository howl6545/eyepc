/**
 * Registro dei negozi italiani da cui vengono raccolte le offerte.
 *
 * I dati di questo file sono stati verificati sul campo: per ogni negozio
 * sono stati controllati robots.txt, la raggiungibilita' delle sitemap e la
 * presenza dei dati strutturati schema.org nelle pagine prodotto.
 *
 * `mode`:
 *   - `sitemap`   sitemap XML pubblica + pagine prodotto con JSON-LD
 *   - `api`       richiede credenziali (Amazon PA-API)
 *   - `blocked`   raggiungibile solo con un accordo commerciale o un feed
 *                 (protezione anti-bot attiva): non viene mai interrogato
 */

export const STORES = [
  {
    id: 'comet',
    name: 'Comet',
    homepage: 'https://www.comet.it',
    mode: 'sitemap',
    // La sitemap di categoria e' dichiarata in robots.txt e contiene 1.900
    // prodotti di informatica: molto piu' mirata della sitemap generale.
    sitemaps: ['https://www.comet.it/sitemaps/categoria-computer-e-tablet.xml'],
    isProductUrl: (url) => /-prdtt$/.test(url),
  },
  {
    id: 'trony',
    name: 'Trony',
    homepage: 'https://www.trony.it',
    mode: 'sitemap',
    sitemaps: ['https://www.trony.it/xmlsitemap.php?type=products&page=1'],
    isProductUrl: (url) => /trony\.it\/informatica\//.test(url),
  },
  {
    id: 'euronics',
    name: 'Euronics',
    homepage: 'https://www.euronics.it',
    mode: 'sitemap',
    sitemaps: ['https://www.euronics.it/sitemap_0-product.xml'],
    isProductUrl: (url) => /euronics\.it\/informatica\/.+\/\d+\.html$/.test(url),
    // Euronics espone la tassonomia nell'URL: si selezionano direttamente i
    // reparti dei computer, senza tirare a indovinare dallo slug.
    productUrlFilter: (url) => /\/informatica\/(computer-portatili|pc-desktop|mac)\//.test(url),
  },
  {
    id: 'unieuro',
    name: 'Unieuro',
    homepage: 'https://www.unieuro.it',
    mode: 'sitemap',
    sitemaps: ['https://www.unieuro.it/sitemap.xml'],
    keepIndex: (url) => /product/i.test(url),
    isProductUrl: (url) => /unieuro\.it\/online\/.+\/pdp\//i.test(url),
    // Il robots.txt dichiara "Visit-time: 0400-0845" (UTC). Il client HTTP la
    // rispetta da solo: fuori da quella finestra il negozio viene saltato, ed
    // e' il motivo per cui il job giornaliero e' schedulato alle 05:15 UTC.
    visitWindowUtc: '04:00-08:45',
  },
  {
    id: 'amazon-it',
    name: 'Amazon.it',
    homepage: 'https://www.amazon.it',
    mode: 'api',
    // Lo scraping di Amazon e' vietato dalle condizioni d'uso: si usa la
    // Product Advertising API, che va abilitata con un account affiliato.
    requiresEnv: ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_PARTNER_TAG'],
    browseNodes: { laptop: '460090031', desktop: '460091031' },
  },
  {
    id: 'mediaworld',
    name: 'MediaWorld',
    homepage: 'https://www.mediaworld.it',
    mode: 'blocked',
    // La sitemap prodotti risponde, ma le pagine prodotto restituiscono 403:
    // c'e' una protezione anti-bot. Aggirarla sarebbe scorretto oltre che
    // fragile, quindi il negozio resta escluso finche' non c'e' un feed.
    reason: 'protezione anti-bot sulle pagine prodotto (HTTP 403)',
  },
  {
    id: 'yeppon',
    name: 'Yeppon',
    homepage: 'https://www.yeppon.it',
    mode: 'blocked',
    reason: 'challenge Cloudflare su tutto il sito (HTTP 403)',
  },
  {
    id: 'bpm-power',
    name: 'BPM Power',
    homepage: 'https://www.bpm-power.com',
    mode: 'blocked',
    reason: 'robots.txt non accessibile (HTTP 403)',
  },
];

/**
 * Parole che compaiono negli slug dei computer. Le sitemap contengono l'intero
 * reparto informatica (cavi, monitor, toner...): questo prefiltro evita di
 * scaricare migliaia di pagine che verrebbero comunque scartate.
 * Non deve essere preciso, solo generoso: la selezione vera avviene dopo,
 * sulle specifiche estratte.
 */
export const COMPUTER_SLUG_HINTS = new RegExp([
  'notebook', 'portatil', 'laptop', 'ultrabook', 'chromebook', 'macbook',
  'imac', 'mac-mini', 'mac-studio', 'all-in-one', 'desktop', 'mini-?pc',
  'workstation', 'barebone', 'nuc',
  // Gamme commerciali: spesso lo slug non dice "notebook".
  'thinkpad', 'thinkbook', 'thinkcentre', 'ideapad', 'ideacentre', 'legion', 'loq',
  'vivobook', 'zenbook', 'expertbook', 'proart', 'rog-', 'tuf-', 'zephyrus',
  'inspiron', 'latitude', 'vostro', 'optiplex', 'precision', 'xps', 'alienware',
  'pavilion', 'envy', 'spectre', 'victus', 'omen', 'elitebook', 'probook',
  'elitedesk', 'prodesk', 'aspire', 'swift', 'nitro', 'predator', 'travelmate',
  'galaxy-book', 'surface', 'matebook', 'katana', 'cyborg', 'raider', 'stealth',
  'prestige', 'modern', 'creator', 'gram', 'yoga', 'aorus',
].join('|'), 'i');

/**
 * Accessori riconoscibili gia' dall'URL. Nei negozi senza tassonomia nel
 * percorso (Comet, Trony) il prefiltro sugli slug da solo lascia passare
 * "desktop mk120" (una tastiera) o "notebook cooling stand": queste parole
 * li escludono prima di sprecare una richiesta.
 */
export const ACCESSORY_SLUG = new RegExp([
  'borsa', 'borse', 'zaino', 'custodia', 'cover', 'bag', 'sleeve',
  'tastiera', 'keyboard', 'mouse', 'mousepad', 'tappetino',
  'cavo', 'cable', 'adattator', 'hub-', 'docking', 'switch',
  'toner', 'cartucc', 'stampante', 'scanner', 'monitor',
  'cooling', 'stand', 'supporto', 'ventola', 'dissipatore',
  'cuffi', 'auricolar', 'webcam', 'chiavetta', 'ssd-esterno', 'hard-disk-esterno',
  'alimentatore', 'batteria', 'caricabatterie', 'pellicola', 'filtro',
].join('|'), 'i');

/** Parole che nello slug indicano un fisso anziche' un portatile. */
export const DESKTOP_SLUG_HINTS = new RegExp([
  'desktop', 'all-in-one', 'mini-?pc', 'imac', 'mac-mini', 'mac-studio',
  'thinkcentre', 'ideacentre', 'optiplex', 'elitedesk', 'prodesk',
  'workstation', 'barebone', 'nuc', 'tower',
].join('|'), 'i');

/** Titoli che indicano un accessorio, non un computer. */
export const ACCESSORY_TITLE = new RegExp([
  'custodia', 'borsa', 'zaino', 'cavo', 'adattator', 'alimentatore\\b',
  'monitor', 'tastiera', 'mouse', 'stampante', 'scanner', 'cartucc', 'toner',
  'carta fotografica', 'webcam', 'cuffi', 'auricolar', 'docking', 'hub usb',
  'memoria usb', 'chiavetta', 'hard disk esterno', 'ssd esterno', 'router',
  'stand', 'supporto', 'pellicola', 'batteria di ricambio', 'licenza',
  'abbonamento', 'garanzia', 'installazione',
].join('|'), 'i');

export function storeById(id) {
  return STORES.find((store) => store.id === id) ?? null;
}

/** I negozi effettivamente interrogabili con le credenziali disponibili. */
export function enabledStores(env = process.env) {
  const only = env.STORES ? new Set(env.STORES.split(',').map((s) => s.trim())) : null;

  return STORES.filter((store) => {
    if (only && !only.has(store.id)) return false;
    if (store.mode === 'blocked') return false;
    if (store.requiresEnv) return store.requiresEnv.every((key) => Boolean(env[key]));
    return true;
  });
}
