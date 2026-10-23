# Backlog verificabile — 23 ottobre 2026

Gli ID CV-* sono identificatori di pianificazione, non numeri di issue GitHub. Nessuna di queste funzionalità target è dichiarata completata. Ogni riga è pronta per diventare una issue con scope, dipendenze e test; evitare PR che uniscano storage, editor e sync.

| ID / fase | Deliverable | Dipende da | Criteri di accettazione |
|---|---|---|---|
| CV-01 / F1 | Chiudere gate browser baseline MVC | Baseline 0.1.3 | Chromium: editing, import/export, tabella/board, offline, due schede; Safari/iOS: IME, focus e riapertura; registrare versioni e risultati |
| CV-02 / F1 | Adapter transazionale e bozze durevoli | CV-01 per rilascio | Commit solo su complete; abort/quota conservano ultimo stato; due schede non sovrascrivono revisioni obsolete; riavvio recupera bozze senza applicarle automaticamente |
| CV-03 / F1 | Export nativo e ripristino | CV-02 | Round-trip di ID/contenuti; formato versionato; import corrotto non modifica archivio; backup verificato prima della sostituzione |
| CV-04 / F2 | Project, Item e ProjectEntry | CV-02 | Documento associabile ad A/B senza copia; spostamento gerarchico solo nel progetto corrente; entry duplicate/cicli rifiutati; contenuti senza progetto raggiungibili |
| CV-05 / F2 | Migrazione delle pagine/task v1 | CV-03, CV-04 | Stessi ID e contenuti; parent convertiti in entry; task collegati alle pagine; retry idempotente e fault injection; fonte v1 e bozze conservate |
| CV-06 / F2 | Dashboard e task per progetto | CV-04, CV-05 | Note/pagine/todo/board accessibili; task condiviso coerente fra progetti e viste; stato persistito dopo reload; filtri non duplicano record |
| CV-07 / F3 | Spike editor e confronto base | Nessuna dipendenza di implementazione | Almeno due componenti OSS valutati e scenario equivalente AppFlowy; licenza/export/footprint; IME, paste, undo e 1000 blocchi; prova iOS reale |
| CV-08 / F3 | Editor a blocchi e syntax highlighting | CV-07, CV-04 | Testo/codice e lingua conservati; set linguaggi in DATA-MODEL; lingua sconosciuta→plaintext; HTML inerte; undo, copy/paste e rendering lunghi verificati |
| CV-09 / F3 | Collection, proprietà e viste | CV-04, CV-06 | Campi tipizzati; record condivisi; filtri e ordinamento; cambi proprietà validati; board/table equivalenti; export completo |
| CV-10 / F4 | Link e backlink | CV-04, CV-08 | Collegamenti documenti/progetti/task per ID; rename innocuo; rimozione reference del blocco aggiorna link in transazione; backlink coerenti; cestino/ripristino verificati |
| CV-11 / F4 | Grafo locale e globale | CV-10 | Filtri per progetto/tipo; espansione a un salto; limite visibile 500 nodi/1500 archi; selezione apre contenuto; navigazione tastiera/lista alternativa; nessun arco inventato dal layout |
| CV-12 / F5 | Mappe mentali | CV-04, CV-10, CV-03 | Nodi liberi/riferiti; gerarchia senza cicli; layout persistito; spostamento non altera link; cancellazione nodo conserva contenuto; undo ed export/import |
| CV-13 / F5 | Asset storage e spike penna | CV-02, CV-03; spike anticipabile | Blob separati, hash e limiti; quota senza perdita; penna/touch su iPad e desktop; misurare latenza e tratti senza promettere palm rejection non verificata |
| CV-14 / F5 | Disegno e scrittura a mano | CV-13, CV-08 | Tratti vettoriali modificabili, gomma/undo, pressione quando disponibile; autosave in batch; crash recovery; export/import conserva editabilità e allegati |
| CV-15 / F6 | Import Joplin | CV-03, CV-08, CV-13 | Notebook→progetti secondo mapping documentato; note/tag/asset/link preservati o report; fixture anonimizzate; nessuna modifica della sorgente |
| CV-16 / F6 | Protocollo sync e implementazione | CV-02, CV-04, CV-10 | ADR E2EE e tombstone; due dispositivi offline, edit/delete, retry e restore; conflitti espliciti senza perdita silenziosa; autorizzazione separata dall'appartenenza |
| CV-17 / F6 | Google Tasks | CV-16 e audit API/OAuth | Binding idempotenti, riconciliazione dopo timeout, stati locali conservati, revoca e token protetti; test su account di prova |
| CV-18 / F6 | Google Calendar | CV-17 | Pianificazione esplicita, date/ore separate, DST Europe/Rome, token incrementale invalidato, eliminazione evento non elimina task |
| CV-19 / F6 | Packaging piattaforme | CV-01, CV-08, CV-14 per penna | Debian primo; installazione/aggiornamento/migrazione; matrice Windows/macOS/iOS/Android/web con capacità e limiti effettivi |
| CV-20 / F7 | Autocompletamento AI | CV-08, CV-10; non richiede sync | Provider locale/remoto, opt-in, contesto visibile; zero espansione implicita del grafo; timeout/cancel; proposta obsoleta non applicata; accetta/scarta/undo; misurare latenza e consumo token |

## Ordine immediato

CV-01 e CV-02 sono il prossimo incremento eseguibile. CV-07 e lo spike di CV-13 possono anticipare le scelte dei componenti; poi CV-03–06 realizzano la prima versione a progetti. Le release funzionali successive sono vincolate ai rispettivi gate, non solo ai test unitari.

## Fixture e scenari trasversali

- Due progetti, un documento condiviso, un task comune, una nota non organizzata e un progetto archiviato.
- Rimuovere una entry con figli, cestinare/ripristinare documento e progetto, verificare riferimenti e asset.
- Importare duplicati, endpoint assenti, gerarchie cicliche, blob troncati e coordinate non finite: rifiuto atomico e messaggio utile.
- Tre viste aperte sullo stesso record: stato coerente dopo commit, errore visibile dopo conflitto.
- Documento 1000 blocchi, grafo entro/oltre budget, disegno con 10.000 tratti: registrare dataset, dispositivo e tempi. Obiettivi prestazionali numerici da fissare dopo lo spike; nessuna promessa non misurata.

## Definition of done

MVC rispettato; invarianti e migrazioni documentate; test adeguati al comportamento modificato; log senza contenuti/credenziali; export/ripristino verificato per nuovi dati; prova browser/device per interazioni nuove; limiti aggiornati. Ogni PR indica requisiti R* e task CV-* coperti. La roadmap non sostituisce le prove e non costituisce una data di consegna.
