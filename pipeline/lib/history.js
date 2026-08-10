/**
 * Storico prezzi: e' la parte che rende l'app "giorno dopo giorno".
 *
 * Un negozio che scrive "-40%" accanto a un prezzo di listino gonfiato non
 * sta offrendo uno sconto reale. Tenendo traccia del prezzo osservato ogni
 * giorno possiamo calcolare uno sconto *verificato*: quanto costa oggi
 * rispetto a quanto e' realmente costato nelle ultime settimane.
 */

const HISTORY_WINDOW_DAYS = 90;
const REFERENCE_WINDOW_DAYS = 60;
const GRACE_DAYS = 3; // per quanti giorni teniamo un'offerta non piu' vista

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayStamp(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / DAY_MS);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Prezzo di riferimento su cui misurare lo sconto reale.
 *
 * Usiamo il 75° percentile dei prezzi osservati nella finestra invece del
 * massimo: un singolo giorno con prezzo anomalo (errore di listino, prodotto
 * momentaneamente fuori assortimento) non deve gonfiare lo sconto.
 */
export function referencePrice(points, today) {
  const recent = points.filter((point) => daysBetween(point.d, today) <= REFERENCE_WINDOW_DAYS);
  if (recent.length < 2) return null;

  const prices = recent.map((point) => point.p).sort((a, b) => a - b);
  const index = Math.min(prices.length - 1, Math.floor(prices.length * 0.75));
  return prices[index];
}

function trimHistory(points, today) {
  return points
    .filter((point) => daysBetween(point.d, today) <= HISTORY_WINDOW_DAYS)
    .sort((a, b) => a.d.localeCompare(b.d));
}

/** Aggiunge (o aggiorna) il punto di oggi nello storico. */
function appendPoint(points, today, price) {
  const existing = points.find((point) => point.d === today);
  if (existing) {
    // Piu' rilevazioni nello stesso giorno: teniamo la piu' bassa.
    existing.p = Math.min(existing.p, price);
    return points;
  }
  return [...points, { d: today, p: price }];
}

/**
 * Unisce le offerte raccolte oggi con il dataset del giorno precedente.
 *
 * @param {object[]} freshOffers offerte normalizzate di oggi
 * @param {object} previous dataset precedente (`{ offers: [...] }`)
 * @param {Date} now
 */
export function mergeWithHistory(freshOffers, previous = { offers: [] }, now = new Date()) {
  const today = dayStamp(now);
  const previousById = new Map((previous.offers ?? []).map((offer) => [offer.id, offer]));
  const merged = [];

  for (const offer of freshOffers) {
    const before = previousById.get(offer.id);
    previousById.delete(offer.id);

    const history = appendPoint(
      trimHistory(before?.priceHistory ?? [], today),
      today,
      offer.price,
    );

    const prices = history.map((point) => point.p);
    const lowestEver = Math.min(...prices);
    const reference = referencePrice(history, today);

    const enriched = {
      ...offer,
      firstSeenAt: before?.firstSeenAt ?? offer.seenAt,
      priceHistory: history,
      lowestEver: roundMoney(lowestEver),
      highestEver: roundMoney(Math.max(...prices)),
      isLowestEver: history.length > 2 && offer.price <= lowestEver,
      isNew: !before,
      daysTracked: history.length,
    };

    const yesterday = before?.price;
    if (yesterday != null && yesterday !== offer.price) {
      enriched.priceChange = {
        from: roundMoney(yesterday),
        to: offer.price,
        deltaPct: Math.round(((offer.price - yesterday) / yesterday) * 100),
        since: before.seenAt,
      };
    }

    // Sconto verificato sullo storico: prevale se piu' conservativo del
    // dichiarato, cosi' l'app non ripete i "-70%" di fantasia dei listini.
    if (reference && reference > offer.price) {
      const verifiedPct = Math.round(((reference - offer.price) / reference) * 100);
      if (verifiedPct >= 1) {
        enriched.verifiedDiscount = { referencePrice: roundMoney(reference), discountPct: verifiedPct };
        if (enriched.discountPct == null || verifiedPct < enriched.discountPct) {
          enriched.discountPct = verifiedPct;
          enriched.listPrice = roundMoney(reference);
          enriched.discountSource = 'storico';
        }
      }
    }

    if (enriched.discountPct == null) {
      enriched.discountPct = 0;
      enriched.discountSource = 'nessuno';
    }

    merged.push(enriched);
  }

  // Offerte non viste oggi: le teniamo per qualche giorno marcandole, poi
  // spariscono. Evita che un listino temporaneamente irraggiungibile svuoti
  // l'app.
  for (const stale of previousById.values()) {
    const age = daysBetween(stale.seenAt, now);
    if (age <= GRACE_DAYS) {
      merged.push({ ...stale, isStale: true, staleDays: age, isNew: false });
    }
  }

  return merged;
}

export { HISTORY_WINDOW_DAYS, REFERENCE_WINDOW_DAYS, GRACE_DAYS };
