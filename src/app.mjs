// Composition root: only this module wires browser capabilities to MVC.
import {createWorkspace} from './model/workspace.mjs';
import {createWorkspaceController} from './controllers/workspace-controller.mjs';
import {createDrafts, DRAFT_KEY} from './controllers/editing.mjs';
import {createLocalRepository, KEY} from './infrastructure/local-storage.mjs';
import {createWorkspaceView} from './views/workspace-view.mjs';
import {el, button} from './views/dom.mjs';

const root = document.querySelector('#app');
function download(raw, name) {
  const url = URL.createObjectURL(new Blob([raw], {type: 'application/json'}));
  el('a', {href: url, download: name}).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
try {
  const model = await createWorkspace(createLocalRepository(localStorage, navigator.locks));
  const drafts = createDrafts(sessionStorage);
  let view;
  const controller = createWorkspaceController({model, drafts, ui: {
    render: snapshot => view.render(snapshot), status: (...args) => view.status(...args),
    confirm: message => window.confirm(message), prompt: message => window.prompt(message), download,
  }});
  view = createWorkspaceView(root, controller);
  controller.render();
  window.addEventListener('beforeunload', e => {
    if (controller.hasPending()) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('storage', e => {
    if (e.key === KEY) controller.status('Modifica da un’altra scheda: ricarica per continuare.', true);
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')
    .catch(() => controller.status('Cache offline non disponibile; mantieni il server avviato.', true));
} catch {
  console.error('[workspace] load_failed');
  root.replaceChildren(el('main', {}, el('h1', {text: 'Archivio non leggibile'}),
    el('p', {text: 'I dati non sono stati modificati. Conserva una copia prima di intervenire.'}),
    button('Scarica archivio originale', () => download(localStorage.getItem(KEY) ?? '', 'archivio-da-recuperare.json')),
    button('Scarica bozze originali', () => download(sessionStorage.getItem(DRAFT_KEY) ?? '', 'bozze-da-recuperare.json'))));
}
