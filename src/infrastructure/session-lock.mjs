const prefix = 'codexvinci-session-';
/** A lease identifies active pages without heartbeat or wall-clock assumptions. */
export async function holdSession(locks, sessionId) {
  if (!locks) return null;
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  await new Promise((resolve, reject) => {
    locks.request(prefix + sessionId, async () => { resolve(); await hold; }).catch(reject);
  });
  return release;
}
export async function withInactiveSession(locks, sessionId, work) {
  if (!locks) throw new Error('Recupero tra sessioni richiede Web Locks. Esporta le bozze per recupero manuale.');
  return locks.request(prefix + sessionId, {ifAvailable: true}, async lock => {
    if (!lock) return false;
    await work(); return true;
  });
}
