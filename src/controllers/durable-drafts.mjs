import {createQueue, cleanAction, draftKey} from './editing.mjs';

/** Synchronous UI buffer, asynchronous durable adapter. Failed writes keep text
 * in memory, surface an error, and are retried by ready() before any commit. */
export function createDurableDrafts(repository, sessionId) {
  const values = new Map(), dirty = new Set(), queue = createQueue();
  let failure;
  function persist(key, command) {
    return queue.run(async () => {
      try {
        await repository.put(command);
        if (JSON.stringify(values.get(key)) === JSON.stringify(command)) dirty.delete(key);
        if (!dirty.size) failure = undefined;
      } catch (error) { failure = error; throw error; }
    });
  }
  return {
    all: () => structuredClone([...values.values()]),
    get: action => structuredClone(values.get(draftKey(action))),
    get pending() { return queue.pending; },
    put(action) {
      const command = cleanAction(action), key = draftKey(command);
      values.set(key, command); dirty.add(key);
      // This rejection is inspected by settled()/ready(); never unhandled.
      void persist(key, command).catch(() => {});
    },
    async settled() { await queue.idle(); if (failure) throw failure; },
    async ready() {
      await queue.idle();
      for (const key of [...dirty]) if (values.has(key)) await persist(key, structuredClone(values.get(key)));
      if (failure) throw failure;
    },
    async acknowledge(action) {
      const command = cleanAction(action), key = draftKey(command);
      await queue.run(async () => {
        await repository.removeExact({sessionId, key, action: command});
        if (JSON.stringify(values.get(key)) === JSON.stringify(command)) { values.delete(key); dirty.delete(key); }
        if (!dirty.size) failure = undefined;
      });
    },
    async clear() {
      // Remove only the captured values. Inputs arriving during clear survive.
      const captured = structuredClone([...values.values()]);
      await queue.run(async () => {
        for (const action of captured) {
          const key = draftKey(action);
          await repository.removeExact({sessionId, key, action});
          if (JSON.stringify(values.get(key)) === JSON.stringify(action)) { values.delete(key); dirty.delete(key); }
        }
        if (!dirty.size) failure = undefined;
      });
    },
  };
}
