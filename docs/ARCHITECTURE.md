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
