/**
 * Normalizzazione: dal record grezzo del collector all'offerta che la
 * webapp consuma.
 */

import { createHash } from 'node:crypto';
import { extractSpecs, extractBrand, specsCompleteness, normalizeText } from './specs.js';

/** Identificativo stabile dell'offerta (negozio + prodotto). */
export function offerId(storeId, record) {
  const key = record.sku ?? record.gtin ?? canonicalUrl(record.url);
  return createHash('sha1').update(`${storeId}|${key}`).digest('hex').slice(0, 16);
}

/** Rimuove i parametri di tracciamento, cosi' la stessa pagina ha una sola URL. */
export function canonicalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const param of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|msclkid|ref|refresh|_gl|srsltid)/i.test(param)) url.searchParams.delete(param);
    }
    url.hash = '';
    return url.toString();
  } catch {
    return String(rawUrl ?? '');
  }
}

/**
 * Chiave di modello per riconoscere lo stesso PC su negozi diversi.
 * Non usa il titolo intero (ogni negozio lo scrive a modo suo) ma la
 * combinazione marca + specifiche portanti, che e' stabile.
 */
export function modelKey({ brand, category, specs }) {
  const parts = [
    (brand ?? 'n/d').toLowerCase(),
    category,
    specs.cpu?.label?.toLowerCase() ?? 'cpu?',
    specs.gpu?.model?.toLowerCase() ?? 'gpu?',
    specs.ram ? `${specs.ram.size}${specs.ram.type ?? ''}`.toLowerCase() : 'ram?',
    specs.storage ? specs.storage.map((d) => `${d.type}${d.sizeGb}`).join('+').toLowerCase() : 'disco?',
    specs.display?.resolution ?? '',
    specs.display?.sizeInch ?? '',
  ];
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
}

/** Titolo compatto: via il rumore di marketing tipico dei listini italiani. */
export function cleanTitle(raw) {
  return normalizeText(raw)
    .replace(/^(offerta|promo|sconto|nuovo|new)\s*[:|-]\s*/i, '')
    .replace(/\s*[|·–-]\s*(spedizione gratuita|garanzia \d+ anni|prezzo pi[uù] basso).*$/i, '')
    .replace(/\s*\(([^)]*(?:cod\.?|art\.?|sku)[^)]*)\)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Sconto dichiarato dal negozio, quando la pagina espone un prezzo di
 * listino credibile (scartiamo i "prezzi consigliati" fuori scala).
 */
export function declaredDiscount(price, listPrice) {
  if (!price || !listPrice || listPrice <= price) return null;
  const pct = Math.round(((listPrice - price) / listPrice) * 100);
  if (pct < 1 || pct > 90) return null;
  return { listPrice: roundMoney(listPrice), discountPct: pct, source: 'negozio' };
}

/**
 * Trasforma un record grezzo in un'offerta normalizzata (senza i campi che
 * dipendono dallo storico: quelli li aggiunge `history.js`).
 */
export function normalizeRecord(record, now = new Date()) {
  if (!record?.title || !record?.price) return null;

  const title = cleanTitle(record.title);
  const { category, specs } = extractSpecs(record.fullText ?? title, {
    category: record.category,
  });

  const brand = record.brand ? cleanTitle(record.brand) : extractBrand(title);
  const url = canonicalUrl(record.url);
  const listPrice = record.listPrice ?? record.properties?.['Prezzo di listino'] ?? null;

  const offer = {
    id: offerId(record.storeId, { ...record, url }),
    modelKey: modelKey({ brand, category, specs }),
    category,
    title,
    brand,
    image: record.image ?? null,
    url,
    store: { id: record.storeId, name: record.storeName },
    price: roundMoney(record.price),
    currency: record.currency ?? 'EUR',
    availability: record.availability ?? 'disponibile',
    rating: record.rating ?? null,
    reviewCount: record.reviewCount ?? null,
    specs,
    specsCompleteness: specsCompleteness(category, specs),
    seenAt: now.toISOString(),
  };

  const declared = declaredDiscount(offer.price, Number(listPrice));
  if (declared) {
    offer.listPrice = declared.listPrice;
    offer.discountPct = declared.discountPct;
    offer.discountSource = declared.source;
  }

  return offer;
}

/**
 * Frasi sintetiche mostrate come "chip" nella lista: servono a capire un
 * prodotto in un colpo d'occhio senza aprire il dettaglio.
 */
export function buildHighlights(offer) {
  const { specs, category } = offer;
  const chips = [];

  if (specs.cpu) chips.push(specs.cpu.label ?? specs.cpu.family);
  if (specs.gpu) chips.push(specs.gpu.model);
  if (specs.ram) chips.push(`${specs.ram.size} GB${specs.ram.type ? ` ${specs.ram.type}` : ''}`);
  if (specs.storage?.length) {
    chips.push(specs.storage.map((d) => `${formatCapacity(d.sizeGb)} ${d.type}`).join(' + '));
  }

  if (category === 'laptop' && specs.display) {
    const display = [
      specs.display.sizeInch ? `${String(specs.display.sizeInch).replace('.', ',')}"` : null,
      specs.display.resolutionLabel,
      specs.display.refreshHz ? `${specs.display.refreshHz} Hz` : null,
    ].filter(Boolean).join(' ');
    if (display) chips.push(display);
  }

  if (category === 'desktop') {
    if (specs.motherboard?.chipset) chips.push(`Chipset ${specs.motherboard.chipset}`);
    if (specs.powerSupply?.watt) chips.push(`${specs.powerSupply.watt}W`);
    if (specs.chassis?.formFactor) chips.push(specs.chassis.formFactor);
  }

  return chips.filter(Boolean).slice(0, 6);
}

export function formatCapacity(sizeGb) {
  if (sizeGb >= 1024 && sizeGb % 1024 === 0) return `${sizeGb / 1024} TB`;
  return `${sizeGb} GB`;
}
