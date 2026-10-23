// Composition root: only this module wires browser capabilities to MVC.
import {createWorkspace} from './model/workspace.mjs';
import {createWorkspaceController} from './controllers/workspace-controller.mjs';
import {createDrafts, DRAFT_KEY} from './controllers/editing.mjs';
import {KEY} from './infrastructure/local-storage.mjs';
import {openDatabase, createIndexedRepository, createDraftRepository, exportDatabase} from './infrastructure/indexed-db.mjs';
import {createDurableDrafts} from './controllers/durable-drafts.mjs';
import {holdSession, withInactiveSession} from './infrastructure/session-lock.mjs';
import {createWorkspaceView} from './views/workspace-view.mjs';
import {el, button} from './views/dom.mjs';

const root = document.querySelector('#app');
function download(raw, name) {
  const url = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
  el('a', {href: url, download: name}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
try {
  const sessionId = crypto.randomUUID();
  const db = await openDatabase(indexedDB);
  const repository = createIndexedRepository(db, sessionId);
  await repository.initialize(localStorage);
  const draftRepository = createDraftRepository(db, sessionId);
  const legacy = createDrafts(sessionStorage).all();
  if (legacy.length) {
    const bytes = new TextEncoder().encode(JSON.stringify(legacy));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const fingerprint = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
    await draftRepository.importLegacy(legacy, fingerprint);
  }
  const release = await holdSession(navigator.locks, sessionId);
  window.addEventListener('pagehide', () => { release?.(); db.close(); });
  window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  const model = await createWorkspace(repository);
  const drafts = createDurableDrafts(draftRepository, sessionId);
  const recovery = {
    list: async () => (await draftRepository.list()).filter(row => row.sessionId !== sessionId),
    withSession: (id, work) => withInactiveSession(navigator.locks, id, work),
    removeExact: row => draftRepository.removeExact(row),
  };
  let view;
  const controller = createWorkspaceController({model, drafts, recovery, ui: {
    render: snapshot => view.render(snapshot), status: (...args) => view.status(...args),
    confirm: message => window.confirm(message), prompt: message => window.prompt(message), download,
  }});
  view = createWorkspaceView(root, controller);
  controller.render();
  if ((await recovery.list()).length) controller.status('Bozze di altre sessioni disponibili: usa Recupera altre sessioni o Esporta bozze.');
  window.addEventListener('beforeunload', e => {
    if (controller.hasPending()) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('storage', e => {
    if (e.key === KEY) controller.status('Modifica da un’altra scheda: ricarica per continuare.', true);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')
    .catch(() => controller.status('Cache offline non disponibile; mantieni il server avviato.', true));
} catch (error) {
  console.error('[workspace] load_failed');
  root.replaceChildren(el('main', {}, el('h1', {text: 'Archivio non leggibile'}),
    el('p', {text: error.message || 'Apertura archivio fallita. Nessun ripristino automatico: conserva i dati prima di intervenire.'}),
    button('Esporta recupero IndexedDB', async () => {
      let recoveryDb;
      try {
        recoveryDb = await openDatabase(indexedDB);
        download(JSON.stringify(await exportDatabase(recoveryDb), null, 2), 'codexvinci-recupero-indexeddb.json');
      } catch { root.append(el('p', {text: 'Export IndexedDB non disponibile: conserva il profilo browser per il recupero.'})); }
      finally { recoveryDb?.close(); }
    }),
    button('Scarica archivio originale', () => download(localStorage.getItem(KEY) ?? '', 'archivio-da-recuperare.json')),
    button('Scarica bozze originali', () => download(sessionStorage.getItem(DRAFT_KEY) ?? '', 'bozze-da-recuperare.json'))));
}
