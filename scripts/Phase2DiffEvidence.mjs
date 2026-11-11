import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'doc/phase2/acceptance/diffs'); mkdirSync(output, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const records = [];
for (const [label, ref, newPlugins, assembly] of [
  ['commands-B', '969ca05', ['command-stats', 'command-dir'], undefined],
  ['box-B', 'c2a83b6', ['shape-box'], undefined],
  ['star-B', '4e8e80d', ['tree-star'], undefined],
  ['box-A', 'demo/phase2-box-code', ['shape-box'], 'src/host/Runtime.ts'],
]) {
  const commit = git('rev-parse', ref).trim(); const parent = git('rev-parse', `${commit}^`).trim();
  const existingPlugins = git('ls-tree', '-d', '--name-only', `${parent}:src/plugins`).trim().split('\n').filter(Boolean).map(name => `src/plugins/${name}`);
  const protectedPaths = ['src/core', 'src/host', 'src/bootstrap', ...existingPlugins];
  // Assert actual tree entries, rather than treating a nonexistent path's empty diff as proof.
  for (const path of protectedPaths) assert.ok(git('ls-tree', '-d', parent, '--', path).trim(), `${parent}: missing ${path}`);
  for (const path of newPlugins.map(name => `src/plugins/${name}`)) assert.ok(git('ls-tree', '-d', commit, '--', path).trim());
  const unchanged = git('diff', parent, commit, '--', ...protectedPaths, ...(assembly ? [`:(exclude)${assembly}`] : []));
  assert.equal(unchanged, '', `${label}: protected code changed`);
  const names = git('diff', '--name-status', parent, commit);
  const sourceNames = git('diff', '--name-only', parent, commit, '--', 'src').trim().split('\n').filter(Boolean);
  assert.ok(sourceNames.every(path => path === assembly || newPlugins.some(name => path.startsWith(`src/plugins/${name}/`))));
  if (assembly) assert.deepEqual(sourceNames.filter(path => !newPlugins.some(name => path.startsWith(`src/plugins/${name}/`))), [assembly]);
  writeFileSync(join(output, `${label}.names.txt`), names); writeFileSync(join(output, `${label}.protected.diff`), unchanged);
  writeFileSync(join(output, `${label}.patch`), git('diff', '--binary', parent, commit));
  records.push({ label, commit, parent, newPlugins, permittedAssemblyFile: assembly ?? null, protectedPaths, protectedDiffBytes: Buffer.byteLength(unchanged) });
}
const sameBox = git('diff', 'demo/phase2-box-code', 'c2a83b6', '--', 'src/plugins/shape-box'); assert.equal(sameBox, '');
writeFileSync(join(output, 'box-implementation-A-B.diff'), sameBox);
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ records, boxImplementationIdentical: true,
  note: 'commands-B includes a generic build-manifest copy script and package build metadata; no runtime host/core/previous plugin changes' }, null, 2) + '\n');
console.log('Diff evidence passed: 4 integration commits, existing paths verified, identical A/B box package.');
