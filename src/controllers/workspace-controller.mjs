import {createQueue, draftKey} from './editing.mjs';
import {MAX_BYTES} from '../model/domain.mjs';

/** Orchestrates user actions without DOM or browser storage dependencies. */
export function createWorkspaceController({model, drafts, ui, clock = globalThis, logger = console}) {
  const writes = createQueue(), timers = new Map();
  let selected = model.snapshot().pages[0].id, view = 'document', query = '';
  let notice = drafts.all().length ? 'Bozze recuperate nella scheda: controllale e usa Salva bozze.' : 'Pronto · archivio locale';
  let error = false;
  function status(message, failed = false) { notice = message; error = failed; ui.status(message, failed); }
  function render() {
    const state = model.snapshot();
    selected = state.pages.find(p => p.id === selected)?.id ?? state.pages[0].id;
    ui.render({state, selected, view, query, notice, error, tasks: model.tasks(selected, query), statuses: model.statuses()});
  }
  function cancelTimers() { for (const timer of timers.values()) clock.clearTimeout(timer); timers.clear(); }
  function failed(e) { logger.warn('[workspace] operation_failed'); status(e.message, true); }
  async function save(action, redraw = true) {
    // Snapshot at dispatch: queued commands cannot be changed by the caller.
    const command = structuredClone(action);
    return writes.run(async () => {
      try {
        await model.execute(command);
        if (command.type === 'page.rename' || typeof command.text === 'string' || (command.type === 'task.update' && typeof command.title === 'string')) drafts.acknowledge(command);
        status(drafts.all().length ? 'Salvataggio parziale: bozze ancora presenti' : 'Salvato su questo browser');
        if (redraw) render();
        return true;
      } catch (e) { failed(e); return false; }
    });
  }
  function stage(action, composing = false) {
    const key = draftKey(action);
    clock.clearTimeout(timers.get(key)); timers.delete(key);
    try { drafts.put(action); }
    catch { status('Bozza non conservata: esporta o copia il testo prima di uscire.', true); return; }
    status('Modifica in bozza · salvataggio in attesa');
    if (!composing) {
      const command = structuredClone(action);
      timers.set(key, clock.setTimeout(() => { timers.delete(key); void save(command, false); }, 600));
    }
  }
  function flush(action) {
    const key = draftKey(action);
    clock.clearTimeout(timers.get(key)); timers.delete(key);
    try { drafts.put(action); } catch { status('Bozza non conservata; salvataggio diretto in corso.', true); }
    return save(action, false);
  }
  function exportData() { ui.download(model.export(), 'codexvinci-backup.json'); status('Backup esportato'); }
  return {
    render, status, save, stage, flush, exportData,
    idle: () => writes.idle(),
    hasPending: () => Boolean(writes.pending || drafts.all().length),
    draft: action => drafts.get(action),
    newId: () => model.newId(),
    selectPage(pageId) { selected = pageId; query = ''; render(); },
    selectView(value) { if (!['document', 'table', 'board'].includes(value)) throw new Error('Vista non valida.'); view = value; render(); },
    search(value) { query = value; render(); },
    addPage(parentId = null) {
      const title = ui.prompt('Titolo della pagina');
      if (title?.trim()) return save({type: 'page.add', id: model.newId(), title: title.trim(), parentId});
    },
    deleteBlock(pageId, id) {
      if (ui.confirm('Eliminare questo blocco?')) return save({type: 'block.delete', pageId, id});
    },
    async recoverDrafts() {
      if (!drafts.all().length) { status('Nessuna bozza da recuperare'); return; }
      if (!ui.confirm('Applicare le bozze di questa scheda ai dati caricati? Esporta prima un backup in caso di conflitti.')) return;
      cancelTimers();
      for (const action of drafts.all()) if (!await save(action, false)) return;
      render();
    },
    discardDrafts() {
      if (!ui.confirm('Eliminare le bozze non salvate di questa scheda?')) return;
      if (writes.pending) { status('Attendi la fine dei salvataggi prima di eliminare le bozze.', true); return; }
      try { cancelTimers(); drafts.clear(); status('Bozze eliminate'); render(); } catch (e) { failed(e); }
    },
    exportDrafts() { ui.download(JSON.stringify(drafts.all(), null, 2), 'codexvinci-bozze.json'); },
    async importData(file) {
      if (!file) return;
      try {
        if (writes.pending || drafts.all().length) throw new Error('Salva o elimina le bozze prima di importare un archivio.');
        if (file.size > MAX_BYTES) throw new Error('File troppo grande (massimo 2 MB).');
        const raw = await file.text();
        model.validateArchive(raw);
        if (writes.pending || drafts.all().length) throw new Error('Modifiche in corso: completa il salvataggio prima dell’import.');
        if (!ui.confirm('Sostituire l’archivio locale? Verrà scaricato prima un backup dei dati attuali.')) return;
        await writes.run(async () => {
          if (drafts.all().length) throw new Error('Nuove bozze presenti: import annullato.');
          exportData();
          await model.replace(raw);
          selected = model.snapshot().pages[0].id;
          status('Archivio importato'); render();
        });
      } catch (e) { failed(e); }
    },
  };
}
