import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checkout = resolve(process.argv[2]);
const evidence = join(root, 'doc/phase2/final-checkout'); mkdirSync(evidence, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: checkout, encoding: 'utf8' }).trim();
assert.equal(git('status', '--porcelain'), '');
const input = 'help\ndir\ninit\ncreate box n 120 100 160 60 "开始"\nset n label "最终验证"\nset n fill #f5a623\nmove n 10 20\nundo\nredo\nstats\ntree\nsave final.svg\nread final.svg\nstats\ntree\n';
writeFileSync(join(evidence, 'input.txt'), input);
const workspace = mkdtempSync(join(checkout, '.final-run-'));
const results = [];
try {
  for (const mode of ['source', 'compiled']) {
    const args = mode === 'source' ? ['--import', 'tsx', join(checkout, 'src/bootstrap/main.ts')] : [join(checkout, 'dist/bootstrap/main.js')];
    const output = spawnSync(process.execPath, [...args, '--config', join(checkout, 'plugins.config.json')], { cwd: workspace, input, timeout: 20000 });
    assert.equal(output.error, undefined); assert.equal(output.status, 0); assert.equal(output.stderr.length, 0);
    assert.ok(output.stdout.includes(Buffer.from('rect: 1  text: 1  (total 2, containers 1)')));
    assert.ok(output.stdout.includes(Buffer.from('g#n (box)')));
    writeFileSync(join(evidence, `${mode}.stdout.txt`), output.stdout);
    writeFileSync(join(evidence, `${mode}.stderr.txt`), output.stderr);
    const svg = readFileSync(join(workspace, 'final.svg')); assert.ok(svg.includes(Buffer.from('data-kind="box"')));
    writeFileSync(join(evidence, `${mode}.svg`), svg);
    results.push({ mode, output: output.stdout, svg });
    // Restore exactly the same empty cwd for the second invocation.
    assert.equal(dirname(workspace), checkout); assert.ok(basename(workspace).startsWith('.final-run-'));
    rmSync(workspace, { recursive: true, force: true }); mkdirSync(workspace);
  }
  assert.ok(results[0].output.equals(results[1].output)); assert.ok(results[0].svg.equals(results[1].svg));
} finally {
  assert.equal(dirname(workspace), checkout); assert.ok(basename(workspace).startsWith('.final-run-'));
  rmSync(workspace, { recursive: true, force: true });
}
assert.equal(git('status', '--porcelain'), '');
execFileSync('git', ['bundle', 'verify', 'doc/phase2/acceptance/diffs/box-code-demo.bundle'], { cwd: checkout, stdio: 'pipe' });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
writeFileSync(join(evidence, 'manifest.json'), JSON.stringify({ revision: git('rev-parse', 'HEAD'), node: process.version,
  cleanBeforeAndAfter: true, sourceCompiledEqual: true, bundleVerified: true,
  inputSha256: sha256(Buffer.from(input)), stdoutSha256: sha256(results[0].output), svgSha256: sha256(results[0].svg) }, null, 2) + '\n');
console.log('Clean checkout passed: source/compiled output and SVG equal, bundle valid, working tree clean.');
