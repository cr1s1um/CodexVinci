# CodexVinci roadmap

Aggiornata il 23 ottobre 2026. Le fasi sono traguardi funzionali, non versioni già rilasciate o date promesse.

## Baseline 0.1.3 — implementata
- [x] Pagine, blocchi semplici, task fissi e viste tabella/Kanban
- [x] Architettura MVC e dipendenze iniettate
- [x] Autosave, coda e bozze di sessione
- [x] Export/import JSON v1 e controllo revisioni
- [x] 26 test locali nella revisione MVC e CI verde del relativo commit
- [ ] Gate browser/offline/iOS concluso

## D0 — progettazione estesa
- [x] Modello logico per progetti, appartenenze e contenuti condivisi
- [x] Distinzione tra grafo, mappa mentale e disegno
- [x] Diagramma MVC, migrazione proposta e backlog verificabile

## F1 — affidabilità (incremento 0.1.4)
- [x] Storage IndexedDB transazionale e bozze durevoli per sessione
- [x] Migrazione storage non distruttiva e test di rollback/concorrenza
- [x] Chromium: offline, recupero dopo chiusura scheda e riavvio browser
- [ ] Safari/iOS e validazione delle altre piattaforme
- [ ] Export nativo multi-entità e asset (oltre il JSON v1 attuale)

## F2 — workspace a progetti
- [ ] Progetti, documenti condivisi e gerarchie contestuali
- [ ] Migrazione v1→v2
- [ ] Dashboard, todo e Kanban per progetto

## F3 — editor e database
- [ ] Spike editor/iOS e confronto della base applicativa
- [ ] Editor a blocchi, syntax highlighting e undo
- [ ] Collection tipizzate e viste coerenti

## F4 — conoscenza collegata
- [ ] Link tra contenuti/progetti e backlink
- [ ] Grafo locale/globale con filtri, budget e navigazione accessibile

## F5 — strumenti visuali
- [ ] Mappe mentali con riferimenti ai contenuti
- [ ] Asset, disegno e scrittura a mano; verifica penna iPad

## F6 — interoperabilità e distribuzione
- [ ] Import Joplin con report
- [ ] Sync multidispositivo e modello di fiducia/E2EE
- [ ] Google Tasks e Calendar
- [ ] Pacchetti Debian, Windows, macOS, iOS e Android; web verificato

## F7 — AI opzionale
- [ ] Autocompletamento locale/remoto, contesto esplicito e accettazione manuale

[Modello dati](docs/DATA-MODEL.md) · [MVC](docs/MVC-DESIGN.md) · [Piano prodotto](docs/PRODUCT-PLAN.md) · [Backlog e gate](docs/BACKLOG.md)
