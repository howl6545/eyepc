/**
 * Deduplica fra negozi.
 *
 * Lo stesso identico PC compare spesso su cinque siti diversi: mostrarlo
 * cinque volte riempirebbe la lista di rumore. Raggruppiamo per `modelKey`,
 * teniamo come principale l'offerta piu' conveniente e alleghiamo le altre
 * come alternative d'acquisto.
 */

/** A parita' di modello vince il prezzo piu' basso, poi la scheda piu' completa. */
function compareCandidates(a, b) {
  if (a.availability === 'esaurito' && b.availability !== 'esaurito') return 1;
  if (b.availability === 'esaurito' && a.availability !== 'esaurito') return -1;
  if (a.price !== b.price) return a.price - b.price;
  return (b.specsCompleteness ?? 0) - (a.specsCompleteness ?? 0);
}

export function dedupeOffers(offers) {
  const groups = new Map();

  for (const offer of offers) {
    // Le offerte senza specifiche riconosciute non sono raggruppabili in
    // modo affidabile: le teniamo separate usando il loro id.
    const key = offer.specsCompleteness >= 40 ? offer.modelKey : `solo:${offer.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(offer);
  }

  const result = [];

  for (const group of groups.values()) {
    group.sort(compareCandidates);
    const [primary, ...others] = group;

    if (others.length) {
      primary.otherStores = others
        .map((offer) => ({
          storeId: offer.store.id,
          storeName: offer.store.name,
          price: offer.price,
          url: offer.url,
          availability: offer.availability,
        }))
        .sort((a, b) => a.price - b.price);

      // Se altrove costa di piu', il risparmio rispetto alla media di mercato
      // e' un'informazione utile quanto lo sconto.
      const prices = group.map((offer) => offer.price);
      const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      if (average > primary.price) {
        primary.marketDelta = {
          averagePrice: Math.round(average * 100) / 100,
          savedPct: Math.round(((average - primary.price) / average) * 100),
          storeCount: group.length,
        };
      }
    }

    result.push(primary);
  }

  return result;
}
