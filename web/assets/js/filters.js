/**
 * Motore dei filtri.
 *
 * I filtri sono dichiarati una volta sola in `FACETS`: da quella struttura
 * derivano sia la UI (opzioni disponibili + conteggi) sia la funzione che
 * decide se un'offerta passa. Aggiungere un filtro nuovo significa aggiungere
 * una voce a questo array, niente altro.
 *
 * Tipi supportati:
 *   `multi`   elenco di opzioni, selezione multipla in OR
 *   `min`     soglia minima scelta fra alcuni gradini
 *   `range`   intervallo continuo (usato solo per il prezzo)
 *   `toggle`  interruttore booleano
 */

import { capacity, fold, money } from './format.js';

const nonEmpty = (values) => values.filter((value) => value != null && value !== '');

/** Fascia di CPU, come la ragiona chi compra: la sigla, non il numero di modello. */
function cpuTier(offer) {
  const cpu = offer.specs.cpu;
  if (!cpu) return [];
  const family = cpu.family ?? '';
  if (/^Apple/i.test(family)) return [family.replace(/\s+(Pro|Max|Ultra)$/i, '')];
  return [family];
}

function gpuSeries(offer) {
  const gpu = offer.specs.gpu;
  if (!gpu) return [];
  if (gpu.type === 'integrata') return ['Grafica integrata'];
  if (gpu.generation) return [gpu.generation];
  if (/GeForce (RTX|GTX)/i.test(gpu.series ?? '')) return [gpu.series];
  return nonEmpty([gpu.series]);
}

function screenBucket(offer) {
  const size = offer.specs.display?.sizeInch;
  if (size == null) return [];
  if (size < 13) return ['Fino a 13"'];
  if (size < 14.5) return ['13" – 14"'];
  if (size < 16) return ['15" – 16"'];
  if (size < 18) return ['16" – 17"'];
  return ['18" e oltre'];
}

function totalStorage(offer) {
  const drives = offer.specs.storage;
  if (!drives?.length) return null;
  return drives.reduce((sum, drive) => sum + drive.sizeGb, 0);
}

export const FACETS = [
  {
    id: 'price',
    label: 'Prezzo',
    type: 'range',
    scope: 'all',
    value: (offer) => offer.price,
    format: money,
    step: 50,
  },
  {
    id: 'discount',
    label: 'Sconto minimo',
    type: 'min',
    scope: 'all',
    value: (offer) => offer.discountPct ?? 0,
    steps: [0, 10, 20, 30, 40, 50],
    format: (value) => (value === 0 ? 'Tutti' : `−${value}%`),
  },
  {
    id: 'brand',
    label: 'Marca',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.brand]),
  },
  {
    id: 'cpuBrand',
    label: 'Marca processore',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.specs.cpu?.brand]),
  },
  {
    id: 'cpuTier',
    label: 'Fascia processore',
    type: 'multi',
    scope: 'all',
    values: cpuTier,
  },
  {
    id: 'cpuCores',
    label: 'Core minimi',
    type: 'min',
    scope: 'all',
    value: (offer) => offer.specs.cpu?.cores,
    steps: [0, 4, 6, 8, 12, 16],
    format: (value) => (value === 0 ? 'Tutti' : `${value}+`),
  },
  {
    id: 'gpuBrand',
    label: 'Marca scheda video',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.specs.gpu?.brand]),
  },
  {
    id: 'gpuSeries',
    label: 'Serie scheda video',
    type: 'multi',
    scope: 'all',
    values: gpuSeries,
  },
  {
    id: 'gpuModel',
    label: 'Modello scheda video',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.specs.gpu?.model]),
    collapsedByDefault: true,
  },
  {
    id: 'vram',
    label: 'Memoria video minima',
    type: 'min',
    scope: 'all',
    value: (offer) => offer.specs.gpu?.vram,
    steps: [0, 6, 8, 12, 16],
    format: (value) => (value === 0 ? 'Indifferente' : `${value} GB+`),
  },
  {
    id: 'ram',
    label: 'RAM minima',
    type: 'min',
    scope: 'all',
    value: (offer) => offer.specs.ram?.size,
    steps: [0, 8, 16, 32, 64],
    format: (value) => (value === 0 ? 'Tutte' : `${value} GB+`),
  },
  {
    id: 'ramType',
    label: 'Tipo di RAM',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.specs.ram?.type]),
  },
  {
    id: 'storage',
    label: 'Archiviazione minima',
    type: 'min',
    scope: 'all',
    value: totalStorage,
    steps: [0, 256, 512, 1024, 2048],
    format: (value) => (value === 0 ? 'Tutte' : `${capacity(value)}+`),
  },
  {
    id: 'nvme',
    label: 'Solo SSD NVMe',
    type: 'toggle',
    scope: 'all',
    test: (offer) => Boolean(offer.specs.storage?.some((drive) => drive.type === 'SSD NVMe')),
  },
  {
    id: 'os',
    label: 'Sistema operativo',
    type: 'multi',
    scope: 'all',
    values: (offer) => nonEmpty([offer.specs.os]),
  },

  /* --------------------------------------------------- solo portatili -- */
  {
    id: 'screenSize',
    label: 'Dimensione schermo',
    type: 'multi',
    scope: 'laptop',
    values: screenBucket,
    order: ['Fino a 13"', '13" – 14"', '15" – 16"', '16" – 17"', '18" e oltre'],
  },
  {
    id: 'resolution',
    label: 'Risoluzione',
    type: 'multi',
    scope: 'laptop',
    values: (offer) => nonEmpty([offer.specs.display?.resolutionLabel]),
    order: ['HD', 'HD+', 'Full HD', 'Full HD+', 'QHD', 'WQXGA', '2.2K', '3K', '4K UHD', 'Liquid Retina XDR'],
  },
  {
    id: 'refresh',
    label: 'Frequenza minima',
    type: 'min',
    scope: 'laptop',
    value: (offer) => offer.specs.display?.refreshHz,
    steps: [0, 90, 120, 144, 165, 240],
    format: (value) => (value === 0 ? 'Indifferente' : `${value} Hz+`),
  },
  {
    id: 'panel',
    label: 'Tipo di pannello',
    type: 'multi',
    scope: 'laptop',
    values: (offer) => nonEmpty([offer.specs.display?.panel]),
  },
  {
    id: 'touch',
    label: 'Schermo touch',
    type: 'toggle',
    scope: 'laptop',
    test: (offer) => offer.specs.display?.touch === true,
  },
  {
    id: 'weight',
    label: 'Peso massimo',
    type: 'max',
    scope: 'laptop',
    value: (offer) => offer.specs.weightKg,
    steps: [0, 1.5, 2, 2.5, 3],
    format: (value) => (value === 0 ? 'Indifferente' : `fino a ${String(value).replace('.', ',')} kg`),
  },
  {
    id: 'battery',
    label: 'Batteria minima',
    type: 'min',
    scope: 'laptop',
    value: (offer) => offer.specs.battery?.capacityWh,
    steps: [0, 50, 60, 75, 90],
    format: (value) => (value === 0 ? 'Indifferente' : `${value} Wh+`),
  },
  {
    id: 'backlit',
    label: 'Tastiera retroilluminata',
    type: 'toggle',
    scope: 'laptop',
    test: (offer) => Boolean(offer.specs.keyboard),
  },

  /* -------------------------------------------------------- solo fissi -- */
  {
    id: 'chipset',
    label: 'Chipset scheda madre',
    type: 'multi',
    scope: 'desktop',
    values: (offer) => nonEmpty([offer.specs.motherboard?.chipset]),
  },
  {
    id: 'socket',
    label: 'Socket',
    type: 'multi',
    scope: 'desktop',
    values: (offer) => nonEmpty([offer.specs.motherboard?.socket]),
  },
  {
    id: 'mbFormFactor',
    label: 'Formato scheda madre',
    type: 'multi',
    scope: 'desktop',
    values: (offer) => nonEmpty([offer.specs.motherboard?.formFactor]),
    order: ['Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX'],
  },
  {
    id: 'chassis',
    label: 'Formato del case',
    type: 'multi',
    scope: 'desktop',
    values: (offer) => nonEmpty([offer.specs.chassis?.formFactor]),
    order: ['Mini PC', 'All-in-One', 'Barebone', 'Mini Tower', 'Tower', 'Mid Tower', 'Full Tower'],
  },
  {
    id: 'psu',
    label: 'Alimentatore minimo',
    type: 'min',
    scope: 'desktop',
    value: (offer) => offer.specs.powerSupply?.watt,
    steps: [0, 500, 650, 750, 850, 1000],
    format: (value) => (value === 0 ? 'Indifferente' : `${value} W+`),
  },
  {
    id: 'liquid',
    label: 'Raffreddamento a liquido',
    type: 'toggle',
    scope: 'desktop',
    test: (offer) => offer.specs.chassis?.cooling === 'Liquido',
  },

  /* ------------------------------------------------------- trasversali -- */
  {
    id: 'store',
    label: 'Negozio',
    type: 'multi',
    scope: 'all',
    values: (offer) => [offer.store.name],
  },
  {
    id: 'available',
    label: 'Solo disponibili',
    type: 'toggle',
    scope: 'all',
    test: (offer) => offer.availability !== 'esaurito',
    defaultOn: true,
  },
  {
    id: 'lowest',
    label: 'Solo al minimo storico',
    type: 'toggle',
    scope: 'all',
    test: (offer) => offer.isLowestEver === true,
  },
  {
    id: 'favorites',
    label: 'Solo i preferiti',
    type: 'toggle',
    scope: 'all',
    test: (offer, context) => context.favorites.has(offer.id),
  },
];

export const FACETS_BY_ID = new Map(FACETS.map((facet) => [facet.id, facet]));

/** I filtri applicabili alla categoria corrente. */
export function facetsFor(category) {
  return FACETS.filter((facet) => facet.scope === 'all' || facet.scope === category);
}

export function createFilterState(category) {
  const state = {};
  for (const facet of facetsFor(category)) {
    if (facet.type === 'multi') state[facet.id] = new Set();
    else if (facet.type === 'toggle') state[facet.id] = facet.defaultOn === true;
    else if (facet.type === 'range') state[facet.id] = null; // [min, max], null = nessun limite
    else state[facet.id] = 0;
  }
  return state;
}

/** Quante condizioni non predefinite sono attive: alimenta il pallino sul bottone. */
export function activeFilterCount(filters, category) {
  let count = 0;
  for (const facet of facetsFor(category)) {
    const value = filters[facet.id];
    if (facet.type === 'multi') count += value.size ? 1 : 0;
    else if (facet.type === 'toggle') count += value !== Boolean(facet.defaultOn) ? 1 : 0;
    else if (facet.type === 'range') count += value ? 1 : 0;
    else count += value ? 1 : 0;
  }
  return count;
}

function matchesFacet(facet, offer, filters, context) {
  const selection = filters[facet.id];

  switch (facet.type) {
    case 'multi': {
      if (!selection.size) return true;
      return facet.values(offer).some((value) => selection.has(value));
    }
    case 'min': {
      if (!selection) return true;
      const value = facet.value(offer);
      return value != null && value >= selection;
    }
    case 'max': {
      if (!selection) return true;
      const value = facet.value(offer);
      return value != null && value <= selection;
    }
    case 'range': {
      if (!selection) return true;
      const value = facet.value(offer);
      return value != null && value >= selection[0] && value <= selection[1];
    }
    case 'toggle': {
      if (!selection) return true;
      return facet.test(offer, context);
    }
    default:
      return true;
  }
}

/** Ricerca testuale: titolo, marca, negozio e specifiche principali. */
function matchesQuery(offer, tokens) {
  if (!tokens.length) return true;
  const haystack = offer._search ?? (offer._search = fold([
    offer.title,
    offer.brand,
    offer.store.name,
    offer.specs.cpu?.label,
    offer.specs.gpu?.model,
    offer.specs.os,
    ...(offer.highlights ?? []),
  ].filter(Boolean).join(' ')));

  return tokens.every((token) => haystack.includes(token));
}

/**
 * Applica ricerca + filtri.
 * @param {object[]} offers offerte della categoria corrente
 */
export function applyFilters(offers, filters, category, context = { favorites: new Set() }) {
  const tokens = fold(context.query ?? '').split(/\s+/).filter(Boolean);
  const facets = facetsFor(category);

  return offers.filter((offer) => {
    if (!matchesQuery(offer, tokens)) return false;
    return facets.every((facet) => matchesFacet(facet, offer, filters, context));
  });
}

/**
 * Opzioni disponibili per un facet `multi`, con il numero di risultati che
 * ciascuna produrrebbe *tenendo conto di tutti gli altri filtri attivi*.
 * E' quello che permette di disabilitare le scelte che porterebbero a zero.
 */
export function facetOptions(facet, offers, filters, category, context) {
  const others = { ...filters, [facet.id]: new Set() };
  const pool = applyFilters(offers, others, category, context);

  const counts = new Map();
  for (const offer of pool) {
    for (const value of facet.values(offer)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  // Le opzioni gia' selezionate restano visibili anche se ora conterebbero 0.
  for (const value of filters[facet.id]) {
    if (!counts.has(value)) counts.set(value, 0);
  }

  const options = [...counts.entries()].map(([value, count]) => ({ value, count }));

  if (facet.order) {
    const rank = new Map(facet.order.map((value, index) => [value, index]));
    options.sort((a, b) => (rank.get(a.value) ?? 999) - (rank.get(b.value) ?? 999));
  } else {
    options.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'it'));
  }

  return options;
}

/** Estremi di prezzo del dataset, arrotondati allo step del cursore. */
export function priceBounds(offers, step = 50) {
  if (!offers.length) return [0, step];
  const prices = offers.map((offer) => offer.price);
  const min = Math.floor(Math.min(...prices) / step) * step;
  const max = Math.ceil(Math.max(...prices) / step) * step;
  return [min, Math.max(max, min + step)];
}

/* ------------------------------------------------------------ ORDINAMENTI */

export const SORTS = [
  {
    id: 'discount',
    label: 'Sconto maggiore',
    compare: (a, b) => b.discountPct - a.discountPct
      || (b.specsCompleteness ?? 0) - (a.specsCompleteness ?? 0)
      || a.price - b.price,
  },
  { id: 'value', label: 'Qualità/prezzo', compare: (a, b) => b.valueScore - a.valueScore || b.discountPct - a.discountPct },
  { id: 'price-asc', label: 'Prezzo crescente', compare: (a, b) => a.price - b.price },
  { id: 'price-desc', label: 'Prezzo decrescente', compare: (a, b) => b.price - a.price },
  { id: 'power', label: 'Più potente', compare: (a, b) => b.hardwareScore - a.hardwareScore || a.price - b.price },
  { id: 'saving', label: 'Risparmio in euro', compare: (a, b) => savedAmount(b) - savedAmount(a) },
];

function savedAmount(offer) {
  return offer.listPrice ? offer.listPrice - offer.price : 0;
}

export const SORTS_BY_ID = new Map(SORTS.map((sort) => [sort.id, sort]));
