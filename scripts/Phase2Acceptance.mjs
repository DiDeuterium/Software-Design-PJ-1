import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const evidence = join(root, 'doc/phase2/acceptance/evidence'); mkdirSync(evidence, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineDirectory = join(root, 'doc/phase2/baseline');
const baseline = JSON.parse(readFileSync(join(baselineDirectory, 'manifest.json'), 'utf8'));
assert.equal(git('rev-parse', 'final^{}'), baseline.final);
const temporary = mkdtempSync(join(root, '.step8-run-'));
const results = [];
try {
  const emptyConfig = join(temporary, 'empty.json'); writeFileSync(emptyConfig, '{"plugins":[]}');
  const boxConfig = join(temporary, 'box.json');
  writeFileSync(boxConfig, JSON.stringify({ plugins: [{ module: join(root, '.step8-box-config/dist/plugins/shape-box') }] }));
  const scenarios = [
    ...baseline.scenarios.map(item => ({ name: `builtin-${item.name}`, input: join(baselineDirectory, `${item.name}.txt`), expected: item.exitCode, baseline: item.name, profile: 'builtin' })),
    ...['cli-1', 'flowchart-a'].map(name => ({ name: `full-${name}`, input: join(baselineDirectory, `${name}.txt`), expected: name === 'cli-1' ? 1 : 0, profile: 'full' })),
    ...['flowchart-box', 'commands', 'labels-history'].map(name => ({ name: `full-${name}`, input: join(root, `doc/transcript/${name}.txt`), expected: 0, profile: 'full' })),
    { name: 'historical-box-A-B', input: join(root, 'doc/transcript/flowchart-box.txt'), expected: 0, profile: 'historical' },
  ];
  for (const scenario of scenarios) {
    const directory = join(evidence, scenario.name); mkdirSync(directory, { recursive: true });
    const input = readFileSync(scenario.input); writeFileSync(join(directory, 'input.txt'), input);
    const cwd = join(temporary, scenario.name);
    const run = side => {
      // Same absolute cwd and initial contents for both runs; logs live elsewhere.
      if (existsSync(cwd)) {
        assert.equal(dirname(cwd), temporary); rmSync(cwd, { recursive: true, force: true });
      }
      mkdirSync(cwd); mkdirSync(join(cwd, 'docs')); mkdirSync(join(cwd, 'plugins'));
      writeFileSync(join(cwd, '.hidden'), 'fixed\n'); copyFileSync(join(baselineDirectory, 'other.svg'), join(cwd, 'other.svg'));
      let entry = side === 'a' ? join(root, 'scripts/acceptance/CodeAssembly.mjs') : join(root, 'dist/bootstrap/main.js');
      let args = side === 'a' ? scenario.profile === 'builtin' ? ['--builtins-only'] : [] :
        ['--config', scenario.profile === 'builtin' ? emptyConfig : join(root, 'plugins.config.json')];
      if (scenario.profile === 'historical') {
        entry = join(root, side === 'a' ? '.step8-box-code' : '.step8-box-config', 'dist/bootstrap/main.js');
        args = side === 'a' ? [] : ['--config', boxConfig];
      }
      const output = spawnSync(process.execPath, [entry, ...args], { cwd, input, timeout: 20000 });
      assert.equal(output.error, undefined); assert.equal(output.signal, null); assert.equal(output.status, scenario.expected, `${scenario.name}/${side}: exit`);
      writeFileSync(join(directory, `${side}.stdout.txt`), output.stdout); writeFileSync(join(directory, `${side}.stderr.txt`), output.stderr);
      assert.equal(output.stderr.length, 0, `${scenario.name}/${side}: unexpected stderr`);
      const artifacts = readdirSync(cwd).filter(name => name.endsWith('.svg') && name !== 'other.svg').sort();
      for (const name of artifacts) copyFileSync(join(cwd, name), join(directory, `${side}.${name}`));
      if (scenario.name === 'full-commands') {
        assert.deepEqual(readdirSync(cwd).sort(), ['.hidden', 'docs', 'other.svg', 'plugins']);
        assert.ok(output.stdout.includes(Buffer.from('[DIR]  docs\n[DIR]  plugins\n[FILE]  .hidden\n[FILE]  other.svg')));
        assert.ok(output.stdout.includes(Buffer.from('rect: 1  circle: 1  text: 1  (total 3, containers 1)')));
      }
      return { ...output, artifacts };
    };
    const a = run('a'); const b = run('b');
    assert.ok(a.stdout.equals(b.stdout), `${scenario.name}: stdout differs`); assert.ok(a.stderr.equals(b.stderr));
    assert.deepEqual(a.artifacts, b.artifacts);
    const artifacts = a.artifacts.map(name => {
      const bytes = readFileSync(join(directory, `a.${name}`)); assert.ok(bytes.equals(readFileSync(join(directory, `b.${name}`))));
      if (scenario.baseline) assert.ok(bytes.equals(readFileSync(join(baselineDirectory, `${scenario.baseline}.${name}`))));
      return { name, sha256: hash(bytes) };
    });
    if (scenario.baseline) for (const stream of ['stdout', 'stderr']) {
      assert.ok(a[stream].equals(readFileSync(join(baselineDirectory, `${scenario.baseline}.${stream}.txt`))), `${scenario.name}: final ${stream} differs`);
    }
    if (scenario.name.includes('flowchart-box') || scenario.profile === 'historical') {
      assert.ok(a.stdout.includes(Buffer.from('saved to flowchart-box.svg (8 elements)')));
      assert.ok(a.stdout.includes(Buffer.from('box#n2 label restored: "处理数据"')));
    }
    results.push({ name: scenario.name, profile: scenario.profile, exitCode: a.status, inputSha256: hash(input), stdoutSha256: hash(a.stdout), stderrSha256: hash(a.stderr), artifacts });
  }
  writeFileSync(join(evidence, 'manifest.json'), JSON.stringify({ codeRevision: git('rev-parse', 'HEAD'), final: baseline.final,
    historicalA: git('rev-parse', 'demo/phase2-box-code'), historicalB: git('rev-parse', 'c2a83b6'),
    plugins: ['stats', 'dir', 'box', 'modified-star'], options: null, comparison: 'raw Buffers; identical cwd and initial files; output outside cwd', scenarios: results }, null, 2) + '\n');
  console.log(`Phase 2 acceptance passed: ${results.length} A/B scenario pairs, raw output/exit/SVG verified.`);
} finally {
  assert.equal(dirname(temporary), root); assert.ok(basename(temporary).startsWith('.step8-run-'));
  rmSync(temporary, { recursive: true, force: true });
}
