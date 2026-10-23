import {seed, validate, parseArchive} from '../model/domain.mjs';
import {cleanAction, draftKey} from '../model/draft-command.mjs';
import {KEY} from './local-storage.mjs';

export const DATABASE = 'codexvinci';
export const INITIALIZED = 'codexvinci-idb-initialized';
const WORKSPACE = 'workspace';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Resolve on transaction complete, never merely on request success. */
function transact(db, stores, mode, work) {
  return new Promise((resolve, reject) => {
    let result, failure;
    const tx = db.transaction(stores, mode);
    const fail = error => { failure = error; try { tx.abort(); } catch { /* already aborted */ } };
    const read = (request, next) => {
      request.onsuccess = () => { try { next(request.result); } catch (error) { fail(error); } };
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('Transazione annullata.'));
    tx.onerror = () => {}; // request errors abort; onabort is the single rejection path.
    try { work(tx, read, value => { result = value; }); } catch (error) { fail(error); }
  });
}
export async function openDatabase(factory, name = DATABASE) {
  if (!factory) throw new Error('IndexedDB non disponibile: nessuna scrittura eseguita.');
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('meta');
      db.createObjectStore('drafts', {keyPath: ['sessionId', 'key']});
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Aggiornamento archivio bloccato: chiudi le altre schede.')); };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

/** Each page instance receives a fresh session ID, including cloned tabs/reloads. */
export function createIndexedRepository(db, sessionId) {
  return {
    async initialize(legacyStorage) {
      // Read source only when this adapter opens; source is never overwritten.
      const raw = legacyStorage.getItem(KEY);
      const initialized = legacyStorage.getItem(INITIALIZED);
      const state = await transact(db, ['meta'], 'readwrite', (tx, read, done) => {
        const meta = tx.objectStore('meta');
        read(meta.get(WORKSPACE), current => {
          if (current !== undefined) {
            read(meta.get('legacy-source'), source => {
              if (source !== raw) throw new Error('Archivio precedente modificato: esporta le due versioni prima di continuare.');
              done(validate(current));
            });
            return;
          }
          read(meta.get('initialized'), marker => {
            if (marker || initialized) throw new Error('Archivio IndexedDB rimosso o incompleto: ripristina un backup; la sorgente precedente non viene riattivata automaticamente.');
            const initial = raw === null ? seed() : parseArchive(raw);
            meta.put(initial, WORKSPACE);
            meta.put(raw, 'legacy-source');
            meta.put(true, 'initialized');
            done(initial);
          });
        });
      });
      // Failure to write the sentinel is surfaced, without falling back to v1.
      legacyStorage.setItem(INITIALIZED, '1');
      return state;
    },
    load() {
      return transact(db, ['meta'], 'readonly', (tx, read, done) => {
        read(tx.objectStore('meta').get(WORKSPACE), state => done(validate(state)));
      });
    },
    save(next, expectedRevision, action) {
      const clean = validate(next);
      if (clean.revision !== expectedRevision + 1) return Promise.reject(new Error('Sequenza revisioni non valida.'));
      return transact(db, ['meta', 'drafts'], 'readwrite', (tx, read, done) => {
        const meta = tx.objectStore('meta');
        read(meta.get(WORKSPACE), current => {
          if (!current || validate(current).revision !== expectedRevision) throw new Error('Archivio modificato da un’altra scheda. Ricarica prima di salvare.');
          meta.put(clean, WORKSPACE);
          // ACK in the same transaction as the document, with exact-payload match.
          if (action && (action.type === 'page.rename' || typeof action.text === 'string' || (action.type === 'task.update' && typeof action.title === 'string'))) {
            const command = cleanAction(action), key = [sessionId, draftKey(command)];
            const drafts = tx.objectStore('drafts');
            read(drafts.get(key), row => { if (row && same(row.action, command)) drafts.delete(key); });
          }
          done(clean);
        });
      });
    },
  };
}

export function createDraftRepository(db, sessionId) {
  function cleanRow(row) {
    if (!row || typeof row.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.sessionId)) throw new Error('Sessione bozza non valida.');
    const action = cleanAction(row.action);
    if (row.key !== draftKey(action)) throw new Error('Identità bozza non valida.');
    return {...row, action};
  }
  return {
    list() {
      return transact(db, ['drafts'], 'readonly', (tx, read, done) => {
        read(tx.objectStore('drafts').getAll(), rows => done(rows.map(cleanRow)));
      });
    },
    put(action) {
      const command = cleanAction(action);
      return transact(db, ['drafts'], 'readwrite', (tx, read) => {
        const store = tx.objectStore('drafts');
        read(store.getAll(), rows => {
          const next = rows.filter(r => !(r.sessionId === sessionId && r.key === draftKey(command)));
          next.push({sessionId, key: draftKey(command), action: command, updatedAt: Date.now()});
          if (next.length > 1000 || new TextEncoder().encode(JSON.stringify(next)).length > 2_000_000) throw new Error('Limite bozze raggiunto: esporta e rimuovi le bozze obsolete.');
          store.put(next.at(-1));
        });
      });
    },
    removeExact(row) {
      const clean = cleanRow(row);
      return transact(db, ['drafts'], 'readwrite', (tx, read) => {
        const store = tx.objectStore('drafts'), key = [clean.sessionId, clean.key];
        read(store.get(key), current => { if (current && same(current.action, clean.action)) store.delete(key); });
      });
    },
    clearOwn() {
      return transact(db, ['drafts'], 'readwrite', (tx, read) => {
        const store = tx.objectStore('drafts');
        read(store.getAll(), rows => { for (const row of rows) if (row.sessionId === sessionId) store.delete([row.sessionId, row.key]); });
      });
    },
    async importLegacy(actions, fingerprint) {
      const clean = actions.map(cleanAction);
      return transact(db, ['meta', 'drafts'], 'readwrite', (tx, read) => {
        const meta = tx.objectStore('meta');
        read(meta.get('legacy-drafts-' + fingerprint), imported => {
          if (imported) return;
          const drafts = tx.objectStore('drafts');
          read(drafts.getAll(), rows => {
            const newRows = clean.map(action => ({sessionId: 'legacy-' + fingerprint.slice(0,32), key: draftKey(action), action, updatedAt: Date.now()}));
            if (rows.length + newRows.length > 1000 || new TextEncoder().encode(JSON.stringify([...rows,...newRows])).length > 2_000_000) throw new Error('Limite bozze raggiunto durante migrazione.');
            for (const row of newRows) drafts.put(row);
            meta.put(true, 'legacy-drafts-' + fingerprint);
          });
        });
      });
    },
  };
}

/** Raw recovery export deliberately bypasses validation of damaged records. */
export function exportDatabase(db) {
  return transact(db, ['meta', 'drafts'], 'readonly', (tx, read, done) => {
    const result = {format: 'codexvinci-recovery-v1', meta: [], drafts: []};
    const meta = tx.objectStore('meta');
    read(meta.getAllKeys(), keys => {
      read(meta.getAll(), values => { result.meta = keys.map((key, i) => ({key, value: values[i]})); });
    });
    read(tx.objectStore('drafts').getAll(), rows => { result.drafts = rows; });
    done(result);
  });
}
