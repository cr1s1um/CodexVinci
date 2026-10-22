import {transition, parseArchive, tasksFor, STATUSES, id} from './domain.mjs';

/** Model: repository.load()/save(next, expectedRevision) may be asynchronous.
 * Publish new state only after successful persistence; callers serialize writes.
 */
export async function createWorkspace(repository) {
  let state = await repository.load();
  return {
    snapshot: () => structuredClone(state),
    tasks: (pageId, query) => structuredClone(tasksFor(state, pageId, query)),
    statuses: () => [...STATUSES],
    newId: id,
    async execute(action) {
      const next = transition(state, action);
      state = await repository.save(next, state.revision);
    },
    async replace(raw) {
      const imported = parseArchive(raw);
      state = await repository.save({...imported, revision: state.revision + 1}, state.revision);
    },
    validateArchive: parseArchive,
    export: () => JSON.stringify(state, null, 2),
  };
}
