#!/usr/bin/env node
/**
 * Verifica end-to-end della webapp in Chromium: percorre i flussi principali
 * (scelta categoria, filtri, ordinamento, ricerca, dettaglio, preferiti) e
 * salva gli screenshot in `.screenshots/`.
 *
 *   node pipeline/tools/smoke.js
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium, devices } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SHOTS = resolve(ROOT, '.screenshots');
const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    console.log(`  FAIL ${label} ${detail}`);
    failures.push(label);
  }
};

const server = spawn(process.execPath, [resolve(ROOT, 'pipeline/tools/serve.js'), String(PORT)], {
  stdio: 'ignore',
});

await new Promise((done) => setTimeout(done, 700));
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});

const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'it-IT' });
const page = await context.newPage();

// Le immagini dei prodotti stanno sui CDN dei negozi e in ambiente isolato
// non sono raggiungibili: il loro fallimento non e' un errore dell'app (esiste
// il segnaposto), quindi si esclude dal controllo della console.
const isAssetFailure = (text) => /Failed to load resource/i.test(text);

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !isAssetFailure(message.text())) consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

try {
  /* ------------------------------------------------------------ home -- */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-stat-count]')?.textContent !== '—');

  const laptopCount = await page.locator('[data-category-card="laptop"] [data-stat-count]').textContent();
  const desktopCount = await page.locator('[data-category-card="desktop"] [data-stat-count]').textContent();
  check('la home mostra il conteggio dei portatili', Number(laptopCount) > 0, laptopCount);
  check('la home mostra il conteggio dei fissi', Number(desktopCount) > 0, desktopCount);
  await page.screenshot({ path: resolve(SHOTS, '01-home.png') });

  /* --------------------------------------------------------- portatili -- */
  await page.click('[data-category-card="laptop"]');
  await page.waitForSelector('.card');
  check('accento azzurro sui portatili',
    await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim() === '#0ea5e9'));

  const discounts = await page.$$eval('.card__discount', (nodes) => nodes.map((n) => Number(n.textContent.replace(/\D/g, ''))));
  const sortedDesc = discounts.every((value, index) => index === 0 || discounts[index - 1] >= value);
  check('le offerte sono in ordine di sconto decrescente', sortedDesc, JSON.stringify(discounts.slice(0, 6)));
  check('ogni card espone le specifiche di sintesi',
    (await page.$$eval('.card .spec-chip', (nodes) => nodes.length)) > 0);

  // Con dati reali le immagini arrivano dai negozi: se non caricano deve
  // restare il segnaposto, mai un'icona rotta.
  check('ogni card mostra sempre un\'immagine o il segnaposto',
    await page.$$eval('.card__media', (nodes) => nodes.every((n) => n.querySelector('svg, img'))));
  await page.screenshot({ path: resolve(SHOTS, '02-lista-portatili.png') });

  /* ------------------------------------------------------------ filtri -- */
  const before = await page.$$eval('.card', (nodes) => nodes.length);
  await page.click('[data-action="open-filters"]');
  await page.waitForSelector('#sheet.is-open');
  await page.locator('.sheet__panel').screenshot({ path: resolve(SHOTS, '03-filtri.png') });

  // Filtro su una serie di schede video: risultato non vuoto e piu' ristretto.
  // I gruppi secondari partono chiusi, quindi vanno prima espansi.
  await page.evaluate(() => {
    document.querySelector('[data-facet="gpuSeries"]')?.closest('details')?.setAttribute('open', '');
    document.querySelector('[data-facet="ram"]')?.closest('details')?.setAttribute('open', '');
  });
  const gpuOption = page.locator('[data-facet="gpuSeries"]').first();
  const gpuLabel = (await gpuOption.textContent()).trim();
  await gpuOption.click();
  await page.waitForTimeout(120);
  const afterGpu = await page.$$eval('.card', (nodes) => nodes.length);
  check(`il filtro scheda video restringe i risultati (${gpuLabel})`, afterGpu > 0 && afterGpu < before, `${before} -> ${afterGpu}`);
  check('il contatore dei filtri attivi si aggiorna',
    (await page.locator('#filter-count').textContent()).trim() === '1');

  // Un filtro incompatibile deve azzerare, e "Azzera" deve ripristinare.
  await page.click('[data-facet="ram"][data-step="64"]');
  await page.waitForTimeout(120);
  await page.click('#sheet-foot [data-action="reset-filters"]');
  await page.waitForTimeout(150);
  const afterReset = await page.$$eval('.card', (nodes) => nodes.length);
  check('"Azzera" ripristina tutte le offerte', afterReset === before, `${afterReset} vs ${before}`);

  await page.click('[data-action="close-sheet"]');
  await page.waitForTimeout(350);

  /* -------------------------------------------------------- ordinamento -- */
  await page.click('[data-action="open-sort"]');
  await page.waitForSelector('#sheet.is-open');
  await page.click('[data-sort="price-asc"]');
  await page.waitForTimeout(300);
  const prices = await page.$$eval('.card .price', (nodes) => nodes.map(
    (n) => Number(n.textContent.replace(/[^\d,]/g, '').replace(',', '.')),
  ));
  check('ordinamento per prezzo crescente', prices.every((v, i) => i === 0 || prices[i - 1] <= v), JSON.stringify(prices.slice(0, 5)));

  await page.click('[data-action="open-sort"]');
  await page.click('[data-sort="discount"]');
  await page.waitForTimeout(300);

  /* ----------------------------------------------------------- ricerca -- */
  // Il termine si ricava dal dataset: cosi' la verifica vale sia sui dati
  // dimostrativi sia su una raccolta reale, il cui assortimento cambia ogni giorno.
  const term = await page.evaluate(() => {
    const title = document.querySelector('.card__link')?.textContent ?? '';
    return title.trim().split(/\s+/)[0] ?? '';
  });
  await page.fill('#search-input', term);
  await page.waitForTimeout(300);
  const searched = await page.$$eval('.card', (nodes) => nodes.length);
  check(`la ricerca testuale filtra le offerte ("${term}")`, searched > 0 && searched <= before, String(searched));
  await page.click('#search-clear');
  await page.waitForTimeout(250);

  /* --------------------------------------------------------- dettaglio -- */
  await page.locator('.card__link').first().click();
  await page.waitForSelector('#sheet.is-open');
  await page.waitForTimeout(400);

  check('il dettaglio elenca la scheda tecnica',
    (await page.$$eval('.specs__row', (nodes) => nodes.length)) >= 8);
  // Il grafico esiste solo con almeno tre rilevazioni: alla prima raccolta
  // reale ce n'e' una sola, e al suo posto va mostrata la spiegazione.
  const historyPoints = await page.evaluate(() => {
    const id = location.hash.split('/')[1];
    return fetch('data/offers.json').then((r) => r.json())
      .then((d) => d.offers.find((o) => o.id === id)?.priceHistory?.length ?? 0);
  });
  const hasChart = await page.locator('.chart svg').count() > 0;
  check(
    historyPoints >= 3 ? 'il dettaglio mostra il grafico dei prezzi' : 'senza storico il dettaglio lo spiega',
    historyPoints >= 3 ? hasChart : !hasChart && (await page.locator('.section .notice').count()) > 0,
    `${historyPoints} rilevazioni`,
  );

  const buy = page.locator('[data-buy]');
  check('il pulsante di acquisto punta al negozio', (await buy.getAttribute('href') ?? '').startsWith('http'));
  check('il pulsante di acquisto apre una nuova scheda', await buy.getAttribute('target') === '_blank');
  check('il link di acquisto e sicuro', ((await buy.getAttribute('rel')) ?? '').includes('noopener'));
  // Il pannello e' `position: fixed`: uno screenshot fullPage fotograferebbe
  // la lista sottostante, non il dettaglio. Si cattura l'elemento.
  await page.locator('.sheet__panel').screenshot({ path: resolve(SHOTS, '04-dettaglio.png') });
  await page.evaluate(() => { document.querySelector('#sheet-body').scrollTop = 620; });
  await page.waitForTimeout(200);
  await page.locator('.sheet__panel').screenshot({ path: resolve(SHOTS, '04b-dettaglio-specifiche.png') });

  /* -------------------------------------------------------- preferiti --- */
  await page.locator('#sheet-foot [data-fav]').click();
  await page.waitForTimeout(150);
  check('il preferito viene registrato',
    (await page.evaluate(() => JSON.parse(localStorage.getItem('toh:favorites') ?? '[]').length)) === 1);

  await page.click('#sheet-close');
  await page.waitForTimeout(400);

  /* ------------------------------------------------------------ fissi -- */
  await page.click('[data-action="back"]');
  await page.waitForTimeout(200);

  // Regressione: tornare indietro e rientrare nella *stessa* categoria deve
  // funzionare. Con l'hash lasciato fermo su #laptop non succedeva nulla.
  await page.click('[data-category-card="laptop"]');
  await page.waitForTimeout(250);
  check('si puo rientrare nella stessa categoria dopo "indietro"',
    await page.locator('#screen-list.is-active').count() === 1);
  await page.click('[data-action="back"]');
  await page.waitForTimeout(200);
  await page.click('[data-category-card="desktop"]');
  await page.waitForSelector('.card');
  check('accento indaco sui fissi',
    await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim() === '#4f46e5'));

  await page.click('[data-action="open-filters"]');
  await page.waitForSelector('#sheet.is-open');
  const desktopFacets = await page.$$eval('.fgroup__toggle span', (nodes) => nodes.map((n) => n.textContent.trim()));
  check('i fissi espongono il filtro sul chipset', desktopFacets.includes('Chipset scheda madre'), JSON.stringify(desktopFacets));
  check('i fissi non espongono i filtri da portatile', !desktopFacets.includes('Frequenza minima'));
  await page.locator('.sheet__panel').screenshot({ path: resolve(SHOTS, '05-filtri-fissi.png') });
  await page.click('[data-action="close-sheet"]');
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(SHOTS, '06-lista-fissi.png') });

  /* ------------------------------------------------------ link diretto -- */
  const firstId = await page.evaluate(() => document.querySelector('[data-open]')?.dataset.open);
  await page.goto(`${BASE}/#offerta/${firstId}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#sheet.is-open', { timeout: 5000 });
  check('un link diretto apre il dettaglio giusto', await page.locator('[data-buy]').count() === 1);

  /* ----------------------------------------------------- tema e desktop -- */
  const dark = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark', locale: 'it-IT' });
  const darkPage = await dark.newPage();
  await darkPage.goto(`${BASE}/#laptop`, { waitUntil: 'networkidle' });
  await darkPage.waitForSelector('.card');
  const bodyBg = await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('il tema scuro dipinge lo sfondo', bodyBg === 'rgb(10, 15, 29)', bodyBg);
  await darkPage.screenshot({ path: resolve(SHOTS, '07-tema-scuro.png') });
  await dark.close();

  const wide = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'it-IT' });
  const widePage = await wide.newPage();
  await widePage.goto(`${BASE}/#desktop`, { waitUntil: 'networkidle' });
  await widePage.waitForSelector('.card');
  const columns = await widePage.evaluate(() => getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length);
  check('su schermo largo la lista passa a due colonne', columns === 2, String(columns));
  await wide.close();

  /* -------------------------------------------- niente scroll orizzontale */
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('nessuno scroll orizzontale', overflow <= 0, `${overflow}px`);

  check('nessun errore in console', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.kill();
}

console.log(failures.length ? `\n${failures.length} verifiche fallite` : '\nTutte le verifiche superate');
process.exit(failures.length ? 1 : 0);
