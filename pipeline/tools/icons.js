#!/usr/bin/env node
/**
 * Genera le icone PNG della PWA a partire da `web/assets/icons/icon.svg`,
 * usando Chromium via Playwright (nessun rasterizzatore di sistema richiesto).
 *
 *   node pipeline/tools/icons.js
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ICON_DIR = resolve(ROOT, 'web/assets/icons');

const TARGETS = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'icon-180.png', size: 180, padding: 0 },
  // Le icone "maskable" vengono ritagliate da Android: serve un margine
  // di sicurezza pari a circa il 10% per lato.
  { file: 'icon-maskable.png', size: 512, padding: 0.1 },
];

const svg = await readFile(resolve(ICON_DIR, 'icon.svg'), 'utf8');
// Il contenitore fornisce gia' Chromium: usiamo quello, senza scaricarne un altro.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});

try {
  for (const target of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: target.size, height: target.size },
      deviceScaleFactor: 1,
    });

    const inset = Math.round(target.size * target.padding);
    await page.setContent(`
      <style>
        html,body{margin:0;padding:0;width:${target.size}px;height:${target.size}px;background:#0ea5e9}
        svg{position:absolute;inset:${inset}px;width:${target.size - inset * 2}px;height:${target.size - inset * 2}px}
      </style>
      ${svg}`);

    const buffer = await page.screenshot({ omitBackground: false });
    await writeFile(resolve(ICON_DIR, target.file), buffer);
    await page.close();
    console.log(`Scritta ${target.file} (${target.size}px)`);
  }
} finally {
  await browser.close();
}
