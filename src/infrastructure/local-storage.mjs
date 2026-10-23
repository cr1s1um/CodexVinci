import {seed, parseArchive, validate} from '../model/domain.mjs';
export const KEY='codexvinci-v1';
export function load(storage) {
  const raw=storage.getItem(KEY);
  return raw === null ? seed() : parseArchive(raw);
}
// Chiamare sotto Web Lock: controllo revisione e commit nello stesso lock.
export function commit(storage, next, expectedRevision) {
  const current=storage.getItem(KEY);
  if(current === null && expectedRevision !== 0)
    throw new Error('Archivio locale rimosso: esporta la sessione prima di ricaricare.');
  if(current !== null && parseArchive(current).revision !== expectedRevision)
    throw new Error('Archivio modificato da un’altra scheda. Ricarica prima di salvare.');
  const clean=validate(next);
  storage.setItem(KEY,JSON.stringify(clean)); // può fallire per quota o policy del browser
  return clean;
}

/** Browser capabilities are injected; no ambient browser globals. */
export function createLocalRepository(storage, locks) {
  return {
    load: () => load(storage),
    async save(next, revision) {
      if (!locks) throw new Error('Browser privo di Web Locks: modifiche disabilitate per proteggere l’archivio.');
      return locks.request(KEY, () => commit(storage, next, revision));
    },
  };
}
