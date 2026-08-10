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
      // Due casi molto diversi, che vanno distinti:
      //  - stesso negozio  -> e' lo stesso PC in un'altra variante (il colore
      //    tipicamente): mostrarlo come "disponibile anche su Comet" sarebbe
      //    assurdo;
      //  - negozio diverso -> e' una vera alternativa d'acquisto.
      const sameStore = others.filter((offer) => offer.store.id === primary.store.id);
      const otherStores = others.filter((offer) => offer.store.id !== primary.store.id);

      if (sameStore.length) {
        primary.variants = sameStore
          .map((offer) => ({ title: offer.title, price: offer.price, url: offer.url }))
          .sort((a, b) => a.price - b.price);
      }

      if (otherStores.length) {
        // Di ogni altro negozio si tiene solo l'offerta piu' conveniente.
        const cheapestPerStore = new Map();
        for (const offer of otherStores) {
          const current = cheapestPerStore.get(offer.store.id);
          if (!current || offer.price < current.price) cheapestPerStore.set(offer.store.id, offer);
        }

        primary.otherStores = [...cheapestPerStore.values()]
          .map((offer) => ({
            storeId: offer.store.id,
            storeName: offer.store.name,
            price: offer.price,
            url: offer.url,
            availability: offer.availability,
          }))
          .sort((a, b) => a.price - b.price);

        // Il confronto di mercato ha senso solo fra negozi diversi.
        const prices = [primary.price, ...primary.otherStores.map((entry) => entry.price)];
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        if (average > primary.price) {
          primary.marketDelta = {
            averagePrice: Math.round(average * 100) / 100,
            savedPct: Math.round(((average - primary.price) / average) * 100),
            storeCount: prices.length,
          };
        }
      }
    }

    result.push(primary);
  }

  return result;
}
