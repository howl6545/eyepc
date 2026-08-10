#!/usr/bin/env node
/**
 * Orchestratore della raccolta giornaliera.
 *
 *   node pipeline/run.js               raccolta reale, fallback su dati demo
 *   node pipeline/run.js --seed-only   solo dati dimostrativi
 *   node pipeline/run.js --dry-run     non scrive nulla su disco
 *
 * Il risultato e' `data/offers.json`, l'unico file che la webapp legge.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { enabledStores } from './sources/registry.js';
import { collectAll, looksLikeComputer } from './sources/collect.js';
import { normalizeRecord, buildHighlights } from './lib/normalize.js';
import { mergeWithHistory } from './lib/history.js';
import { dedupeOffers } from './lib/dedupe.js';
import { scoreOffers, assignBadges } from './lib/score.js';
import { generateSeedOffers } from './seed/generate.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = resolve(ROOT, 'data/offers.json');

const args = new Set(process.argv.slice(2));
const SEED_ONLY = args.has('--seed-only');
const DRY_RUN = args.has('--dry-run');

/** Soglia sotto la quale una raccolta reale e' considerata fallita. */
const MIN_REAL_OFFERS = 12;

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
  } catch {
    return { offers: [] };
  }
}

function summarize(offers) {
  const byCategory = { laptop: 0, desktop: 0 };
  const byStore = {};

  for (const offer of offers) {
    byCategory[offer.category] = (byCategory[offer.category] ?? 0) + 1;
    byStore[offer.store.id] = (byStore[offer.store.id] ?? 0) + 1;
  }

  const discounted = offers.filter((offer) => offer.discountPct > 0);
  const averageDiscount = discounted.length
    ? Math.round(discounted.reduce((sum, offer) => sum + offer.discountPct, 0) / discounted.length)
    : 0;

  return {
    total: offers.length,
    byCategory,
    byStore,
    discounted: discounted.length,
    averageDiscount,
    lowestEverCount: offers.filter((offer) => offer.isLowestEver).length,
  };
}

async function main() {
  const now = new Date();
  const previous = await readPrevious();
  const report = [];

  let normalized = [];
  let dataQuality = 'demo';

  if (!SEED_ONLY) {
    const stores = enabledStores();
    console.log(`Negozi attivi: ${stores.map((s) => s.id).join(', ') || 'nessuno'}`);

    const { records, report: collectReport } = await collectAll(stores, { logger: console });
    report.push(...collectReport);

    const parsed = records.map((record) => normalizeRecord(record, now)).filter(Boolean);
    // Ultimo filtro: senza processore, RAM e disco non e' un computer.
    normalized = parsed.filter(looksLikeComputer);

    console.log(
      `Raccolti ${records.length} record grezzi, ${parsed.length} normalizzati, `
      + `${normalized.length} riconosciuti come computer.`,
    );

    if (normalized.length >= MIN_REAL_OFFERS) {
      dataQuality = 'reale';
    } else {
      console.warn(
        `Raccolta insufficiente (${normalized.length} < ${MIN_REAL_OFFERS}): si usa il dataset dimostrativo.`,
      );
      normalized = [];
    }
  }

  if (!normalized.length) {
    normalized = generateSeedOffers(now);
    dataQuality = 'demo';
  }

  // Pipeline: storico -> deduplica -> punteggi -> badge -> evidenze.
  // Alla prima raccolta reale il dataset dimostrativo va buttato: senza questo
  // le offerte finte sopravviverebbero nel periodo di grazia dello storico.
  const history = previous.dataQuality === 'demo' ? { offers: [] } : previous;

  let offers = dataQuality === 'reale'
    ? mergeWithHistory(normalized, history, now)
    : normalized;

  offers = dedupeOffers(offers);
  offers = scoreOffers(offers);
  offers = assignBadges(offers);

  for (const offer of offers) {
    offer.highlights = buildHighlights(offer);
  }

  // Ordinamento di default dell'app: sconto decrescente. A parita' di sconto
  // vince la scheda tecnica piu' completa, poi il prezzo piu' basso.
  offers.sort((a, b) => (
    b.discountPct - a.discountPct
    || (b.specsCompleteness ?? 0) - (a.specsCompleteness ?? 0)
    || a.price - b.price
  ));

  const dataset = {
    generatedAt: now.toISOString(),
    dataQuality,
    disclaimer: dataQuality === 'demo'
      ? 'Dataset dimostrativo: prezzi e disponibilità non sono reali.'
      : 'Prezzi rilevati automaticamente: verifica sempre sul sito del venditore prima di acquistare.',
    stats: summarize(offers),
    sources: report,
    offers,
  };

  console.log(JSON.stringify(dataset.stats, null, 2));

  if (DRY_RUN) {
    console.log('--dry-run: nessun file scritto.');
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  console.log(`Scritto ${OUTPUT_PATH} (qualità dati: ${dataQuality}).`);
}

main().catch((error) => {
  console.error('Raccolta fallita:', error);
  process.exitCode = 1;
});
