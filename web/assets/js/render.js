/** Costruzione del markup. Nessuna dipendenza, solo template string. */

import {
  capacity, esc, inches, longDate, money, percent, relativeDay,
} from './format.js';
import { facetOptions, facetsFor, priceBounds } from './filters.js';

/** Il cuore e' l'unica icona con due stati: vuota o piena. */
export function heartIcon(filled) {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}"
    stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path
    d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 10-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 000-7.1z"/></svg>`;
}

// Solo le icone che il JS inserisce a runtime: quelle fisse stanno in index.html.
export const ICONS = {
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  external: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8 8M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
  empty: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8.5 11h5"/></svg>',
  box: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
};

const BADGE_STYLE = {
  'minimo storico': 'badge--low',
  'super sconto': 'badge--deal',
  novita: 'badge--new',
  esaurito: 'badge--out',
  'ottimo affare': 'badge--deal',
};

/* ------------------------------------------------------------- CARD ----- */

export function renderCard(offer, { isFavorite }) {
  const media = offer.image
    ? `<img src="${esc(offer.image)}" alt="" loading="lazy" decoding="async">`
    : ICONS.box;

  const discount = offer.discountPct > 0
    ? `<span class="card__discount">−${offer.discountPct}%</span>`
    : '';

  const chips = (offer.highlights ?? []).slice(0, 4).map((chip, index) => (
    `<span class="spec-chip${index === 0 ? ' spec-chip--accent' : ''}">${esc(chip)}</span>`
  )).join('');

  const badges = (offer.badges ?? [])
    .filter((badge) => badge !== 'super sconto')
    .map((badge) => `<span class="badge ${BADGE_STYLE[badge] ?? ''}">${esc(badge)}</span>`)
    .join('');

  const oldPrice = offer.listPrice
    ? `<span class="price--old">${money(offer.listPrice)}</span>`
    : '';

  return `
    <article class="card${offer.isStale ? ' is-stale' : ''}">
      <div class="card__media">${media}${discount}</div>
      <div class="card__body">
        <div class="card__store">${esc(offer.store.name)}</div>
        <h3 class="card__title">
          <button class="card__link" type="button" data-open="${esc(offer.id)}">${esc(offer.title)}</button>
        </h3>
        <div class="card__specs">${chips}</div>
        <div class="card__prices">
          <span class="price">${money(offer.price)}</span>
          ${oldPrice}
        </div>
        ${badges ? `<div class="badges">${badges}</div>` : ''}
      </div>
      <button class="card__fav" type="button" data-fav="${esc(offer.id)}"
              aria-pressed="${isFavorite}" aria-label="Salva tra i preferiti">
        ${heartIcon(isFavorite)}
      </button>
    </article>`;
}

export function renderEmpty(hasFilters) {
  return `
    <div class="empty">
      ${ICONS.empty}
      <h3>Nessun risultato</h3>
      <p>${hasFilters
        ? 'Nessuna offerta soddisfa tutti i criteri scelti.'
        : 'Non ci sono offerte in questa categoria al momento.'}</p>
      ${hasFilters ? '<button class="btn btn--ghost" type="button" data-action="reset-filters">Azzera i filtri</button>' : ''}
    </div>`;
}

export function renderSkeletons(count = 6) {
  return Array.from({ length: count }, () => '<div class="skeleton"></div>').join('');
}

/* ---------------------------------------------------------- DETTAGLIO --- */


function row(label, value) {
  if (value == null || value === '' || value === '—') return '';
  return `<div class="specs__row"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

function group(title, rows) {
  const body = rows.filter(Boolean).join('');
  if (!body) return '';
  return `<div class="specs__group"><div class="specs__head">${esc(title)}</div><dl style="margin:0">${body}</dl></div>`;
}

function buildSpecGroups(offer) {
  const { specs, category } = offer;
  const out = [];

  out.push(group('Processore', [
    row('Modello', specs.cpu?.label ?? specs.cpu?.family),
    row('Produttore', specs.cpu?.brand),
    row('Core', specs.cpu?.cores),
    row('Thread', specs.cpu?.threads),
    row('Frequenza massima', specs.cpu?.boostClock ? `${String(specs.cpu.boostClock).replace('.', ',')} GHz` : null),
  ]));

  out.push(group('Grafica', [
    row('Scheda video', specs.gpu?.model),
    row('Produttore', specs.gpu?.brand),
    row('Tipo', specs.gpu?.type),
    row('Memoria dedicata', specs.gpu?.vram ? `${specs.gpu.vram} GB` : null),
    row('Core GPU', specs.gpu?.cores),
  ]));

  out.push(group('Memoria e archiviazione', [
    row('RAM', specs.ram ? `${specs.ram.size} GB${specs.ram.type ? ` ${specs.ram.type}` : ''}` : null),
    row('Frequenza RAM', specs.ram?.speed ? `${specs.ram.speed} MHz` : null),
    row('Slot RAM', specs.ram?.slots),
    row('Espandibile', specs.ram?.upgradable === false ? 'No, saldata' : null),
    ...(specs.storage ?? []).map((drive, index) => row(
      (specs.storage.length > 1 ? `Unità ${index + 1}` : 'Archiviazione'),
      `${capacity(drive.sizeGb)} ${drive.type}`,
    )),
  ]));

  if (category === 'laptop') {
    out.push(group('Schermo', [
      row('Diagonale', specs.display?.sizeInch ? inches(specs.display.sizeInch) : null),
      row('Risoluzione', specs.display?.resolution
        ? `${specs.display.resolution}${specs.display.resolutionLabel ? ` (${specs.display.resolutionLabel})` : ''}`
        : null),
      row('Frequenza', specs.display?.refreshHz ? `${specs.display.refreshHz} Hz` : null),
      row('Pannello', specs.display?.panel),
      row('Luminosità', specs.display?.brightnessNits ? `${specs.display.brightnessNits} nit` : null),
      row('Touch', specs.display?.touch ? 'Sì' : null),
    ]));

    out.push(group('Autonomia e portabilità', [
      row('Batteria', specs.battery?.capacityWh ? `${specs.battery.capacityWh} Wh` : null),
      row('Autonomia dichiarata', specs.battery?.autonomyHours ? `fino a ${specs.battery.autonomyHours} ore` : null),
      row('Peso', specs.weightKg ? `${String(specs.weightKg).replace('.', ',')} kg` : null),
      row('Tastiera', specs.keyboard),
      row('Webcam', specs.webcam),
      row('Lettore impronte', specs.fingerprint ? 'Sì' : null),
    ]));
  } else {
    out.push(group('Scheda madre', [
      row('Chipset', specs.motherboard?.chipset),
      row('Socket', specs.motherboard?.socket),
      row('Formato', specs.motherboard?.formFactor),
    ]));

    out.push(group('Alimentazione e telaio', [
      row('Alimentatore', specs.powerSupply?.watt ? `${specs.powerSupply.watt} W` : null),
      row('Certificazione', specs.powerSupply?.certification),
      row('Formato case', specs.chassis?.formFactor),
      row('Raffreddamento', specs.chassis?.cooling),
      row('Schermo incluso', specs.display?.resolution),
    ]));
  }

  out.push(group('Sistema e connettività', [
    row('Sistema operativo', specs.os),
    row('Wi-Fi', specs.connectivity?.wifi),
    row('Bluetooth', specs.connectivity?.bluetooth),
    row('Ethernet', specs.connectivity?.ethernet),
    row('Porte', specs.ports?.join(', ')),
  ]));

  return out.filter(Boolean).join('');
}

/** Grafico dell'andamento prezzi: polilinea SVG generata a mano. */
function renderChart(offer) {
  const points = offer.priceHistory ?? [];
  if (points.length < 3) return '';

  const width = 300;
  const height = 96;
  const prices = points.map((point) => point.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const coords = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((point.p - min) / span) * (height - 10) - 5;
    return [x, y];
  });

  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  return `
    <div class="section">
      <h4 class="section__title">Andamento del prezzo · ${points.length} giorni</h4>
      <div class="chart">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img"
             aria-label="Prezzo da ${money(points[0].p)} a ${money(offer.price)} negli ultimi ${points.length} giorni">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${area}" fill="url(#chartFill)" style="color:var(--accent)"/>
          <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="var(--accent)"/>
        </svg>
        <div class="chart__legend">
          <div>Minimo<b>${money(offer.lowestEver ?? min)}</b></div>
          <div style="text-align:center">Oggi<b>${money(offer.price)}</b></div>
          <div style="text-align:right">Massimo<b>${money(offer.highestEver ?? max)}</b></div>
        </div>
      </div>
    </div>`;
}

function renderOtherStores(offer) {
  if (!offer.otherStores?.length) return '';
  const items = offer.otherStores.map((entry) => `
    <a class="storelist__item" href="${esc(entry.url)}" target="_blank" rel="noopener nofollow">
      <span>${esc(entry.storeName)}<br><span>${esc(entry.availability ?? '')}</span></span>
      <b>${money(entry.price)}</b>
    </a>`).join('');

  return `
    <div class="section">
      <h4 class="section__title">Disponibile anche su</h4>
      <div class="storelist">${items}</div>
    </div>`;
}

function priceNote(offer) {
  const notes = [];

  if (offer.discountSource === 'storico') {
    notes.push(`Sconto calcolato sul prezzo realmente osservato negli ultimi ${offer.daysTracked ?? 60} giorni, non sul listino dichiarato.`);
  } else if (offer.listPrice) {
    notes.push(`Prezzo di listino indicato dal negozio: ${money(offer.listPrice)}.`);
  }

  if (offer.isLowestEver) notes.push('È il prezzo più basso da quando seguiamo questo prodotto.');
  if (offer.marketDelta) {
    notes.push(`${offer.marketDelta.savedPct}% sotto la media di ${offer.marketDelta.storeCount} negozi.`);
  }
  if (offer.priceChange) {
    const direction = offer.priceChange.deltaPct < 0 ? 'sceso' : 'salito';
    notes.push(`Prezzo ${direction} del ${Math.abs(offer.priceChange.deltaPct)}% rispetto all'ultima rilevazione.`);
  }

  return notes.length ? `<p class="pricebox__note">${esc(notes.join(' '))}</p>` : '';
}

export function renderDetail(offer, { isFavorite, dataQuality }) {
  const saved = offer.listPrice ? offer.listPrice - offer.price : 0;

  return {
    title: offer.brand ?? 'Dettagli',
    body: `
      <div class="detail__hero">
        <div class="detail__media">
          ${offer.image ? `<img src="${esc(offer.image)}" alt="" decoding="async">` : ICONS.box}
        </div>
        <div>
          <div class="card__store">${esc(offer.store.name)}</div>
          <h3 class="detail__name">${esc(offer.title)}</h3>
          <div class="badges">
            ${(offer.badges ?? []).map((badge) => `<span class="badge ${BADGE_STYLE[badge] ?? ''}">${esc(badge)}</span>`).join('')}
            <span class="badge">qualità/prezzo ${offer.valueScore}/100</span>
          </div>
        </div>
      </div>

      <div class="pricebox">
        <div class="pricebox__row">
          <span class="pricebox__now">${money(offer.price)}</span>
          ${offer.listPrice ? `<span class="price--old">${money(offer.listPrice)}</span>` : ''}
          ${offer.discountPct > 0 ? `<span class="pricebox__save">−${offer.discountPct}% · risparmi ${money(saved)}</span>` : ''}
        </div>
        ${priceNote(offer)}
      </div>

      <div class="section">
        <h4 class="section__title">Scheda tecnica completa</h4>
        <div class="specs">${buildSpecGroups(offer)}</div>
      </div>

      ${renderChart(offer)}
      ${renderOtherStores(offer)}

      <div class="section">
        <h4 class="section__title">Rilevazione</h4>
        <div class="specs"><dl style="margin:0">
          ${row('Negozio', offer.store.name)}
          ${row('Disponibilità', offer.availability)}
          ${row('Valutazione', offer.rating ? `${String(offer.rating).replace('.', ',')}/5${offer.reviewCount ? ` (${offer.reviewCount} recensioni)` : ''}` : null)}
          ${row('Prima rilevazione', offer.firstSeenAt ? longDate(offer.firstSeenAt) : null)}
          ${row('Ultimo aggiornamento', offer.seenAt ? relativeDay(offer.seenAt) : null)}
          ${row('Completezza scheda', percent(offer.specsCompleteness))}
        </dl></div>
      </div>

      <p class="notice">
        ${dataQuality === 'demo'
          ? 'Dati dimostrativi: prezzi e disponibilità non sono reali. Servono a mostrare il funzionamento dell\'app.'
          : 'Prezzi rilevati automaticamente e non garantiti: controlla sempre sulla pagina del venditore prima di acquistare.'}
      </p>`,
    footer: `
      <button class="btn btn--ghost" type="button" data-fav="${esc(offer.id)}" aria-pressed="${isFavorite}"
              style="flex:0 0 auto;width:48px;padding:0">${heartIcon(isFavorite)}</button>
      <a class="btn btn--block" href="${esc(offer.url)}" target="_blank" rel="noopener nofollow"
         style="flex:1" data-buy="${esc(offer.id)}">
        Vai su ${esc(offer.store.name)} ${ICONS.external}
      </a>`,
  };
}

/* ------------------------------------------------------------- FILTRI --- */

function renderMulti(facet, options, selected) {
  if (!options.length) return '<p class="notice" style="margin:0">Nessun dato disponibile per questo filtro.</p>';

  return `<div class="options">${options.map((option) => {
    const active = selected.has(option.value);
    return `<button class="option" type="button" role="switch" aria-pressed="${active}"
        data-facet="${esc(facet.id)}" data-value="${esc(option.value)}" ${option.count === 0 && !active ? 'disabled' : ''}>
        ${esc(option.value)} <small>${option.count}</small>
      </button>`;
  }).join('')}</div>`;
}

function renderSteps(facet, current) {
  return `<div class="options">${facet.steps.map((step) => `
    <button class="option" type="button" role="switch" aria-pressed="${current === step}"
            data-facet="${esc(facet.id)}" data-step="${step}">
      ${esc(facet.format(step))}
    </button>`).join('')}</div>`;
}

function renderRange(facet, current, bounds) {
  const [min, max] = bounds;
  const value = current ? current[1] : max;
  return `
    <div class="range">
      <div class="range__values">
        <span>${esc(facet.format(min))}</span>
        <span data-range-label="${esc(facet.id)}">fino a ${esc(facet.format(value))}</span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${facet.step}" value="${value}"
             data-facet="${esc(facet.id)}" aria-label="${esc(facet.label)} massimo">
    </div>`;
}

function renderToggle(facet, active) {
  return `
    <div class="switchrow">
      <span>${esc(facet.label)}</span>
      <button class="switch" type="button" role="switch" aria-pressed="${active}"
              data-facet="${esc(facet.id)}" aria-label="${esc(facet.label)}"></button>
    </div>`;
}

export function renderFilterSheet(context) {
  const { offers, filters, category, favorites, query } = context;
  const facets = facetsFor(category);
  const bounds = priceBounds(offers);

  const toggles = facets.filter((facet) => facet.type === 'toggle');
  const rest = facets.filter((facet) => facet.type !== 'toggle');

  const groups = rest.map((facet) => {
    let content;
    let count = 0;

    if (facet.type === 'multi') {
      const options = facetOptions(facet, offers, filters, category, { favorites, query });
      content = renderMulti(facet, options, filters[facet.id]);
      count = filters[facet.id].size;
    } else if (facet.type === 'range') {
      content = renderRange(facet, filters[facet.id], bounds);
      count = filters[facet.id] ? 1 : 0;
    } else {
      content = renderSteps(facet, filters[facet.id]);
      count = filters[facet.id] ? 1 : 0;
    }

    const open = !facet.collapsedByDefault && (count > 0 || ['price', 'discount', 'brand'].includes(facet.id));

    return `
      <details class="fgroup" ${open ? 'open' : ''}>
        <summary class="fgroup__toggle">
          <span>${esc(facet.label)}</span>
          ${count ? `<span class="fgroup__badge">${count}</span>` : ''}
          ${ICONS.chevron}
        </summary>
        <div class="fgroup__content">${content}</div>
      </details>`;
  }).join('');

  const switches = `
    <details class="fgroup" open>
      <summary class="fgroup__toggle"><span>Preferenze</span>${ICONS.chevron}</summary>
      <div class="fgroup__content">
        ${toggles.map((facet) => renderToggle(facet, filters[facet.id])).join('')}
      </div>
    </details>`;

  return groups + switches;
}

export function renderSortSheet(sorts, current) {
  return `<div class="options" style="flex-direction:column;align-items:stretch">
    ${sorts.map((sort) => `
      <button class="option" type="button" role="radio" aria-checked="${sort.id === current}"
              aria-pressed="${sort.id === current}" data-sort="${esc(sort.id)}"
              style="justify-content:space-between;padding:13px 14px">
        ${esc(sort.label)}
      </button>`).join('')}
  </div>`;
}
