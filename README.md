# CodexVinci — spike 0.1.1

An open-source, local-first workspace for notes, tasks, and structured knowledge.

Prototipo autonomo di Vincenzo Argese (vaSystems). Nome provvisorio. Non è un fork di Joplin o AppFlowy e non ne incorpora codice.

## Avvio

Richiede Node.js >=22 (verificato con 24.19.0). Nessuna dipendenza applicativa, nessun npm install necessario.

```bash
cd CodexVinci
npm test
npm start
```

Aprire **http://127.0.0.1:4173**. Usare sempre lo stesso host e porta: localhost e 127.0.0.1 hanno archivi distinti. Non aprire index.html via file://.

## Funzioni implementate

- Pagine e sottopagine; titolo modificabile.
- Blocchi separati: testo semplice, titolo, codice, checkbox; riordino con frecce, eliminazione confermata.
- Attività per pagina: titolo, tre stati, data di scadenza.
- Vista tabella e Kanban sul medesimo insieme di attività; spostamento mediante selettore di stato, non drag-and-drop.
- Filtro per titolo delle attività.
- Salvataggio locale alla fine della modifica del campo (blur/change). Controllare il messaggio di stato prima di chiudere.
- Export JSON, import validato con backup preliminare e conferma di sostituzione.
- Cache dell'app shell tramite service worker per riapertura offline dopo il primo caricamento (ancora da verificare in browser).
- Web Locks e revisione per rifiutare sovrascritture da schede obsolete.

## Limiti dichiarati

Questo è uno spike del modello, non un editor rich text di produzione. UI in JavaScript ES modules senza framework; React/TypeScript e l'editor definitivo rimangono una scelta successiva allo spike. Il dominio è isolato dalla UI.

Non implementati: database a schema personalizzato, relazioni, tabelle nei documenti, allegati, Markdown/JEX, Google, sync multidispositivo, account, E2EE, applicazioni native, collaborazione, drag-and-drop, undo e cronologia. La collection è per ora implicitamente associata alla pagina; i task sono record a schema fisso.

Persistenza **localStorage**, limite applicativo 2 MB, 500 pagine e 5000 task. Non è il backend definitivo: le scritture riserializzano l'archivio. I dati possono essere eliminati dalle impostazioni del browser. Export regolare obbligatorio per qualunque dato che si desidera conservare. Non usare questa versione come archivio principale o per dati sensibili.

Non è garantito il salvataggio di un campo ancora in modifica alla chiusura improvvisa. La UI segnala errori, ma non dispone ancora di recupero automatico delle bozze. Dopo un conflitto esportare la sessione e ricaricare. Non sono previsti merge automatici.

## Verifica

```bash
npm test
node --check src/app.mjs
node --check server.mjs
node --check sw.js
```

Test del dominio/storage e del server HTTP inclusi. Controlli di sintassi superati. Vedere docs/VALIDATION.md per la distinzione tra verificato e da verificare.

Test browser opzionale: in un secondo terminale, lasciando npm start attivo:

```bash
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node tests/browser.cjs
```

Il test usa un profilo browser isolato e genera screenshot e un backup di dati sintetici nella directory corrente. Non è stato completato nell'ambiente di creazione: mancava Chromium e il download non era valido. Non equivale a certificazione Safari/iOS.

## Sicurezza e aggiornamenti

Server solo su loopback, allowlist dei file, CSP, nessun accesso a file arbitrari. Nessun servizio esterno o telemetria. Contenuti utente impostati con value/textContent, mai innerHTML. Import limitato e validato, proprietà sconosciute eliminate. Gli errori tecnici registrano codici generici senza contenuti delle note.

L'archivio locale e gli export **non sono cifrati**. Il server è solo per sviluppo. Per una futura distribuzione web servono HTTPS, autenticazione se prevista e un audit dedicato. Il service worker usa cache-first: cambiare CACHE in sw.js per nuove release dell'app shell; chiudere le schede precedenti per consentire l'attivazione dell'aggiornamento.

## Licenza

Codice originale rilasciato sotto MIT, vedi LICENSE. Nome e branding definitivi da scegliere. Eventuali componenti terzi futuri richiedono una revisione delle rispettive licenze.
