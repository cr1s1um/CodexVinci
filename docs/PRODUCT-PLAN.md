# CodexVinci — prodotto e piano di sviluppo

Stato: proposta di prodotto basata sui requisiti dell'utente; MVC accettato. 22 ottobre 2026.

## Obiettivo
Workspace open source local-first: appunti a blocchi, pagine, task e database. Tabella e Kanban sono viste degli stessi record. Piattaforme target: Debian, Windows, macOS, web, iOS, Android; prima validazione web/Debian con gate iOS anticipato. Nessuna promessa di parità tra piattaforme prima delle verifiche.

## Scenario guida
Creo “Progetto sito scuola”, scrivo appunti, aggiungo attività, passo da tabella a Kanban, completo un task e riapro offline. Export e ripristino devono conservare dati e identificatori.

## Brainstorming e priorità

| Area | Primo MVP | Evoluzione |
|---|---|---|
| Taccuino | Pagine/sottopagine, preferiti, ricerca testuale | Cattura rapida, template |
| Editor | Rich text, titoli, liste, checkbox, codice, immagini, tabelle semplici, undo/redo | Blocchi avanzati e viste incorporate |
| Task | Titolo, descrizione, stato, priorità, scadenza | Ricorrenze, promemoria, trasformazione blocco→task |
| Database | Collection, campi testo/numero/data/select/checkbox | Relazioni, formule, rollup |
| Viste | Tabella/Kanban, filtri e ordinamento | Viste salvate e calendario |
| Affidabilità | Persistenza transazionale, recupero bozze, cestino, export/import | Cronologia e backup automatici |
| Conoscenza | Link interni | Backlink, tag, grafo solo se utile |
| Migrazione | Export nativo completo | Import Joplin con report e allegati |
| Integrazioni | Nessun servizio necessario per il locale | Google Tasks, poi Calendar |
| Collaborazione/AI | Escluse dall'MVP | Collaborazione e AI opzionale come progetti separati |

Distinzioni di dominio: checkbox del documento ≠ task sincronizzabile; tabella semplice ≠ collection; evento Calendar ≠ task. Il formato canonico è strutturato e versionato; Markdown è un formato di interoperabilità, potenzialmente non fedele.

## Fasi e gate

| Fase | Deliverable | Accettazione |
|---|---|---|
| 0 — Contratti | MVC, modello attuale, requisiti MVP e ADR | Dipendenze e limiti espliciti |
| 1 — MVC | Separazione del prototipo e repository iniettato | Test Model/Controller senza DOM; nessuna modifica al formato v1 |
| 2 — Persistenza | Backend transazionale e migrazione v1 | Commit/abort, quota, recupero e concorrenza verificati nel browser |
| 3 — Editor | Spike comparativo editor OSS e confronto AppFlowy | IME, selezione, paste, undo/redo, 1000 blocchi su desktop e iOS |
| 4 — Workspace | Editor integrato, allegati, ricerca, cestino | Progetto completo creabile, esportabile e ripristinabile |
| 5 — Database | Collection esplicite e proprietà tipizzate | Record coerenti in tutte le viste e round-trip completo |
| 6 — Alpha | Offline, accessibilità e pacchetto Debian | Workflow guida e matrice browser verificati |
| 7 — Sync | Protocollo multidispositivo e connettori Google | Conflitti, delete/edit e retry senza perdita silenziosa |
| 8 — Distribuzione | Client e aggiornamenti per le altre piattaforme | Migrazioni e compatibilità verificate per piattaforma |

Stato attuale: fasi 0–1 implementate/documentate in 0.1.3 con gate browser ancora aperto. Fasi successive non implementate. Nessuna data impegnativa fino al gate editor e alla scelta del backend.

## Decisioni aperte
- Editor e wrapper: scegliere dopo lo spike iOS, non dalla sola disponibilità di build.
- App autonoma: preferenza attuale; completare il confronto AppFlowy prima di consolidare il core di produzione.
- Sync: revisioni per entità, tombstone, outbox e idempotenza da definire prima del protocollo.
- E2EE: decidere prima di consolidare il sync; Google client-side vs servizio always-on cambia il modello di fiducia.
- Licenze: codice attuale MIT; verificare compatibilità di ogni componente introdotto.

## Flusso GitHub
Una milestone logica per fase; issue con problema, perimetro, criteri di accettazione e rischi. PR focalizzate con test e limiti; gate browser non verificati restano dichiarati. La milestone non implica una data di consegna. Non aggiungere account, telemetria o upload esterni implicitamente.
