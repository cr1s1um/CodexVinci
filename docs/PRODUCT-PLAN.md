# CodexVinci — prodotto e piano di sviluppo

Aggiornamento: 23 ottobre 2026. Requisiti dell'utente recepiti; questa revisione aggiunge progettazione, non nuove funzioni al runtime 0.1.3.

## Direzione scelta

Workspace open source local-first organizzato in progetti. Ogni progetto presenta documenti, attività, database e Kanban. Uno stesso documento può essere associato a più progetti senza duplicazioni; link espliciti formano una rete di conoscenza navigabile. Mappe mentali e appunti manoscritti sono strumenti complementari.

Piattaforme target: Debian, Windows, macOS, web, iOS, Android. Prima implementazione web/Debian, verifica anticipata di editor e penna su iPad/iOS. MVC resta obbligatorio. Il confronto AppFlowy e l'audit dei componenti rimangono gate per consolidare lo stack di produzione.

## Requisiti e perimetro

| ID | Requisito | Soluzione progettata | Consegna |
|---|---|---|---|
| R1 | Organizzare note in progetti | Project e ProjectEntry separati dal documento | MVP progetti |
| R2 | Note, pagine, todo e Kanban per progetto | Documento a blocchi; task condiviso fra viste | MVP progetti |
| R3 | Collegamenti tra note e progetti | Link tipizzati, backlink, grafo locale/globale filtrato | Incremento conoscenza |
| R4 | Mappe mentali collegate alle note | Nodi testuali o riferimenti, layout persistito | Incremento visuale |
| R5 | Note disegnate e manoscritte | Tratti vettoriali modificabili in blocchi drawing | Incremento visuale |
| R6 | Code syntax highlighting | Linguaggio per blocco, rendering derivato | MVP progetti |
| R7 | AI per autocompletamento successivo | Provider locale/remoto, contesto e accettazione espliciti | Dopo consolidamento editor |

Richieste precedenti conservate: proprietà database, ricerca, export/import, sync dispositivi, Google Tasks/Calendar e distribuzione sulle sei piattaforme. AI non precede affidabilità, editor e formato dei dati.

## Scenari di accettazione del prodotto

- Creo “Corso informatica” e “Infrastruttura scuola”; la nota “Reti TCP/IP” compare in entrambi con un solo ID. La modifica è visibile da entrambi.
- Nel progetto creo un task e lo completo da Kanban: tabella e ogni altra vista mostrano lo stesso completamento dopo riapertura offline.
- Collego la nota a un documento dell'altro progetto: apro backlink e grafo; il titolo può cambiare senza rompere il collegamento.
- Inserisco la nota in una mappa mentale: spostare il nodo cambia solo il layout; eliminarlo conserva la nota.
- Scrivo con penna e aggiungo un blocco Python: dopo export/import i tratti restano modificabili, il codice conserva testo e linguaggio.
- Richiedo un completamento AI usando solo la nota corrente: nessuna nota collegata viene inclusa implicitamente; accetto o scarto la proposta.

## Sequenza di sviluppo

| Fase | Obiettivo | Dipendenze e gate |
|---|---|---|
| D0 — Progettazione | Modello, MVC e backlog | Documenti di questa revisione |
| F1 — Affidabilità | Transazioni, bozze durevoli, export e migrazione storage | Test browser reali, quota/abort/concorrenza; baseline 0.1.3 |
| F2 — Progetti | Identità, appartenenze, gerarchie e task per progetto | F1; migrazione v1→v2 e prove di riutilizzo |
| F3 — Editor e database | Editor selezionato, codice evidenziato, proprietà e viste | F1; spike editor/iOS anticipabile; F2 per integrazione |
| F4 — Conoscenza | Link, backlink e grafo filtrabile | F2, nodi reference dell'editor; query prima del rendering |
| F5 — Strumenti visuali | Mappe, asset e manoscritto | F2/F3; asset storage prima del disegno; gate penna iPad |
| F6 — Interoperabilità | Import Joplin, sync, Google e packaging | Export stabile; protocollo conflitti/E2EE prima del sync |
| F7 — AI opzionale | Autocompletamento e gestione del contesto | Editor affidabile, revisioni e undo; provider dietro adapter |

F6 e F7 non sono necessariamente sequenziali: l'AI può essere locale prima del sync se i suoi gate sono soddisfatti. Lo spike penna è anticipato per evitare una scelta incompatibile del canvas. Nessuna stima di calendario prima degli spike.

## Stato e documenti autorevoli

Implementato nella baseline MVC e nell’incremento 0.1.4: MVC, pagine/blocchi semplici, task fissi, tabella/Kanban, autosave, storage IndexedDB transazionale e bozze persistite per sessione. Progetti, grafo, mappe, penna, highlighting e AI NON sono ancora implementati. La verifica 0.1.4 comprende 37 test Node e test Chromium di UI/offline/recupero/rollback; Safari/iOS resta aperto.

- [Modello dati e migrazione](DATA-MODEL.md)
- [Diagramma MVC e flussi](MVC-DESIGN.md)
- [Backlog con dipendenze e criteri di accettazione](BACKLOG.md)
- [Decisioni architetturali](ARCHITECTURE.md)
- [Roadmap](../ROADMAP.md)

## Esclusioni e decisioni successive

Nessuna collaborazione simultanea, OCR manoscritto, esecuzione di codice, training di reti neurali o formule/rollup nel primo MVP. La futura selezione delle librerie richiede audit licenza, formati esportabili, performance e prove iOS. Nessun servizio esterno necessario per le funzioni locali; nessuna telemetria o trasmissione implicita all'AI.
