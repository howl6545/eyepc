# Tech Offers Hub

Webapp mobile che raccoglie, giorno dopo giorno, le offerte su **PC fissi** e
**notebook** dai principali negozi di tecnologia italiani, le ordina per sconto
e le rende filtrabili per specifiche tecniche.

Due colori, due categorie: **indaco** per i PC fissi, **azzurro** per i
portatili. L'accento cambia in tutta l'interfaccia in base a dove ti trovi.

```
┌─ Home ────────────┐   ┌─ Lista ───────────┐   ┌─ Dettaglio ───────┐
│  PC fissi  indaco │ → │ ricerca + filtri  │ → │ scheda tecnica    │
│  Portatili azzurro│   │ sconto ↓ (default)│   │ storico prezzi    │
└───────────────────┘   └───────────────────┘   │ → vai al negozio  │
                                                └───────────────────┘
```

## Cosa fa

- **Due categorie** con colore dedicato, scelte all'apertura.
- **Ordinamento per sconto decrescente** come predefinito, più cinque
  alternative (qualità/prezzo, prezzo, potenza hardware, risparmio in euro).
- **Scheda tecnica completa e locale**: CPU, GPU, RAM, archiviazione, schermo,
  scheda madre, alimentatore, telaio, batteria, peso, connettività, porte,
  sistema operativo. Tutto già dentro `data/offers.json`: l'app non interroga
  nessun sito mentre la usi.
- **Filtri per esigenza reale**, diversi per categoria — su un portatile filtri
  per risoluzione, refresh, pannello OLED, peso e batteria; su un fisso per
  chipset della scheda madre, socket, formato del case, watt dell'alimentatore
  e raffreddamento a liquido. Ogni opzione mostra quanti risultati produce e si
  disabilita quando porterebbe a zero.
- **Sconto verificato**: se il prezzo di listino dichiarato dal negozio è
  gonfiato, lo sconto viene ricalcolato sul prezzo realmente osservato nelle
  ultime settimane, e l'app dice quale dei due sta mostrando.
- **Storico prezzi** con grafico, minimo e massimo, badge "minimo storico".
- **Stesso PC su più negozi** accorpato in una scheda sola, con l'elenco delle
  alternative e il confronto con la media di mercato.
- **Preferiti**, ricerca testuale, link diretto alla singola offerta.
- **PWA installabile**, tema chiaro/scuro automatico, funziona offline.

## Struttura

```
index.html               guscio dell'app
sw.js                    service worker (offline)
web/assets/css/          foglio di stile unico
web/assets/js/
  app.js                 stato, navigazione, eventi
  render.js              costruzione del markup
  filters.js             motore dei filtri (facet dichiarativi)
  format.js              formattazione italiana
data/offers.json         l'unico file letto dall'app
pipeline/
  run.js                 orchestratore della raccolta giornaliera
  lib/specs.js           estrazione specifiche da testo libero italiano
  lib/http.js            client HTTP con robots.txt e throttle
  lib/html.js            lettura JSON-LD / schema.org, senza dipendenze
  lib/history.js         storico prezzi e sconto verificato
  lib/dedupe.js          accorpamento fra negozi
  lib/score.js           punteggio hardware e qualità/prezzo
  sources/registry.js    elenco dei negozi
  seed/                  dataset dimostrativo
  test/                  test della pipeline
  tools/                 server locale, icone, verifica in browser
```

## Uso

```bash
npm run serve      # http://localhost:4173
npm run collect    # raccolta reale, con ricaduta sui dati dimostrativi
npm run seed       # rigenera solo il dataset dimostrativo
npm test           # test della pipeline
npm run verify     # percorre l'app in Chromium e salva gli screenshot
```

L'app va servita via HTTP: usa moduli ES e `fetch`, quindi aprendo
`index.html` con `file://` non funziona.

## Come vengono raccolti i dati

`pipeline/run.js` gira una volta al giorno via GitHub Actions
(`.github/workflows/offers.yml`) e riscrive `data/offers.json`, che viene
ricommittato: è quel commit quotidiano a costruire lo storico dei prezzi.

Il collector è deliberatamente conservativo:

- **robots.txt viene letto e rispettato** per ogni host, con throttle per
  dominio e retry con backoff.
- **I dati si leggono dai marcatori schema.org** (`Product` / `Offer`) che i
  negozi già pubblicano per Google Shopping, non da selettori CSS: è molto più
  stabile e non richiede un parser DOM.
- **Amazon non viene raschiato.** Le sue condizioni d'uso lo vietano: entra
  nella raccolta solo tramite Product Advertising API, e solo se i secrets
  `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY` e `AMAZON_PARTNER_TAG` sono
  configurati.
- Se un negozio è irraggiungibile la run non fallisce: quel negozio viene
  saltato e l'esito finisce in `sources` dentro il dataset.

I negozi sono elencati in `pipeline/sources/registry.js`; ognuno indica gli URL
di listino e come riconoscere una pagina prodotto. Con la variabile `STORES`
puoi limitare la raccolta a un sottoinsieme (`STORES=unieuro,comet`).

### Stato attuale dei dati

`data/offers.json` contiene al momento un **dataset dimostrativo**: prezzi e
disponibilità non sono reali. L'app lo dichiara con una fascia in alto, e il
campo `dataQuality` vale `demo`.

Serve a due cose: far funzionare l'app da subito, e mettere sotto sforzo
l'estrattore di specifiche, che su quelle stringhe deve produrre esattamente i
campi che produrrà in produzione. Quando una raccolta reale porta a casa almeno
12 offerte, i dati dimostrativi vengono scartati e `dataQuality` passa a
`reale`.

I selettori dei listini sono la parte che va tarata sul campo: gli URL nel
registro sono quelli pubblici delle categorie, ma ogni sito cambia struttura nel
tempo, quindi la prima raccolta reale richiede una verifica negozio per negozio.

## L'estrattore di specifiche

È il pezzo che fa il lavoro interessante. I negozi italiani mettono quasi tutto
nel titolo, in ordine libero:

```
"Notebook Lenovo Legion Pro 5 16IRX9, Intel Core i7-14650HX, 32GB DDR5 5600MHz,
 1TB SSD NVMe PCIe 4.0, NVIDIA GeForce RTX 4070 8GB GDDR6, 16" WQXGA 2560x1600
 IPS 240Hz, Windows 11 Home, tastiera retroilluminata RGB, Wi-Fi 6E, 80Wh, 2,5 kg"
```

`pipeline/lib/specs.js` ne ricava un oggetto strutturato con processore (marca,
famiglia, modello, core, thread, clock), scheda video (marca, serie,
generazione, VRAM), RAM, dischi, schermo, batteria, peso, connettività e
sistema operativo — ed è ciò su cui si costruiscono i filtri.

Alcune scelte non ovvie:

- **`32GB DDR5` non è un disco.** Senza una parola chiave di archiviazione un
  valore in GB viene ignorato; i TB invece su un PC consumer sono sempre dischi.
- **Su un fisso lo schermo viene scartato**, a meno che non sia un all-in-one o
  che il monitor sia esplicitamente incluso.
- **Sui SoC Apple e Snapdragon la GPU viene derivata dal processore**, perché nei
  titoli non compare mai.
- **`specsCompleteness`** misura quanto è piena la scheda: l'app la mostra come
  indicatore di affidabilità e la usa per ordinare a parità di sconto.

## Aggiungere un filtro

I filtri sono dichiarativi. Una voce in `FACETS` (`web/assets/js/filters.js`)
genera da sola l'interfaccia, i conteggi e la logica di selezione:

```js
{
  id: 'vram',
  label: 'Memoria video minima',
  type: 'min',                 // multi | min | max | range | toggle
  scope: 'all',                // all | laptop | desktop
  value: (offer) => offer.specs.gpu?.vram,
  steps: [0, 6, 8, 12, 16],
  format: (v) => (v === 0 ? 'Indifferente' : `${v} GB+`),
}
```

## Verifica

`npm test` copre l'estrattore di specifiche, robots.txt, la lettura JSON-LD, lo
storico prezzi, la deduplica e i punteggi (33 test).

`npm run verify` avvia l'app in Chromium con un viewport da telefono e percorre
i flussi reali — scelta categoria, filtri, ordinamenti, ricerca, dettaglio,
preferiti, link diretto, tema scuro, schermo largo — controllando anche che non
ci siano errori in console né scroll orizzontale. Gli screenshot finiscono in
`.screenshots/`.

## Avvertenza

I prezzi sono rilevati automaticamente e non sono garantiti: controlla sempre
sulla pagina del venditore prima di acquistare. Il progetto è a fini
informativi.
