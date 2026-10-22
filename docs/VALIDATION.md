# Verifica 0.1.3

Ambiente: Node.js 24.19.0, Linux. Nessuna verifica su dispositivi Apple/Android o Windows.

| Controllo | Esito |
|---|---|
| 26 test dominio/Controller/persistenza/bozze/coda/server | PASS |
| Sintassi di tutti i moduli src, test, scripts e server | PASS |
| HTTP: tutti i moduli MVC e header CSP | PASS |
| HTTP: file non consentiti e percorsi sconosciuti | 404, PASS |
| HTTP: POST non consentito | 405, PASS |
| Browser Chromium | NON ESEGUITO: eseguibile assente, download restituito non valido |
| Layout desktop/mobile | NON VERIFICATO VISIVAMENTE |
| Offline/service worker | IMPLEMENTATO, NON VERIFICATO IN BROWSER |
| Safari/iOS reale | NON VERIFICATO |

Test browser riproducibile incluso in tests/browser.cjs: modifica blocchi, creazione attività, passaggio Kanban/tabella, export, larghezza mobile, riapertura offline, conflitto tra schede e contenuti HTML inerti. Non considerarlo passato finché non viene eseguito.

## Verifica manuale prima dell'uso

1. Avviare su loopback, creare una sottopagina e modificare un blocco; uscire dal campo e attendere conferma.
2. Creare un task, cambiare stato nel Kanban e controllare la tabella.
3. Esportare JSON, aprire una seconda istanza di test in un profilo browser separato, importare e confrontare i contenuti.
4. Dopo il primo caricamento/attivazione service worker, interrompere la connessione e riaprire.
5. Provare due schede contemporanee: la seconda scrittura obsoleta deve essere rifiutata.
6. Verificare errori storage e non usare dati reali prima di completare il gate browser/mobile.

## Incremento 0.1.2

Aggiunti sei test: commit concorrenti in ordine, ripresa dopo errore, recupero bozza dopo reload, ACK obsoleto, quota storage, archivio bozze corrotto. Modulo editing incluso nell’allowlist HTTP e nella cache offline. Integrazione UI di autosave/bozze non ancora verificata con browser reale.

## Incremento 0.1.3

Nove test MVC aggiunti: coerenza viste e isolamento snapshot, coda con repository asincrono, errore storage e retry, debounce/composizione/flush, import e backup, import con modifiche concorrenti, conflitto tra Controller, assenza Web Locks, eliminazione bozze e cancellazione timer. Test HTTP esteso a tutti i moduli con controllo della loro presenza nella cache shell. Nessuna nuova verifica visuale o iOS: Chromium non disponibile in questo runtime. Persistenza transazionale NON implementata in questo refactoring.
