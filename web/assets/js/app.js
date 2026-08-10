/**
 * Controller dell'applicazione: stato, navigazione e collegamento fra
 * i dati e il markup prodotto da `render.js`.
 *
 * Non c'e' framework: le viste sono tre (scelta categoria, lista, dettaglio)
 * e la lista e' l'unica cosa che si ridisegna spesso. Il routing usa
 * l'hash, cosi' il tasto "indietro" del telefono si comporta come previsto.
 */

import { CATEGORY_LABEL, esc } from './format.js';
import {
  SORTS, SORTS_BY_ID, activeFilterCount, applyFilters, createFilterState,
  facetsFor, priceBounds,
} from './filters.js';
import {
  ICONS, renderCard, renderDetail, renderEmpty, renderFilterSheet,
  renderSkeletons, renderSortSheet,
} from './render.js';

const DATA_URL = 'data/offers.json';
const FAVORITES_KEY = 'toh:favorites';
const PREFS_KEY = 'toh:prefs';

const $ = (selector, root = document) => root.querySelector(selector);

const state = {
  dataset: null,
  category: null,
  filters: null,
  sort: 'discount',
  query: '',
  favorites: new Set(),
  visible: [],
  detailId: null,
  sheet: null, // 'filters' | 'sort' | 'detail'
};

const dom = {};

/* ---------------------------------------------------------- PERSISTENZA -- */

function loadFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  } catch {
    // Storage pieno o disabilitato: i preferiti restano validi per la sessione.
  }
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sort: state.sort }));
  } catch {
    // Ignorabile: la preferenza di ordinamento non e' critica.
  }
}

/* --------------------------------------------------------------- DATI --- */

async function loadDataset() {
  const response = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Impossibile leggere le offerte (HTTP ${response.status})`);
  return response.json();
}

function offersOf(category) {
  return state.dataset.offers.filter((offer) => offer.category === category);
}

/* --------------------------------------------------------------- HOME --- */

function renderHome() {
  const stats = (category) => {
    const offers = offersOf(category);
    const best = offers.reduce((max, offer) => Math.max(max, offer.discountPct ?? 0), 0);
    return { count: offers.length, best };
  };

  for (const category of ['laptop', 'desktop']) {
    const { count, best } = stats(category);
    const card = $(`[data-category-card="${category}"]`);
    if (!card) continue;
    $('[data-stat-count]', card).textContent = count;
    $('[data-stat-best]', card).textContent = `−${best}%`;
  }

  const generated = state.dataset.generatedAt
    ? new Date(state.dataset.generatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  $('[data-generated]').textContent = generated;

  dom.disclaimer.classList.toggle('hidden', state.dataset.dataQuality !== 'demo');
  if (state.dataset.dataQuality === 'demo') {
    dom.disclaimer.textContent = state.dataset.disclaimer ?? 'Dataset dimostrativo.';
  }
}

/* -------------------------------------------------------------- LISTA --- */

function computeVisible() {
  const pool = offersOf(state.category);
  const filtered = applyFilters(pool, state.filters, state.category, {
    favorites: state.favorites,
    query: state.query,
  });

  const sort = SORTS_BY_ID.get(state.sort) ?? SORTS[0];
  return filtered.slice().sort(sort.compare);
}

function renderList() {
  state.visible = computeVisible();
  const total = offersOf(state.category).length;
  const count = activeFilterCount(state.filters, state.category);

  // Il conteggio "x di y" ha senso solo quando l'utente ha scelto qualcosa:
  // i filtri predefiniti non devono far sembrare che manchino delle offerte.
  const narrowed = count > 0 || state.query.length > 0;
  dom.count.innerHTML = narrowed
    ? `<b>${state.visible.length}</b> di ${total} offerte`
    : `<b>${state.visible.length}</b> offerte`;

  dom.sortLabel.textContent = (SORTS_BY_ID.get(state.sort) ?? SORTS[0]).label;

  dom.filterCount.textContent = count || '';
  dom.filterCount.classList.toggle('hidden', count === 0);

  dom.cards.innerHTML = state.visible.length
    ? state.visible.map((offer) => renderCard(offer, { isFavorite: state.favorites.has(offer.id) })).join('')
    : renderEmpty(count > 0 || state.query.length > 0);
}

function openCategory(category) {
  state.category = category;
  state.filters = createFilterState(category);
  state.query = '';

  document.body.dataset.category = category;
  dom.search.value = '';
  dom.eyebrow.textContent = 'Offerte del giorno';
  dom.title.textContent = CATEGORY_LABEL[category];

  dom.screens.home.classList.remove('is-active');
  dom.screens.list.classList.add('is-active');
  window.scrollTo(0, 0);

  renderList();
}

function goHome() {
  state.category = null;
  delete document.body.dataset.category;
  dom.screens.list.classList.remove('is-active');
  dom.screens.home.classList.add('is-active');
  closeSheet();
}

/* -------------------------------------------------------------- SHEET --- */

function openSheet(kind, { title, body, footer }) {
  state.sheet = kind;
  dom.sheetTitle.textContent = title;
  dom.sheetBody.innerHTML = body;
  dom.sheetFoot.innerHTML = footer ?? '';
  dom.sheetFoot.classList.toggle('hidden', !footer);
  dom.sheet.classList.add('is-open');
  dom.sheet.removeAttribute('aria-hidden');
  dom.sheetBody.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  dom.sheetClose.focus({ preventScroll: true });
}

function hideSheet() {
  state.sheet = null;
  state.detailId = null;
  dom.sheet.classList.remove('is-open');
  dom.sheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function closeSheet() {
  if (!state.sheet) return;
  const wasDetail = state.sheet === 'detail';
  hideSheet();

  // Il dettaglio ha una sua voce nell'hash: chiudendolo si torna alla lista.
  // Si riscrive l'hash invece di usare `history.back()`, che su un link
  // aperto da fuori porterebbe l'utente via dall'app.
  if (wasDetail && location.hash.startsWith('#offerta')) {
    location.hash = state.category ? `#${state.category}` : '';
  }
}

function openFilters() {
  openSheet('filters', {
    title: 'Filtri',
    body: renderFilterSheet({
      offers: offersOf(state.category),
      filters: state.filters,
      category: state.category,
      favorites: state.favorites,
      query: state.query,
    }),
    footer: `
      <button class="btn btn--ghost" type="button" data-action="reset-filters" style="flex:0 0 40%">Azzera</button>
      <button class="btn btn--block" type="button" data-action="close-sheet" style="flex:1">
        Mostra <span data-live-count>${state.visible.length}</span> offerte
      </button>`,
  });
}

function openSort() {
  openSheet('sort', {
    title: 'Ordina per',
    body: renderSortSheet(SORTS, state.sort),
  });
}

function openDetail(id) {
  const offer = state.dataset.offers.find((entry) => entry.id === id);
  if (!offer) return;

  state.detailId = id;
  const view = renderDetail(offer, {
    isFavorite: state.favorites.has(id),
    dataQuality: state.dataset.dataQuality,
  });
  openSheet('detail', view);
}

/** Dopo un cambio di filtro il pannello va ricostruito: i conteggi cambiano. */
function refreshFilterSheet() {
  renderList();
  if (state.sheet !== 'filters') return;

  const scroll = dom.sheetBody.scrollTop;
  const open = [...dom.sheetBody.querySelectorAll('details')].map((node) => node.open);

  dom.sheetBody.innerHTML = renderFilterSheet({
    offers: offersOf(state.category),
    filters: state.filters,
    category: state.category,
    favorites: state.favorites,
    query: state.query,
  });

  dom.sheetBody.querySelectorAll('details').forEach((node, index) => {
    if (open[index] != null) node.open = open[index];
  });
  dom.sheetBody.scrollTop = scroll;

  const live = $('[data-live-count]', dom.sheetFoot);
  if (live) live.textContent = state.visible.length;
}

/* ------------------------------------------------------------- EVENTI --- */

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();

  // Aggiorna in loco i pulsanti cuore senza ridisegnare l'intera lista.
  const isFavorite = state.favorites.has(id);
  document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((button) => {
    button.setAttribute('aria-pressed', String(isFavorite));
    const svg = button.querySelector('svg');
    if (svg) svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
  });

  if (state.filters?.favorites) renderList();
}

function applyFacetChange(facetId, { value, step }) {
  const facet = facetsFor(state.category).find((entry) => entry.id === facetId);
  if (!facet) return;

  if (facet.type === 'multi') {
    const set = state.filters[facetId];
    if (set.has(value)) set.delete(value);
    else set.add(value);
  } else if (facet.type === 'toggle') {
    state.filters[facetId] = !state.filters[facetId];
  } else {
    const next = Number(step);
    state.filters[facetId] = state.filters[facetId] === next ? 0 : next;
  }

  refreshFilterSheet();
}

function onSheetInput(event) {
  const slider = event.target.closest('input[type="range"][data-facet]');
  if (!slider) return;

  const facetId = slider.dataset.facet;
  const facet = facetsFor(state.category).find((entry) => entry.id === facetId);
  if (!facet) return;

  const [min, max] = priceBounds(offersOf(state.category));
  const value = Number(slider.value);

  state.filters[facetId] = value >= max ? null : [min, value];

  const label = $(`[data-range-label="${facetId}"]`, dom.sheetBody);
  if (label) label.textContent = `fino a ${facet.format(value)}`;

  renderList();
  const live = $('[data-live-count]', dom.sheetFoot);
  if (live) live.textContent = state.visible.length;
}

function resetFilters() {
  state.filters = createFilterState(state.category);
  state.query = '';
  dom.search.value = '';
  refreshFilterSheet();
  if (state.sheet !== 'filters') renderList();
}

function onDocumentClick(event) {
  const target = event.target;

  const categoryCard = target.closest('[data-category-card]');
  if (categoryCard) {
    location.hash = `#${categoryCard.dataset.categoryCard}`;
    return;
  }

  const openBtn = target.closest('[data-open]');
  if (openBtn) {
    location.hash = `#offerta/${openBtn.dataset.open}`;
    return;
  }

  const favBtn = target.closest('[data-fav]');
  if (favBtn) {
    event.preventDefault();
    toggleFavorite(favBtn.dataset.fav);
    return;
  }

  const facetBtn = target.closest('[data-facet]:not(input)');
  if (facetBtn) {
    applyFacetChange(facetBtn.dataset.facet, {
      value: facetBtn.dataset.value,
      step: facetBtn.dataset.step,
    });
    return;
  }

  const sortBtn = target.closest('[data-sort]');
  if (sortBtn) {
    state.sort = sortBtn.dataset.sort;
    savePrefs();
    renderList();
    closeSheet();
    return;
  }

  const action = target.closest('[data-action]')?.dataset.action;
  if (action === 'reset-filters') resetFilters();
  else if (action === 'close-sheet') closeSheet();
  else if (action === 'open-filters') openFilters();
  else if (action === 'open-sort') openSort();
  else if (action === 'back') location.hash = '';
}

function onHashChange() {
  const hash = location.hash.slice(1);

  if (hash.startsWith('offerta/')) {
    const id = hash.slice('offerta/'.length);
    // Un link diretto a un'offerta deve aprire anche la categoria giusta.
    const offer = state.dataset?.offers.find((entry) => entry.id === id);
    if (offer && state.category !== offer.category) openCategory(offer.category);
    openDetail(id);
    return;
  }

  if (state.sheet === 'detail') hideSheet();

  if (hash === 'laptop' || hash === 'desktop') {
    if (state.category !== hash) openCategory(hash);
    return;
  }

  goHome();
}

/* ---------------------------------------------------------------- AVVIO -- */

function cacheDom() {
  dom.screens = { home: $('#screen-home'), list: $('#screen-list') };
  dom.cards = $('#cards');
  dom.count = $('#results-count');
  dom.search = $('#search-input');
  dom.title = $('#topbar-title');
  dom.eyebrow = $('#topbar-eyebrow');
  dom.sortLabel = $('#sort-label');
  dom.filterCount = $('#filter-count');
  dom.disclaimer = $('#disclaimer');
  dom.sheet = $('#sheet');
  dom.sheetTitle = $('#sheet-title');
  dom.sheetBody = $('#sheet-body');
  dom.sheetFoot = $('#sheet-foot');
  dom.sheetClose = $('#sheet-close');
}

function bindEvents() {
  document.addEventListener('click', onDocumentClick);
  dom.sheetBody.addEventListener('input', onSheetInput);
  window.addEventListener('hashchange', onHashChange);

  $('#sheet-scrim').addEventListener('click', closeSheet);
  dom.sheetClose.addEventListener('click', closeSheet);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.sheet) closeSheet();
  });

  let debounce;
  dom.search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.query = dom.search.value.trim();
      $('#search-clear').classList.toggle('hidden', !state.query);
      renderList();
    }, 140);
  });

  $('#search-clear').addEventListener('click', () => {
    dom.search.value = '';
    state.query = '';
    $('#search-clear').classList.add('hidden');
    renderList();
    dom.search.focus();
  });
}

async function start() {
  cacheDom();
  bindEvents();

  const prefs = loadPrefs();
  if (prefs.sort && SORTS_BY_ID.has(prefs.sort)) state.sort = prefs.sort;
  state.favorites = loadFavorites();

  dom.cards.innerHTML = renderSkeletons();

  try {
    state.dataset = await loadDataset();
  } catch (error) {
    dom.screens.home.innerHTML = `
      <div class="empty">
        ${ICONS.empty}
        <h3>Offerte non disponibili</h3>
        <p>${esc(error.message)}</p>
      </div>`;
    return;
  }

  renderHome();
  onHashChange();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // L'app funziona anche senza service worker: nessuna azione.
    });
  }
}

start();
