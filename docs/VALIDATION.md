# Verifica 0.1.4 — 23 ottobre 2026

Ambiente locale: Linux, Node.js 24.19.0, Playwright 1.62.1. Chromium headless 153.0.8010.0, eseguibile ottenuto dal pacchetto npm @sparticuz/chromium 153.0.0 perché il download standard Playwright restituiva un archivio invalido. Questo pacchetto è uno strumento locale di verifica, non una dipendenza del repository. CI installa il Chromium previsto dalla versione Playwright fissata nel lockfile.

| Controllo | Esito locale |
|---|---|
| Sintassi moduli, test, script e server | PASS |
| 37 test Node (dominio, Controller, adapter, bozze, HTTP) | PASS |
| Concorrenza e migrazione IndexedDB | PASS con fake-indexeddb; migrazione anche in Chromium |
| Abort dopo put, rollback e conservazione bozze | PASS con fake-indexeddb; rollback anche in Chromium reale |
| Errore quota | Simulato nel test buffer; esaurimento disco/quota reale non verificato |
| Editing, tabella/Kanban ed export | PASS Chromium |
| Riapertura offline/service worker | PASS Chromium |
| Scheda obsoleta e protezione sessione attiva | PASS Chromium |
| Recupero dopo chiusura scheda e riavvio completo browser | PASS Chromium, profilo temporaneo persistente |
| Import legacy e ACK senza duplicazione al reload | PASS Chromium |
| HTML ostile reso inerte e assenza pageerror | PASS Chromium |
| Layout 1440 px e 390 px | Screenshot ispezionati; nessun overflow orizzontale |
| Safari/iOS reale, Android, Windows, macOS | NON VERIFICATI |
| Interruzione fisica alimentazione, perdita disco | NON VERIFICATE |

## Riproduzione

npm ci; npm run check; npm test. Per browser: npx playwright install chromium, poi npm run test:browser. Chiudere il server di sviluppo: i test avviano la porta 4173. Usare CODEXVINCI_CHROMIUM_PATH solo per un eseguibile alternativo disponibile. Profilo e dati reali dell'utente non vengono usati. test-results/ è escluso da git.

## Confini delle prove

fake-indexeddb testa il contratto e i fallimenti, non le policy di eviction/quota dei browser. Il browser test verifica una chiusura normale completa e riapertura, non un guasto fisico; la bozza deve aver completato la transazione prima della chiusura. Il limite 2 MB resta applicativo. Le nuove funzionalità progetti/grafo/mappe/penna non fanno parte di questa verifica.

Il gate browser desktop ora ha evidenze positive. CV-01 rimane parzialmente aperto per Safari/iOS; CV-02 implementato in questo incremento rimane da validare sulle altre piattaforme. La PR resta in bozza, senza merge automatico.
