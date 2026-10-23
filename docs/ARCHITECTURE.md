# Decisioni architetturali — 22 ottobre 2026

## Obiettivo

Workspace open source per Debian, Windows, macOS, browser, iOS e Android. Pagine a blocchi, database e viste tabella/Kanban; task collegabili a Google Tasks e pianificazione su Calendar. Queste sono piattaforme e funzioni target, non già supportate/verificate da questo spike.

## ADR-001 — App autonoma: decisione provvisoria

La preferenza è un'app autonoma con migrazione da Joplin. Un fork Joplin mantiene sottosistemi maturi ma introduce una divergenza importante se cambiamo il modello di note in documenti/collection. Un fork AppFlowy resta un'alternativa: questo spike non sostituisce un audit del repository né dimostra che costruire da zero costi meno.

Prima di consolidare la scelta, confrontare lo stesso scenario in AppFlowy: build riproducibile, editor mobile, database/board, web self-hosted, modello offline e conflitti, licenze di ogni componente, punti d'estensione per Google. Registrare commit/tag e risultati; non assumere che i servizi hosted siano riproducibili dal solo client.

## ADR-002 — Separazione dati/viste

src/domain.mjs contiene validazione, comandi immutabili e query. src/store.mjs implementa un adapter temporaneo di persistenza. src/app.mjs rende la UI. Le viste non possiedono copie dei task. Le checkbox di documento sono distinte dalle attività. Tutte le entità hanno ID stabili.

Il modello di produzione dovrà esplicitare Collection, Property, Record, View ed ExternalBinding. Migrazione schema v1 -> v2 da progettare: non interpretare il task a schema fisso dello spike come database Notion completo.

## ADR-003 — Persistenza e sincronizzazione

localStorage serve solo a verificare il flusso. Prima di ampliare i dataset: adapter transazionale IndexedDB o SQLite/WASM sul web, scelta coordinata con storage desktop/mobile. Non selezionare un wrapper sulla sola possibilità di compilare: verificare editor, tastiera, lifecycle, allegati e aggiornamenti.

Sync dispositivi: definire revisioni per entità, outbox, ID operazione, idempotenza, tombstone, retention, autenticazione e protocollo di conflitto prima dell'implementazione. La sola revision globale attuale respinge scritture obsolete; non è un protocollo distribuito. La collaborazione simultanea richiede un'ulteriore decisione su CRDT/OT e non entra nel primo MVP.

## ADR-004 — Google

Google Tasks e Google Calendar sono connettori separati dalla sincronizzazione dei dispositivi. Task -> Tasks per data e completamento; task -> Calendar solo per un evento pianificato esplicitamente. Gli stati intermedi locali non vanno cancellati dal mapping binario Tasks.

ExternalBinding: provider, account, localId, remoteId, collection remota, ultima versione remota, snapshot comune dei campi sincronizzati, stato retry. Una creazione remota che va in timeout può essere riuscita: riconciliare prima di ritentare, non promettere exactly-once senza supporto del provider. Per modifiche concorrenti confrontare locale/remoto/base, mostrare conflitti senza last-write-wins silenzioso. Le cancellazioni remote non devono distruggere pagine locali.

Date di scadenza come date civili; eventi come istanti e timezone IANA. Testare DST Europe/Rome. Calendar usa sync token; Tasks ha un proprio algoritmo da verificare contro le API correnti.

## ADR-005 — Privacy

Decidere E2EE prima del server di produzione. Un connettore server always-on necessita dei dati selezionati in chiaro e delle credenziali. Alternativa: sincronizzazione Google sul client autorizzato, senza garanzia di background continuo su mobile. Scope minimi, token protetti da adapter di piattaforma, revoca e cancellazione dei binding. Nessun secret in client pubblici.

## Fonti tecniche consultate nella progettazione

- https://joplinapp.org/help/dev/spec/architecture/
- https://joplinapp.org/help/dev/spec/web_app/
- https://github.com/AppFlowy-IO/AppFlowy
- https://developers.google.com/tasks/reference/rest/v1/tasks
- https://developers.google.com/workspace/calendar/api/guides/sync

Questa consegna non include build o audit completo dei progetti upstream.

## Incremento 0.1.2 — Editing

La UI usa src/editing.mjs per serializzare commit e conservare bozze validate in sessionStorage. Il commit continua a controllare la revisione sotto Web Lock. Un ACK cancella la bozza solo se il payload coincide: un commit precedente non elimina input successivi. Recupero esplicito dopo reload, nessun merge automatico. localStorage rimane l’archivio autorevole; sessionStorage è un buffer di sessione, non WAL transazionale o backup durevole. L’export bozze è un JSON di comandi per recupero manuale. IndexedDB/SQLite restano un incremento successivo.

## ADR-006 — MVC obbligatorio (accettata, 22 ottobre 2026)

Da 0.1.3, MVC è il vincolo architetturale del progetto, indipendente dal framework della View.

| Livello | Implementazione | Contratto |
|---|---|---|
| Model | `src/model/domain.mjs`, `workspace.mjs` | Validazione, transizioni, query, stato confermato; nessun DOM o storage browser globale |
| Controller | `src/controllers/workspace-controller.mjs`, `editing.mjs` | Azioni, coda, autosave, recupero bozze, import/export, stato di navigazione |
| View | `src/views/workspace-view.mjs`, `dom.mjs` | Rendering tramite textContent/value; eventi inoltrati al Controller; nessuna persistenza |
| Infrastruttura | `src/infrastructure/local-storage.mjs` | Adapter storage e Web Locks iniettati |
| Composition root | `src/app.mjs` | Iniezione dipendenze, lifecycle browser, download e avvio |

`domain.mjs`, `store.mjs`, `editing.mjs` nella radice src sono re-export di compatibilità, non implementazioni duplicate. I riferimenti precedenti in questo documento descrivono la baseline storica.

Il repository espone `load()` e `save(next, expectedRevision)`, anche asincroni. Il Model pubblica lo stato solo dopo il successo del repository e restituisce snapshot scollegati dalla propria memoria. Il Controller è l'unico punto di serializzazione dei comandi applicativi: chiamare direttamente execute/replace in parallelo non è supportato. L'adapter attuale verifica le revisioni sotto Web Lock.

Il Controller non importa la View: riceve una porta UI con render/status/confirm/prompt/download, bozze, clock e logger. Questo consente test senza DOM, timer reali o storage browser. La View può raggruppare/ordinare per presentazione, ma non validare o persistere il dominio.

Compatibilità: schemaVersion 1, chiavi localStorage/sessionStorage e formato export restano invariati. Nessuna migrazione dati in questo incremento. Cache app shell aggiornata a v3 con tutti i moduli MVC.

## ADR-007 — Prossimo incremento di persistenza (proposta, non implementata)

Valutare IndexedDB sul web tramite lo stesso contratto repository. Requisiti: compare-and-swap della revisione in una transazione readwrite, evento complete come conferma, rollback su abort, migrazione idempotente da localStorage senza eliminare la sorgente e bozze durevoli per scheda. Definire l'identità delle schede e il recupero di bozze orfane; non confondere sessionStorage con crash recovery.

Prima dello switch: test su IndexedDB reale per commit/abort, due schede concorrenti, riavvio, quota, import e ripristino. Nessun fallback silenzioso a seed o localStorage dopo un errore di migrazione. Questa decisione non seleziona ancora lo storage dei client nativi né il protocollo sync.

## ADR-008 — Progetti e contenuti condivisi (23 ottobre 2026)

Decisione di progettazione: contenuti con identità autonoma e appartenenze molti-a-molti ai progetti. La gerarchia di navigazione è contestuale alla ProjectEntry; duplicare e associare sono comandi diversi. Link espliciti tra contenuti e progetti alimentano il grafo; il rendering del grafo non richiede inizialmente un database specializzato. Il runtime v1 non implementa ancora queste entità. Specifica e migrazione in [DATA-MODEL.md](DATA-MODEL.md).

## ADR-009 — Grafo, mappe e manoscritto (23 ottobre 2026)

Tre strumenti con modelli separati: grafo come proiezione dei Link, mappa come gerarchia/layout di nodi anche riferiti a Item, disegno come tratti vettoriali di un blocco. Nessuna copia implicita delle note e nessuna deduzione di relazioni dalla posizione sul canvas. Anteprime e token di highlighting sono dati derivati; tratti e layout manuali sono dati autorevoli da esportare e recuperare.

## ADR-010 — Autocompletamento AI differito (23 ottobre 2026)

CompletionProvider iniettato nel Controller, senza accesso autonomo al repository. Contesto selezionato, nessuna espansione implicita dei collegamenti, risposta proposta e applicata solo dopo accettazione su revisione compatibile. Modelli locali e remoti dietro lo stesso contratto; credenziali fuori dall'archivio dei contenuti. Nessuna libreria/provider selezionato in questa revisione.

Diagramma e responsabilità target: [MVC-DESIGN.md](MVC-DESIGN.md). Requisiti aggiornati e fasi: [PRODUCT-PLAN.md](PRODUCT-PLAN.md); criteri verificabili: [BACKLOG.md](BACKLOG.md). Queste decisioni estendono la direzione della baseline, senza dichiarare già implementate le funzionalità pianificate.
