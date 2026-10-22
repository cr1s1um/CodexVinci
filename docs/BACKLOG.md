# Backlog ordinato

1. **Gate editor/mobile**: confrontare editor OSS a blocchi; prova su Safari/iOS reale (IME, composizione, selezione, undo, paste, 1000 blocchi). Pass: nessuna perdita in salvataggio/riapertura, navigazione touch usabile.
2. **Gate base applicativa**: build e scenario equivalente su AppFlowy, audit web/self-hosted/licenze, decisione motivata fork vs autonomia.
3. **Persistenza transazionale**: sostituire localStorage, bozze recuperabili, migrazione v1, backup automatici, test fault injection. Pass: interruzione a ogni fase senza perdita dello stato precedente.
4. **Database**: collection esplicita, testo/numero/data/select/checkbox, tabella e board; record con pagina. Pass: cambio proprietà coerente tra viste e round-trip export completo.
5. **Import Joplin**: prima corpus Markdown, poi JEX e risorse; mapping ID/link, report degli elementi non convertiti. Test contro fixture reali anonimizzate, nessuna modifica della sorgente.
6. **Sync due dispositivi**: server self-hostable e protocollo documentato. Test modifiche offline concorrenti, delete/edit, rete intermittente, retry, restore.
7. **Google Tasks**: OAuth e binding; test mock e poi account di prova. Pass: niente duplicati dopo timeout/retry, nessuna perdita degli stati locali intermedi.
8. **Google Calendar**: eventi espliciti, timezone e DST, sync token invalidato, cancellazioni e riconciliazione.
9. **Packaging**: Debian primo client desktop; Windows/macOS e mobile secondo matrice verificata. Firma, distribuzione, aggiornamenti e compatibilità migrazioni.

Fuori dal primo MVP: AI, collaborazione real-time, formule/rollup, marketplace plugin, completa parità con Notion.
