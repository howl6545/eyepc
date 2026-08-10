/**
 * Punteggio "qualita'/prezzo".
 *
 * Lo sconto da solo inganna: un PC scontato del 40% puo' restare un pessimo
 * affare. Qui stimiamo un punteggio hardware grezzo e lo rapportiamo al
 * prezzo, poi normalizziamo sul dataset del giorno. Serve per l'ordinamento
 * "Miglior rapporto qualita'/prezzo" e per il badge "Ottimo affare".
 */

const CPU_TIERS = [
  [/apple m[45]\s*(max|ultra)/i, 100], [/apple m[45]\s*pro/i, 88], [/apple m[45]/i, 74],
  [/apple m[23]\s*(max|ultra)/i, 86], [/apple m[23]\s*pro/i, 76], [/apple m[123]/i, 62],
  [/core ultra 9|ryzen (ai )?9/i, 95], [/core ultra 7|ryzen (ai )?7/i, 80],
  [/core ultra 5|ryzen (ai )?5/i, 64], [/core ultra 3|ryzen (ai )?3/i, 46],
  [/core i9/i, 92], [/core i7/i, 76], [/core i5/i, 60], [/core i3/i, 42],
  [/snapdragon/i, 66],
  [/celeron|pentium|atom|athlon|intel n\d/i, 22],
];

const GPU_TIERS = [
  [/rtx\s*5090/i, 100], [/rtx\s*5080/i, 92], [/rtx\s*5070\s*ti/i, 86], [/rtx\s*5070/i, 80],
  [/rtx\s*5060\s*ti/i, 72], [/rtx\s*5060/i, 66], [/rtx\s*5050/i, 56],
  [/rtx\s*4090/i, 94], [/rtx\s*4080/i, 86], [/rtx\s*4070\s*ti/i, 80], [/rtx\s*4070/i, 72],
  [/rtx\s*4060\s*ti/i, 64], [/rtx\s*4060/i, 58], [/rtx\s*4050/i, 48],
  [/rtx\s*3060/i, 50], [/rtx\s*3050/i, 40], [/gtx\s*16\d{2}/i, 32],
  [/rx\s*9070/i, 82], [/rx\s*7900/i, 88], [/rx\s*7800/i, 76], [/rx\s*7700/i, 68],
  [/rx\s*7600/i, 54], [/rx\s*6600/i, 44],
  [/arc\s*b5\d{2}/i, 52], [/arc\s*a7\d{2}/i, 48],
  [/radeon\s*(7|8)\d{2}m/i, 30], [/iris xe|intel.*graphics/i, 18], [/uhd|hd graphics/i, 10],
];

function tierScore(table, text, fallback = 0) {
  if (!text) return fallback;
  for (const [pattern, value] of table) {
    if (pattern.test(text)) return value;
  }
  return fallback;
}

function ramScore(ram) {
  if (!ram) return 0;
  const size = Math.min(ram.size, 128);
  const base = Math.min(100, (Math.log2(Math.max(size, 2)) - 1) * 22);
  const bonus = /ddr5|lpddr5/i.test(ram.type ?? '') ? 8 : 0;
  return Math.min(100, base + bonus);
}

function storageScore(storage) {
  if (!storage?.length) return 0;
  const totalGb = storage.reduce((sum, drive) => sum + drive.sizeGb, 0);
  const base = Math.min(100, (Math.log2(Math.max(totalGb, 64) / 64)) * 22);
  const bonus = storage.some((d) => d.type === 'SSD NVMe') ? 10 : 0;
  return Math.min(100, base + bonus);
}

function displayScore(display) {
  if (!display) return 0;
  let score = 30;
  const pixels = (display.width ?? 1920) * (display.height ?? 1080);
  if (pixels >= 3840 * 2160) score += 30;
  else if (pixels >= 2560 * 1440) score += 22;
  else if (pixels >= 1920 * 1200) score += 12;

  if (display.refreshHz >= 240) score += 20;
  else if (display.refreshHz >= 144) score += 14;
  else if (display.refreshHz >= 120) score += 8;

  if (/oled|mini led/i.test(display.panel ?? '')) score += 15;
  else if (/ips|retina/i.test(display.panel ?? '')) score += 6;

  return Math.min(100, score);
}

/**
 * Punteggio hardware assoluto (0-100), pesato diversamente per portatili e
 * fissi: su un fisso lo schermo non conta, su un portatile conta molto.
 */
export function hardwareScore(offer) {
  const { specs, category } = offer;
  const cpu = tierScore(CPU_TIERS, specs.cpu?.label ?? specs.cpu?.family, 35);
  const gpu = tierScore(GPU_TIERS, specs.gpu?.model, specs.gpu?.type === 'integrata' ? 15 : 25);
  const ram = ramScore(specs.ram);
  const storage = storageScore(specs.storage);

  const weights = category === 'laptop'
    ? { cpu: 0.32, gpu: 0.26, ram: 0.16, storage: 0.11, display: 0.15 }
    : { cpu: 0.34, gpu: 0.36, ram: 0.17, storage: 0.13, display: 0 };

  const display = category === 'laptop' ? displayScore(specs.display) : 0;

  const raw = cpu * weights.cpu + gpu * weights.gpu + ram * weights.ram
    + storage * weights.storage + display * weights.display;

  return Math.round(raw);
}

/**
 * Assegna `hardwareScore` e `valueScore` all'intero dataset.
 * Il valore e' normalizzato *dentro la categoria*: confrontare il rapporto
 * prezzo/prestazioni di un mini PC con quello di un desktop da gioco non
 * avrebbe senso.
 */
export function scoreOffers(offers) {
  const byCategory = new Map();

  for (const offer of offers) {
    offer.hardwareScore = hardwareScore(offer);
    // Prestazioni per euro. La radice attenua il vantaggio strutturale dei
    // prodotti economici, che altrimenti dominerebbero sempre la classifica.
    offer.valueRatio = offer.price > 0 ? offer.hardwareScore / Math.sqrt(offer.price) : 0;

    if (!byCategory.has(offer.category)) byCategory.set(offer.category, []);
    byCategory.get(offer.category).push(offer);
  }

  for (const group of byCategory.values()) {
    const ratios = group.map((offer) => offer.valueRatio).sort((a, b) => a - b);
    const min = ratios[0];
    const max = ratios[ratios.length - 1];
    const span = max - min;

    for (const offer of group) {
      // Senza un intervallo su cui normalizzare (una sola offerta, o tutte
      // equivalenti) il punteggio e' neutro: uno 0 farebbe sembrare pessimo
      // un prodotto che semplicemente non ha termini di paragone.
      offer.valueScore = span > 0
        ? Math.round(((offer.valueRatio - min) / span) * 100)
        : 50;
      delete offer.valueRatio;
    }
  }

  return offers;
}

/** Badge testuali calcolati una volta sola qui, non nella UI. */
export function assignBadges(offers) {
  for (const offer of offers) {
    const badges = [];
    if (offer.isLowestEver) badges.push('minimo storico');
    if (offer.discountPct >= 30) badges.push('super sconto');
    if (offer.valueScore >= 85) badges.push('ottimo affare');
    if (offer.isNew) badges.push('novita');
    if (offer.availability === 'esaurito') badges.push('esaurito');
    offer.badges = badges;
  }
  return offers;
}
