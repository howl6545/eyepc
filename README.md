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
- **Sconto verificato**: i negozi italiani non pubblicano un prezzo di listino
  leggibile, quindi lo sconto viene *costruito* confrontando il prezzo di oggi
  con quello osservato nei giorni precedenti. Se un negozio dichiara un listino
  gonfiato, vince il calcolo sullo storico, e l'app dice quale dei due mostra.
- **Storico prezzi** con grafico, minimo e massimo, badge "minimo storico".
- **Stesso PC su più negozi** accorpato in una scheda sola, con l'elenco delle
  alternative e il confronto con la media di mercato. Le varianti dello stesso
  negozio (tipicamente il colore) vengono raggruppate a parte.
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
  lib/sitemap.js         lettura delle sitemap XML (anche .gz)
  sources/registry.js    elenco verificato dei negozi
  sources/collect.js     scoperta URL, prefiltro e gate "e' un computer?"
  seed/                  dataset dimostrativo
  test/                  test della pipeline
  tools/                 server locale, icone, verifica in browser
```

## Uso

```bash
npm run serve      # http://localhost:4173
npm run collect    # raccolta reale, con ricaduta sui dati dimostrativi
                   # STORES=comet,trony npm run collect  per limitarla
npm run seed       # rigenera solo il dataset dimostrativo
npm test           # test della pipeline
npm run verify     # percorre l'app in Chromium e salva gli screenshot
npm run bundle     # dist/tech-offers-hub.html: un file solo, dati inclusi
```

L'app va servita via HTTP: usa moduli ES e `fetch`, quindi aprendo
`index.html` con `file://` non funziona.

`npm run bundle` aggira il problema: produce un **unico file HTML** con stili,
codice e offerte incorporati, che si apre con un doppio clic e funziona senza
server. È il modo più rapido per far vedere l'app a qualcuno.
`npm run bundle:artifact` genera la stessa cosa senza il guscio `<html>`, per
le piattaforme che lo forniscono già.

## Come vengono raccolti i dati

`pipeline/run.js` gira una volta al giorno via GitHub Actions
(`.github/workflows/offers.yml`) e riscrive `data/offers.json`, che viene
ricommittato: è quel commit quotidiano a costruire lo storico dei prezzi.

### Perché le sitemap e non le pagine di listino

La prima versione leggeva le pagine di categoria dei negozi. Provandola sul
campo non ha funzionato: **i listini dei negozi italiani sono tutti
applicazioni JavaScript** e l'HTML servito non contiene un solo link a un
prodotto. Unieuro è un'app Angular, le categorie di Comet sono renderizzate da
Algolia lato client.

La raccolta parte quindi dalle **sitemap XML**, che sono statiche, dichiarate
in `robots.txt` e pubblicate apposta per i crawler. Il percorso completo è:

```
sitemap XML → prefiltro sull'URL → pagina prodotto → JSON-LD → specifiche → gate
```

L'ultimo passaggio non guarda l'URL ma il risultato dell'estrazione: **se da
una pagina non escono processore, RAM e archiviazione, quello non è un
computer** e viene scartato. È così che monitor, cavi e toner restano fuori
anche quando il prefiltro li lascia passare.

### Stato verificato dei negozi

Ogni voce di `pipeline/sources/registry.js` è stata controllata sul campo:
robots.txt, raggiungibilità della sitemap, presenza dei dati strutturati nelle
pagine prodotto.

| Negozio | Stato | Note |
|---|---|---|
| Comet | attivo | sitemap di categoria (1.900 prodotti), JSON-LD completo |
| Trony | attivo | `xmlsitemap.php?type=products` (978 prodotti informatica) |
| Euronics | attivo | 4.008 prodotti, categoria nell'URL: selezione precisa |
| Unieuro | attivo, a finestra | `robots.txt` dichiara `Visit-time: 0400-0845` UTC |
| MediaWorld | escluso | protezione anti-bot sulle pagine prodotto (HTTP 403) |
| Yeppon | escluso | challenge Cloudflare su tutto il sito (HTTP 403) |
| BPM Power | escluso | `robots.txt` non accessibile (HTTP 403) |
| Amazon.it | solo API | lo scraping viola le condizioni d'uso: serve la PA-API |

I negozi esclusi non vengono mai interrogati. Aggirare una protezione anti-bot
sarebbe scorretto oltre che fragile: per averli servirebbe un feed o un accordo
di affiliazione.

`Visit-time` non fa parte dello standard e Google lo ignora, ma è una richiesta
esplicita del sito e il client HTTP la rispetta: fuori dalla finestra Unieuro
viene saltato con una nota nel report. È il motivo per cui il job giornaliero è
schedulato alle 05:15 UTC.

Con la variabile `STORES` puoi limitare la raccolta a un sottoinsieme
(`STORES=comet,trony`).

### Il primo giorno non ci sono sconti

Verificando la raccolta è emerso il limite più importante del progetto:
**nessuno dei negozi raggiungibili espone un prezzo di listino nei dati
strutturati.** Comet mostra un "Prezzo Consigliato", ma lo scrive via
JavaScript, quindi non c'è nell'HTML servito.

Lo sconto quindi non è un dato che si legge: è un dato che si **costruisce**,
confrontando il prezzo di oggi con quello osservato nei giorni precedenti. Alla
prima raccolta reale tutte le offerte hanno `discountPct: 0` e il grafico dello
storico non esiste ancora.

L'app gestisce esplicitamente questa fase: se `stats.discounted` è zero passa
all'ordinamento per qualità/prezzo, avvisa che lo storico è in costruzione, e
sul dettaglio spiega da quanti giorni segue quel prodotto. Dalla seconda
raccolta in poi lo sconto verificato compare da solo.

Un effetto collaterale: sui PC fissi preassemblati i negozi non dichiarano
quasi mai chipset e alimentatore, quindi quei filtri restano vuoti finché la
raccolta non incontra configurazioni descritte meglio. È un limite del dato di
origine, non dell'estrattore.

## Pubblicare l'app

Il repository ha un solo branch, `claude/tech-offers-hub-mobile-0h4fnw`, che e'
anche quello di default: non c'e' nessun merge da fare. Per mettere l'app online
serve solo abilitare GitHub Pages una volta:

**Settings → Pages → Source: GitHub Actions**

Da quel momento `.github/workflows/pages.yml` pubblica la radice del repository
a ogni push, e `offers.yml` aggiorna le offerte ogni mattina alle 05:15 UTC
ricommettendo `data/offers.json`. E' quel commit quotidiano a costruire lo
storico dei prezzi: gli sconti compaiono dalla seconda raccolta in poi.

Per una prova immediata senza pubblicare nulla, `npm run bundle` produce il file
unico descritto sopra.

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

`npm test` copre l'estrattore di specifiche, robots.txt (incluso `Visit-time`),
la lettura JSON-LD, lo storico prezzi, la deduplica e i punteggi (37 test).

`npm run verify` avvia l'app in Chromium con un viewport da telefono e percorre
i flussi reali — scelta categoria, filtri, ordinamenti, ricerca, dettaglio,
preferiti, link diretto, tema scuro, schermo largo — controllando anche che non
ci siano errori in console né scroll orizzontale (26 controlli). I test si
adattano al dataset caricato, così valgono sia sui dati dimostrativi sia su una
raccolta reale. Gli screenshot finiscono in `.screenshots/`.

## Avvertenza

I prezzi sono rilevati automaticamente e non sono garantiti: controlla sempre
sulla pagina del venditore prima di acquistare. Il progetto è a fini
informativi.
