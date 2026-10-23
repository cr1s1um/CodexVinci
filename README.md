# CodexVinci — spike 0.1.4

An open-source, local-first workspace for notes, tasks, and structured knowledge.

Prototipo autonomo di Vincenzo Argese / vaSystems. Codice originale, non fork di Joplin/AppFlowy. Architettura MVC.

## Avvio

Node.js >=22 (verificato localmente con 24.19.0):

```bash
npm ci
npm run check
npm test
npm start
```

Aprire **http://127.0.0.1:4173**. Host e porta identificano l'archivio del browser; localhost e 127.0.0.1 sono archivi distinti. Non usare file://. Le dipendenze npm sono solo di sviluppo/test; il client non carica servizi o librerie da CDN.

## Funzioni disponibili

- Pagine/sottopagine e blocchi testo, titolo, codice semplice e checkbox.
- Task con tre stati e data; tabella/Kanban sugli stessi record, filtro per titolo.
- Autosave dopo 600 ms, commit in coda e controllo delle revisioni.
- **IndexedDB transazionale**: stato pubblicato solo dopo complete; aggiornamento archivio e conferma della bozza esatta nella stessa transazione.
- Bozze persistite per sessione, recuperabili esplicitamente dopo reload, chiusura scheda o riavvio browser una volta completata la scrittura.
- Export/import JSON v1 validato, con backup prima della sostituzione.
- Cache app shell per riapertura offline dopo primo caricamento e attivazione service worker, verificata in Chromium.

## Migrazione e recupero

Al primo avvio l'archivio v1 in localStorage viene validato e copiato in IndexedDB senza cancellare la sorgente. La migrazione è ripetibile e non sovrascrive un target già inizializzato. Le bozze legacy in sessionStorage vengono importate una volta per snapshot; restano da applicare esplicitamente.

Ogni caricamento crea una sessione nuova. **Salva bozze** applica quelle della scheda corrente. **Recupera altre sessioni** considera solo sessioni che non possiedono più il proprio Web Lock; chiede conferma prima di applicare testo che potrebbe essere meno recente dei dati correnti. **Elimina altre sessioni** rimuove esclusivamente le bozze delle sessioni inattive, con conferma. Nessun merge automatico.

**Esporta backup** contiene i dati confermati. **Esporta bozze** comprende input della scheda corrente e bozze persistite delle altre sessioni, con identificatori di sessione; è un file di recupero manuale, non un archivio importabile. Importare un archivio richiede prima di risolvere le bozze pendenti.

In caso di archivio illeggibile, la schermata iniziale consente export grezzo di IndexedDB e download delle sorgenti legacy. Il dump grezzo non è un backup importabile dall'interfaccia. La rimozione del database con sentinella legacy ancora presente blocca il riavvio automatico da una copia obsoleta: conservare il profilo e ripristinare consapevolmente. L'eliminazione di tutti i dati del sito rimuove anche la sentinella e non è rilevabile.

Chiudere le schede con versioni precedenti prima dell'aggiornamento. Se il vecchio client modifica la sorgente localStorage dopo la migrazione, il nuovo avvio segnala il problema invece di ignorare o unire le modifiche.

## Verifica

```bash
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

I test avviano il proprio server su 4173: fermare npm start prima di eseguirli. Dipendenze test fissate nel lockfile. Il test browser usa profili isolati e dati sintetici, genera screenshot e backup in test-results/ e verifica anche riavvio completo del browser. Opzionale: CODEXVINCI_CHROMIUM_PATH indica un eseguibile Chromium alternativo.

37 test Node passati; browser reale Chromium verificato, inclusi offline, conflitti, rollback e recupero. [Evidenze e limiti](docs/VALIDATION.md). Safari/iOS, Android e guasti fisici del dispositivo non ancora verificati.

## Limiti

Storage ed export non cifrati; dati eliminabili dal browser o dal sistema. IndexedDB non sostituisce un backup. Un input interrotto prima della conferma della scrittura può andare perso. In caso di quota i dati restano nel buffer della scheda e va eseguito export/copia prima di chiuderla. La garanzia è transazionale, non di persistenza fisica contro perdita di alimentazione.

Conservati i limiti v1: archivio 2 MB, 500 pagine, 5000 task; bozze totali 1000 / 2 MB, con metadati inclusi. Il workspace viene ancora salvato come snapshot completo. Le nuove attività non ancora aggiunte non hanno recupero bozze. Web Locks serve per distinguere sessioni attive durante recupero/eliminazione; la concorrenza dell'archivio è protetta dalle transazioni IndexedDB anche senza Web Locks. Il bootstrap richiede ancora accesso a localStorage per migrazione/sentinella e a sessionStorage per le bozze legacy.

Non implementati: progetti e documenti condivisi, grafo, mappe mentali, disegno/penna, syntax highlighting, AI, collection personalizzabili, allegati, Joplin import, Google, sync multidispositivo, E2EE, client nativi, collaborazione e undo generale. Vedere [piano prodotto](docs/PRODUCT-PLAN.md) e [roadmap](ROADMAP.md).

## Sicurezza e architettura

Server di sviluppo solo loopback, allowlist asset, CSP, contenuti tramite textContent/value, import validato, nessuna telemetria. Model in src/model; Controller in src/controllers; View in src/views; adapter in src/infrastructure; src/app.mjs compone le dipendenze. Lo schema dei contenuti rimane v1; la versione del database IndexedDB è separata.

Cache shell v4: chiudere le vecchie schede per attivare l'aggiornamento. Non usare questa versione come archivio principale prima dei gate di piattaforma. Codice MIT; fake-indexeddb e Playwright sono dipendenze di sviluppo Apache-2.0, non incluse nel client browser.
