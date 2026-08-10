/**
 * Estrazione dati da HTML senza dipendenze esterne.
 *
 * Scelta progettuale: invece di inseguire i selettori CSS di ogni negozio
 * (che cambiano di continuo e si rompono a ogni restyling), leggiamo i dati
 * strutturati che i siti e-commerce pubblicano gia' per Google Shopping:
 * JSON-LD schema.org `Product` / `Offer`, con fallback su microdata e
 * meta tag OpenGraph. E' molto piu' stabile e non richiede un parser DOM.
 */

const SCRIPT_LD_JSON = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const META_RE = /<meta\s+([^>]+)>/gi;
const ATTR_RE = /([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g;
const TAG_RE = /<[^>]*>/g;

const HTML_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  eacute: 'é', egrave: 'è', agrave: 'à', ograve: 'ò', ugrave: 'ù', igrave: 'ì',
  euro: '€', deg: '°', times: '×', hellip: '…', ndash: '–', mdash: '—',
};

export function decodeEntities(text) {
  if (!text) return '';
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match);
}

export function stripTags(html) {
  if (!html) return '';
  return decodeEntities(
    String(html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|\/p|\/li|\/tr|\/div|\/h[1-6])[^>]*>/gi, '\n')
      .replace(TAG_RE, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Ritorna tutti gli oggetti JSON-LD presenti nella pagina, appiattiti. */
export function extractJsonLd(html) {
  const results = [];

  for (const match of html.matchAll(SCRIPT_LD_JSON)) {
    const raw = match[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue; // JSON-LD malformato: capita, si ignora il blocco.
    }
    flattenJsonLd(parsed, results);
  }

  return results;
}

function flattenJsonLd(node, out) {
  if (Array.isArray(node)) {
    for (const item of node) flattenJsonLd(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;

  out.push(node);
  if (node['@graph']) flattenJsonLd(node['@graph'], out);
  for (const key of ['mainEntity', 'itemListElement', 'item', 'hasVariant']) {
    if (node[key]) flattenJsonLd(node[key], out);
  }
}

function typeOf(node) {
  const type = node['@type'];
  if (!type) return [];
  return (Array.isArray(type) ? type : [type]).map((t) => String(t).toLowerCase());
}

/** Estrae i `<meta>` in una mappa name/property -> content. */
export function extractMeta(html) {
  const meta = {};
  for (const match of html.matchAll(META_RE)) {
    const attrs = {};
    for (const attr of match[1].matchAll(ATTR_RE)) {
      const key = (attr[1] ?? attr[3] ?? '').toLowerCase();
      attrs[key] = decodeEntities(attr[2] ?? attr[4] ?? '');
    }
    const key = attrs.property ?? attrs.name ?? attrs.itemprop;
    if (key && attrs.content) meta[key.toLowerCase()] = attrs.content;
  }
  return meta;
}

function pickOffer(offers) {
  const list = Array.isArray(offers) ? offers : [offers];
  const candidates = list
    .filter(Boolean)
    .flatMap((offer) => (offer['@type'] && typeOf(offer).includes('aggregateoffer')
      ? [{ ...offer, price: offer.lowPrice ?? offer.price }]
      : [offer]));

  // A parita' di dati preferiamo l'offerta disponibile con il prezzo piu' basso.
  const scored = candidates
    .map((offer) => ({ offer, price: parsePrice(offer.price ?? offer.lowPrice) }))
    .filter((entry) => entry.price != null)
    .sort((a, b) => a.price - b.price);

  return scored[0]?.offer ?? candidates[0] ?? null;
}

export function parsePrice(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let text = String(raw).replace(/[^\d.,]/g, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Formato italiano: 1.299,00
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Formato anglosassone: 1,299.00
    text = text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    text = text.replace(',', '.');
  }

  const value = Number.parseFloat(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeAvailability(raw) {
  if (!raw) return null;
  const value = String(raw).toLowerCase();
  if (value.includes('instock') || value.includes('in_stock') || value.includes('disponibile')) return 'disponibile';
  if (value.includes('preorder')) return 'preordine';
  if (value.includes('backorder')) return 'in arrivo';
  if (value.includes('outofstock') || value.includes('soldout')) return 'esaurito';
  return null;
}

function collectPropertyValues(node) {
  const properties = {};
  const raw = node.additionalProperty;
  if (!raw) return properties;
  for (const entry of Array.isArray(raw) ? raw : [raw]) {
    if (entry?.name && entry?.value != null) properties[String(entry.name)] = String(entry.value);
  }
  return properties;
}

/**
 * Trasforma una pagina prodotto in un record grezzo comune a tutti i negozi.
 * @returns {object|null}
 */
export function parseProductPage(html, pageUrl) {
  const nodes = extractJsonLd(html);
  const product = nodes.find((node) => typeOf(node).includes('product'));
  const meta = extractMeta(html);

  const offer = product ? pickOffer(product.offers) : null;
  const price = parsePrice(offer?.price) ?? parsePrice(meta['product:price:amount']) ?? parsePrice(meta['og:price:amount']);

  const title = product?.name ?? meta['og:title'] ?? extractTitleTag(html);
  if (!title) return null;

  const properties = product ? collectPropertyValues(product) : {};
  const descriptionParts = [
    product?.description,
    meta['og:description'],
    meta.description,
    ...Object.entries(properties).map(([key, value]) => `${key}: ${value}`),
  ].filter(Boolean);

  return {
    title: decodeEntities(title).trim(),
    url: offer?.url ?? product?.url ?? meta['og:url'] ?? pageUrl,
    image: pickImage(product?.image) ?? meta['og:image'] ?? null,
    brand: typeof product?.brand === 'object' ? product.brand?.name ?? null : product?.brand ?? null,
    sku: product?.sku ?? product?.mpn ?? null,
    gtin: product?.gtin13 ?? product?.gtin ?? null,
    price,
    currency: offer?.priceCurrency ?? meta['product:price:currency'] ?? 'EUR',
    availability: normalizeAvailability(offer?.availability ?? meta['product:availability']),
    rating: product?.aggregateRating?.ratingValue != null ? Number(product.aggregateRating.ratingValue) : null,
    reviewCount: product?.aggregateRating?.reviewCount != null ? Number(product.aggregateRating.reviewCount) : null,
    properties,
    description: decodeEntities(descriptionParts.join('\n')),
    // Il testo completo alimenta il motore di estrazione delle specifiche.
    fullText: [decodeEntities(title), decodeEntities(descriptionParts.join('\n')), stripTags(pickSpecSection(html))]
      .filter(Boolean)
      .join('\n'),
  };
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim() : null;
}

function pickImage(image) {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return pickImage(image[0]);
  return image.url ?? image.contentUrl ?? null;
}

/**
 * Ritaglia la porzione di HTML che con ogni probabilita' contiene la tabella
 * delle specifiche, per non dare in pasto al parser l'intera pagina (menu,
 * footer e prodotti correlati generano falsi positivi).
 */
function pickSpecSection(html) {
  const patterns = [
    /<(table|dl|ul)[^>]*(?:class|id)="[^"]*(?:spec|scheda|tecnic|caratteristic|dettagli)[^"]*"[\s\S]{0,20000}?<\/\1>/i,
    /<div[^>]*(?:class|id)="[^"]*(?:spec|scheda-tecnica|caratteristiche)[^"]*"[\s\S]{0,20000}?<\/div>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[0];
  }
  return '';
}

/** Estrae i link assoluti che soddisfano un predicato. */
export function extractLinks(html, baseUrl, predicate = () => true) {
  const links = new Set();
  for (const match of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    let href = decodeEntities(match[1]);
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const absolute = new URL(href, baseUrl).toString().split('#')[0];
      if (predicate(absolute)) links.add(absolute);
    } catch {
      // href non valido: si ignora.
    }
  }
  return [...links];
}
