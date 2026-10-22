import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function files(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))).flat();
}
for (const file of ['server.mjs', 'sw.js', ...await files('src'), ...await files('tests'), ...await files('scripts')]) {
  if (!/\.(mjs|cjs|js)$/.test(file)) continue;
  const result = spawnSync(process.execPath, ['--check', file], {stdio: 'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.info('Syntax checks passed.');
