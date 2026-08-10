/** Formattazione e piccole utilita' condivise dalla UI. */

const EUR = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EUR_CENTS = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

const DATE_SHORT = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/** Sotto i 100 euro i centesimi contano, sopra sono rumore. */
export function money(value) {
  if (value == null) return '—';
  return value < 100 ? EUR_CENTS.format(value) : EUR.format(value);
}

export function percent(value) {
  return value == null ? '—' : `${value}%`;
}

export function capacity(sizeGb) {
  if (sizeGb == null) return '—';
  if (sizeGb >= 1024 && sizeGb % 1024 === 0) return `${sizeGb / 1024} TB`;
  return `${sizeGb} GB`;
}

export function inches(value) {
  return value == null ? '—' : `${String(value).replace('.', ',')}"`;
}

export function shortDate(value) {
  return DATE_SHORT.format(new Date(value));
}

export function longDate(value) {
  return DATE_LONG.format(new Date(value));
}

/** "3 giorni fa", "oggi": piu' leggibile di una data assoluta in lista. */
export function relativeDay(value) {
  const days = Math.floor((Date.now() - new Date(value)) / 86_400_000);
  if (days <= 0) return 'oggi';
  if (days === 1) return 'ieri';
  if (days < 30) return `${days} giorni fa`;
  const months = Math.round(days / 30);
  return months === 1 ? 'un mese fa' : `${months} mesi fa`;
}

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Tutto il testo che entra nel DOM via innerHTML passa da qui. */
export function esc(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/** Rende comparabili stringhe con accenti e maiuscole diverse. */
export function fold(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const CATEGORY_LABEL = {
  laptop: 'Portatili',
  desktop: 'PC fissi',
};
