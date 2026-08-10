import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isAllowedByRobots, parseRobots } from '../lib/http.js';
import { parsePrice, parseProductPage, stripTags } from '../lib/html.js';
import { mergeWithHistory, referencePrice } from '../lib/history.js';
import { dedupeOffers } from '../lib/dedupe.js';
import { hardwareScore, scoreOffers } from '../lib/score.js';
import { canonicalUrl, cleanTitle, declaredDiscount, modelKey } from '../lib/normalize.js';

/* -------------------------------------------------------------- robots -- */

test('robots.txt: applica il gruppo del nostro user-agent', () => {
  const robots = parseRobots(`
    User-agent: *
    Disallow: /

    User-agent: TechOffersHubBot
    Disallow: /carrello
    Allow: /
  `);

  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/notebook'), true);
  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/carrello/aggiungi'), false);
});

test('robots.txt: senza gruppo dedicato vale il jolly', () => {
  const robots = parseRobots('User-agent: *\nDisallow: /privato');
  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/privato/x'), false);
  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/pubblico'), true);
});

test('robots.txt: vince la regola con il prefisso piu lungo', () => {
  const robots = parseRobots('User-agent: *\nDisallow: /p\nAllow: /prodotti');
  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/prodotti/123'), true);
  assert.equal(isAllowedByRobots(robots, 'https://negozio.it/pagamento'), false);
});

/* ---------------------------------------------------------------- HTML -- */

test('interpreta i prezzi nei formati italiano e anglosassone', () => {
  assert.equal(parsePrice('1.299,00 €'), 1299);
  assert.equal(parsePrice('1,299.00'), 1299);
  assert.equal(parsePrice('899,90'), 899.9);
  assert.equal(parsePrice(749), 749);
  assert.equal(parsePrice('gratis'), null);
});

test('legge una pagina prodotto da JSON-LD', () => {
  const html = `
    <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Notebook ASUS TUF Gaming A15",
        "brand": { "@type": "Brand", "name": "ASUS" },
        "sku": "TUF-A15-001",
        "image": ["https://cdn.negozio.it/a15.jpg"],
        "offers": {
          "@type": "Offer",
          "price": "899.00",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "url": "https://negozio.it/p/tuf-a15"
        },
        "additionalProperty": [
          { "@type": "PropertyValue", "name": "RAM", "value": "16GB DDR5" }
        ]
      }
      </script>
    </head><body></body></html>`;

  const product = parseProductPage(html, 'https://negozio.it/p/tuf-a15');
  assert.equal(product.title, 'Notebook ASUS TUF Gaming A15');
  assert.equal(product.brand, 'ASUS');
  assert.equal(product.price, 899);
  assert.equal(product.availability, 'disponibile');
  assert.equal(product.sku, 'TUF-A15-001');
  assert.match(product.fullText, /16GB DDR5/);
});

test('fra piu offerte sceglie la piu conveniente', () => {
  const html = `<script type="application/ld+json">{
    "@type":"Product","name":"PC",
    "offers":[{"price":"999","priceCurrency":"EUR"},{"price":"899","priceCurrency":"EUR"}]
  }</script>`;
  assert.equal(parseProductPage(html, 'https://x.it/p').price, 899);
});

test('stripTags rimuove script e decodifica le entita', () => {
  const text = stripTags('<div>Prezzo &egrave; 1.299&nbsp;&euro;<script>alert(1)</script></div>');
  assert.match(text, /Prezzo è 1\.299 €/);
  assert.doesNotMatch(text, /alert/);
});

/* ----------------------------------------------------------- normalize -- */

test('canonicalUrl elimina i parametri di tracciamento', () => {
  assert.equal(
    canonicalUrl('https://negozio.it/p/pc?utm_source=news&colore=nero&gclid=abc#recensioni'),
    'https://negozio.it/p/pc?colore=nero',
  );
});

test('cleanTitle toglie il rumore di marketing', () => {
  assert.equal(cleanTitle('OFFERTA: Notebook ASUS | Spedizione gratuita'), 'Notebook ASUS');
});

test('lo sconto dichiarato fuori scala viene scartato', () => {
  assert.deepEqual(declaredDiscount(100, 200), { listPrice: 200, discountPct: 50, source: 'negozio' });
  assert.equal(declaredDiscount(100, 99), null);
  assert.equal(declaredDiscount(10, 5000), null); // -99%: prezzo di listino non credibile
});

test('la chiave di modello ignora il titolo e guarda le specifiche', () => {
  const base = {
    brand: 'Lenovo',
    category: 'laptop',
    specs: {
      cpu: { label: 'Core i7-13650HX' },
      gpu: { model: 'GeForce RTX 4060' },
      ram: { size: 16, type: 'DDR5' },
      storage: [{ type: 'SSD NVMe', sizeGb: 512 }],
      display: { resolution: '1920x1080', sizeInch: 15.6 },
    },
  };
  const variant = { ...base, specs: { ...base.specs, ram: { size: 32, type: 'DDR5' } } };

  assert.equal(modelKey(base), modelKey({ ...base }));
  assert.notEqual(modelKey(base), modelKey(variant));
});

/* ------------------------------------------------------------- storico -- */

test('il prezzo di riferimento ignora i picchi isolati', () => {
  const today = '2026-08-10';
  const points = [
    ...Array.from({ length: 10 }, (_, i) => ({ d: `2026-08-0${i % 9}`.slice(0, 10), p: 1000 })),
    { d: '2026-07-15', p: 4000 }, // errore di listino
  ];
  const reference = referencePrice(points, today);
  assert.ok(reference <= 1000, `atteso <= 1000, ottenuto ${reference}`);
});

test('lo sconto verificato prevale su un listino gonfiato', () => {
  const now = new Date('2026-08-10T08:00:00Z');
  const previous = {
    offers: [{
      id: 'abc',
      price: 800,
      seenAt: '2026-08-09T08:00:00Z',
      firstSeenAt: '2026-07-01T08:00:00Z',
      priceHistory: Array.from({ length: 20 }, (_, i) => ({
        d: new Date(Date.UTC(2026, 6, 20 + i)).toISOString().slice(0, 10),
        p: 820,
      })),
    }],
  };

  const fresh = [{
    id: 'abc',
    price: 780,
    // Il negozio dichiara un listino di 2000 €, cioe' un improbabile -61%.
    listPrice: 2000,
    discountPct: 61,
    discountSource: 'negozio',
    seenAt: now.toISOString(),
    category: 'laptop',
    specs: {},
  }];

  const [merged] = mergeWithHistory(fresh, previous, now);
  assert.equal(merged.discountSource, 'storico');
  assert.ok(merged.discountPct < 61, `atteso < 61, ottenuto ${merged.discountPct}`);
  assert.equal(merged.isLowestEver, true);
  assert.deepEqual(merged.priceChange, { from: 800, to: 780, deltaPct: -2, since: '2026-08-09T08:00:00Z' });
});

test('le offerte sparite restano per qualche giorno, poi cadono', () => {
  const now = new Date('2026-08-10T08:00:00Z');
  const previous = {
    offers: [
      { id: 'recente', price: 500, seenAt: '2026-08-08T08:00:00Z', priceHistory: [] },
      { id: 'vecchia', price: 500, seenAt: '2026-07-20T08:00:00Z', priceHistory: [] },
    ],
  };

  const merged = mergeWithHistory([], previous, now);
  assert.deepEqual(merged.map((offer) => offer.id), ['recente']);
  assert.equal(merged[0].isStale, true);
});

/* ------------------------------------------------------------ deduplica -- */

test('accorpa lo stesso modello su negozi diversi tenendo il piu economico', () => {
  const make = (id, storeId, price) => ({
    id,
    modelKey: 'stesso-modello',
    specsCompleteness: 90,
    price,
    availability: 'disponibile',
    url: `https://${storeId}.it/p/${id}`,
    store: { id: storeId, name: storeId },
  });

  const [primary] = dedupeOffers([make('a', 'unieuro', 999), make('b', 'comet', 899), make('c', 'drop', 1099)]);

  assert.equal(primary.price, 899);
  assert.equal(primary.store.id, 'comet');
  assert.equal(primary.otherStores.length, 2);
  assert.equal(primary.marketDelta.storeCount, 3);
  assert.equal(primary.marketDelta.savedPct, 10);
});

test('le offerte con specifiche scarse non vengono accorpate', () => {
  const poor = (id) => ({
    id, modelKey: 'k', specsCompleteness: 10, price: 100,
    availability: 'disponibile', url: `https://x.it/${id}`, store: { id: 'x', name: 'X' },
  });
  assert.equal(dedupeOffers([poor('a'), poor('b')]).length, 2);
});

/* -------------------------------------------------------------- punteggi */

test('il punteggio hardware ordina le configurazioni come atteso', () => {
  const build = (cpu, gpu, ram, storage) => ({
    category: 'desktop',
    specs: {
      cpu: { label: cpu, family: cpu },
      gpu: { model: gpu, type: 'dedicata' },
      ram: { size: ram, type: 'DDR5' },
      storage: [{ type: 'SSD NVMe', sizeGb: storage }],
    },
  });

  const top = hardwareScore(build('Core i9-14900K', 'GeForce RTX 4090', 64, 2048));
  const mid = hardwareScore(build('Core i5-14400F', 'GeForce RTX 4060', 16, 512));
  const low = hardwareScore(build('Celeron N4020', 'UHD Graphics', 8, 128));

  assert.ok(top > mid && mid > low, `${top} > ${mid} > ${low}`);
});

test('il punteggio qualita/prezzo e normalizzato per categoria', () => {
  const offers = [
    { category: 'laptop', price: 500, specs: { cpu: { label: 'Core i5' }, ram: { size: 16 } } },
    { category: 'laptop', price: 3000, specs: { cpu: { label: 'Core i5' }, ram: { size: 16 } } },
    { category: 'desktop', price: 400, specs: { cpu: { label: 'Core i9' }, ram: { size: 32 } } },
  ];

  scoreOffers(offers);
  assert.equal(offers[0].valueScore, 100); // migliore fra i portatili
  assert.equal(offers[1].valueScore, 0);
  assert.equal(offers[2].valueScore, 50); // unico fisso: nessun termine di paragone, punteggio neutro
});
