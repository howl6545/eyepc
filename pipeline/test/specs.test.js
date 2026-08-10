import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectCategory, extractBrand, extractCpu, extractDisplay, extractGpu,
  extractMotherboard, extractOs, extractPowerSupply, extractRam, extractSpecs,
  extractStorage,
} from '../lib/specs.js';

test('riconosce i processori Intel Core', () => {
  const cpu = extractCpu('Intel Core i7-13650HX 14 core fino a 4.9 GHz');
  assert.equal(cpu.brand, 'Intel');
  assert.equal(cpu.family, 'Core i7');
  assert.equal(cpu.model, '13650HX');
  assert.equal(cpu.cores, 14);
  assert.equal(cpu.boostClock, 4.9);
});

test('riconosce Core Ultra e Ryzen', () => {
  assert.equal(extractCpu('Intel Core Ultra 7 155H').family, 'Core Ultra 7');
  assert.equal(extractCpu('AMD Ryzen 9 7950X 16 core 32 thread').family, 'Ryzen 9');
  assert.equal(extractCpu('AMD Ryzen 9 7950X 16 core 32 thread').threads, 32);
  assert.equal(extractCpu('Ryzen AI 9 HX 370').family, 'Ryzen AI 9');
});

test('riconosce Apple silicon con la variante', () => {
  assert.equal(extractCpu('Apple MacBook Pro 14" M4 Pro, Apple M4 Pro 12 core').family, 'Apple M4 Pro');
  assert.equal(extractCpu('chip Apple M3 8 core').family, 'Apple M3');
});

test('riconosce le schede video dedicate e integrate', () => {
  const rtx = extractGpu('NVIDIA GeForce RTX 4070 Ti Super 16GB GDDR6X');
  assert.equal(rtx.brand, 'NVIDIA');
  assert.equal(rtx.model, 'GeForce RTX 4070 TI SUPER');
  assert.equal(rtx.vram, 16);
  assert.equal(rtx.generation, 'RTX 4000');

  assert.equal(extractGpu('AMD Radeon RX 7900 XT 20GB').model, 'Radeon RX 7900 XT');
  assert.equal(extractGpu('Intel Arc B580').model, 'Intel Arc B580');
  assert.equal(extractGpu('Intel Iris Xe Graphics').type, 'integrata');
});

test('la GPU dei SoC Apple viene derivata dal processore', () => {
  const { specs } = extractSpecs('Apple Mac mini M4, chip Apple M4 10 core, 16GB memoria unificata, 512GB SSD, macOS, mini pc');
  assert.equal(specs.gpu.type, 'integrata');
  assert.equal(specs.gpu.model, 'GPU Apple M4');
});

test('distingue la RAM dallo spazio di archiviazione', () => {
  const text = 'Intel Core i7, 32GB DDR5 5600MHz, 1TB SSD NVMe PCIe 4.0 + 2TB HDD';
  assert.deepEqual(extractRam(text), { size: 32, type: 'DDR5', speed: 5600 });

  const drives = extractStorage(text);
  assert.deepEqual(drives, [
    { type: 'HDD', sizeGb: 2048 },
    { type: 'SSD NVMe', sizeGb: 1024 },
  ]);
});

test('non scambia i 32GB di RAM per un disco', () => {
  // Senza parole chiave di archiviazione un valore in GB non e' un disco.
  assert.equal(extractStorage('16GB DDR5 5600MHz'), null);
});

test('riconosce le risoluzioni per sigla e per numeri', () => {
  const display = extractDisplay('16" WQXGA 2560x1600 IPS 240Hz 500 nit touchscreen', 'laptop');
  assert.equal(display.sizeInch, 16);
  assert.equal(display.resolution, '2560x1600');
  assert.equal(display.resolutionLabel, 'WQXGA');
  assert.equal(display.refreshHz, 240);
  assert.equal(display.panel, 'IPS');
  assert.equal(display.brightnessNits, 500);
  assert.equal(display.touch, true);

  assert.equal(extractDisplay('15,6" Full HD IPS', 'laptop').sizeInch, 15.6);
});

test('su un fisso lo schermo conta solo se e un all-in-one', () => {
  const tower = extractDisplay('PC Desktop, alimentatore 650W, Full HD 1920x1080', 'desktop');
  assert.equal(tower.sizeInch, undefined);

  const aio = extractDisplay('All-in-One 27" QHD 2560x1440 IPS touchscreen', 'desktop');
  assert.equal(aio.sizeInch, 27);
});

test('legge scheda madre e alimentatore', () => {
  const text = 'scheda madre ASUS ROG STRIX B650E-F ATX socket AM5, alimentatore 850W 80+ Gold';
  assert.deepEqual(extractMotherboard(text), { chipset: 'B650E', socket: 'AM5', formFactor: 'ATX' });
  assert.deepEqual(extractPowerSupply(text), { watt: 850, certification: '80+ Gold' });
});

test('non inventa un alimentatore quando non e citato', () => {
  assert.equal(extractPowerSupply('Notebook 15,6" con batteria da 90Wh'), null);
});

test('riconosce il sistema operativo', () => {
  assert.equal(extractOs('Windows 11 Home in S mode'), 'Windows 11 Home');
  assert.equal(extractOs('Windows 11 Professional'), 'Windows 11 Pro');
  assert.equal(extractOs('macOS Sequoia'), 'macOS');
  assert.equal(extractOs('senza sistema operativo'), 'Senza sistema operativo');
});

test('classifica portatili e fissi', () => {
  assert.equal(detectCategory('Notebook Lenovo Legion Pro 5'), 'laptop');
  assert.equal(detectCategory('PC Desktop Gaming Assemblato con case Mid Tower'), 'desktop');
  assert.equal(detectCategory('Lenovo IdeaCentre AIO 27 all-in-one portatile'), 'desktop');
  // Senza indizi espliciti, batteria e peso indicano un portatile.
  assert.equal(detectCategory('Apple M3, 16GB, 512GB SSD, 52.6Wh, 1,24 kg'), 'laptop');
});

test('estrae una scheda completa da un titolo di listino reale', () => {
  const title = 'Notebook Lenovo Legion Pro 5 16IRX9, Intel Core i7-14650HX, 32GB DDR5 5600MHz, '
    + '1TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4070 8GB GDDR6, 16" WQXGA 2560x1600 IPS 240Hz, '
    + 'Windows 11 Home, tastiera retroilluminata RGB, Wi-Fi 6E, Bluetooth 5.3, 80Wh, 2,5 kg';

  const { category, specs } = extractSpecs(title);

  assert.equal(category, 'laptop');
  assert.equal(specs.cpu.label, 'Core i7-14650HX');
  assert.equal(specs.gpu.model, 'GeForce RTX 4070');
  assert.equal(specs.gpu.vram, 8);
  assert.equal(specs.ram.size, 32);
  assert.deepEqual(specs.storage, [{ type: 'SSD NVMe', sizeGb: 1024 }]);
  assert.equal(specs.display.refreshHz, 240);
  assert.equal(specs.os, 'Windows 11 Home');
  assert.equal(specs.battery.capacityWh, 80);
  assert.equal(specs.weightKg, 2.5);
  assert.equal(specs.keyboard, 'Retroilluminata RGB');
  assert.equal(specs.connectivity.wifi, 'Wi-Fi 6E');
  assert.equal(specs.connectivity.bluetooth, '5.3');
});

test('un titolo povero non produce campi inventati', () => {
  const { specs } = extractSpecs('Notebook 15,6 pollici in offerta');
  assert.equal(specs.cpu, undefined);
  assert.equal(specs.gpu, undefined);
  assert.equal(specs.ram, undefined);
  assert.equal(specs.storage, undefined);
});

test('la marca del PC non e quella dei componenti', () => {
  // Il marchio citato nella scheda madre non e' la marca del computer.
  assert.equal(
    extractBrand('PC Desktop Gaming Assemblato, AMD Ryzen 7 7800X3D, scheda madre MSI B650 Gaming Plus WiFi'),
    'Assemblato',
  );
  assert.equal(extractBrand('PC Desktop Ufficio, Intel Core i5-12400 6 core, scheda madre H610'), 'Assemblato');

  // Ma quando la marca c'e' davvero va riconosciuta, anche se il titolo
  // nomina pure i componenti.
  assert.equal(extractBrand('HP OMEN 45L GT22-2005nl, Intel Core i9-14900K, scheda madre Z790'), 'HP');
  assert.equal(extractBrand('MSI MAG Infinite S3, Intel Core i7-14700F, scheda madre B760'), 'MSI');
  assert.equal(extractBrand('Notebook Lenovo Legion Pro 5 16IRX9, Intel Core i7-14650HX'), 'Lenovo');
  assert.equal(extractBrand('Gigabyte AORUS Model X, Intel Core i7-14700KF, scheda madre Z790 ATX'), 'Gigabyte');
});

test('gli alias di gamma risalgono al produttore', () => {
  assert.equal(extractBrand('Notebook Victus 15-fa1015nl'), 'HP');
  assert.equal(extractBrand('Predator Helios Neo 16'), 'Acer');
  assert.equal(extractBrand('Vivobook 15 X1504VA'), 'ASUS');
});
