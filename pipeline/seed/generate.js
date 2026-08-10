/**
 * Genera il dataset dimostrativo, comprensivo di storico prezzi sintetico.
 *
 * I record passano attraverso lo stesso `normalizeRecord` usato dai dati
 * reali: se il motore di estrazione sbaglia, si vede subito qui.
 */

import { normalizeRecord } from '../lib/normalize.js';
import { dayStamp } from '../lib/history.js';
import { LAPTOPS, DESKTOPS, STORE_POOL } from './catalogue.js';

/** PRNG deterministico: due esecuzioni consecutive non devono divergere. */
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

/**
 * Ricostruisce uno storico plausibile: prezzo di listino per la maggior parte
 * dei giorni, poi un calo verso il prezzo attuale nell'ultima settimana.
 */
function buildHistory(currentPrice, listPrice, days, random, now) {
  const points = [];
  const dropStart = days - Math.floor(3 + random() * 6);

  for (let index = 0; index < days; index += 1) {
    const date = new Date(now.getTime() - (days - 1 - index) * 86_400_000);
    let price;

    if (index < dropStart) {
      // Piccole oscillazioni attorno al prezzo pieno.
      price = listPrice * (0.96 + random() * 0.06);
    } else {
      const progress = (index - dropStart) / Math.max(1, days - 1 - dropStart);
      price = listPrice + (currentPrice - listPrice) * Math.min(1, progress + random() * 0.25);
    }

    points.push({ d: dayStamp(date), p: Math.round(price * 100) / 100 });
  }

  points[points.length - 1].p = currentPrice;
  return points;
}

export function generateSeedOffers(now = new Date()) {
  const random = makeRandom(20_260_810);
  const offers = [];

  const entries = [
    ...LAPTOPS.map((row) => ({ row, category: 'laptop' })),
    ...DESKTOPS.map((row) => ({ row, category: 'desktop' })),
  ];

  entries.forEach(({ row, category }, index) => {
    const [title, price, listPrice] = row;
    const store = STORE_POOL[index % STORE_POOL.length];
    const slug = slugify(title.split(',')[0]);

    const record = {
      title,
      fullText: title,
      url: `https://www.${store.id.replace('-', '')}.it/p/${slug}-${1000 + index}`,
      image: null,
      price,
      listPrice,
      currency: 'EUR',
      availability: random() > 0.94 ? 'esaurito' : 'disponibile',
      rating: Math.round((3.6 + random() * 1.4) * 10) / 10,
      reviewCount: Math.floor(8 + random() * 900),
      storeId: store.id,
      storeName: store.name,
      category,
      properties: {},
    };

    const offer = normalizeRecord(record, now);
    if (!offer) return;

    const days = 20 + Math.floor(random() * 40);
    offer.priceHistory = buildHistory(price, listPrice, days, random, now);
    offer.firstSeenAt = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString();
    offer.isSeed = true;

    // Alcune offerte compaiono anche su un secondo negozio, a prezzo diverso:
    // serve a esercitare la deduplica e la sezione "dove comprarlo".
    if (random() > 0.62) {
      const alt = STORE_POOL[(index + 3) % STORE_POOL.length];
      offer.otherStores = [{
        storeId: alt.id,
        storeName: alt.name,
        price: Math.round(price * (1.02 + random() * 0.12) * 100) / 100,
        url: `https://www.${alt.id.replace('-', '')}.it/p/${slug}-${2000 + index}`,
        availability: 'disponibile',
      }];
    }

    offers.push(offer);
  });

  return offers;
}

// Esecuzione diretta: stampa il dataset su stdout, utile per ispezionarlo.
if (import.meta.url === `file://${process.argv[1]}`) {
  const offers = generateSeedOffers();
  process.stdout.write(`${JSON.stringify(offers, null, 2)}\n`);
  console.error(`Generate ${offers.length} offerte dimostrative.`);
}
