import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

class Phase1Baseline {
  private readonly root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  private readonly directory = join(this.root, 'doc/phase2/baseline');
  private git(...args: string[]): Buffer {
    return execFileSync('git', args, { cwd: this.root, stdio: ['ignore', 'pipe', 'pipe'] });
  }

  public run(): void {
    const mode = process.argv[2];
    assert.ok(mode === 'record' || mode === 'check', 'Usage: tsx scripts/Phase1Baseline.ts record|check [--entry <compiled-entry>] [-- <CLI args>]');
    const hash = this.git('rev-parse', 'final^{}').toString().trim();
    const manifestPath = join(this.directory, 'manifest.json');
    if (mode === 'record') {
      assert.equal(existsSync(manifestPath), false, 'Baseline exists; recording over it is forbidden');
      const files = this.git('ls-tree', '-r', '--name-only', 'final', '--', 'src', 'package.json', 'package-lock.json',
        'tsconfig.json', 'tsconfig.build.json').toString().trim().split('\n');
      for (const file of files) assert.ok(this.git('show', 'final:' + file).equals(readFileSync(join(this.root, file))), 'Not final source: ' + file);
      assert.equal(this.git('ls-files', '--others', '--exclude-standard', '--', 'src').toString().trim(), '');
      execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'],
        { cwd: this.root, stdio: 'inherit', shell: process.platform === 'win32' });
      mkdirSync(this.directory, { recursive: true });
      copyFileSync(join(this.root, 'doc/architecture.puml'), join(this.directory, 'before.puml'));
      const scenarios = [
        { name: 'cli-1', input: readFileSync(join(this.root, 'doc/acceptance/session.cli'), 'utf8') },
        { name: 'flowchart-a', input: readFileSync(join(this.root, 'doc/acceptance/flowchart.cli'), 'utf8') },
        { name: 'help', input: 'help\n' },
        { name: 'empty', input: '\n# baseline comment\n' },
        { name: 'no-document', input: 'tree\nshow missing\nundo\nredo\ncanvas\ncreate g g\nunknown\nhelp\n' },
        { name: 'shapes-history', input: [
          'init 400 300', 'create g g', 'create rect r 1 2 30 40 #abcdef in g',
          'create circle c 4 5 6 red in g', 'create ellipse e 7 8 9 10',
          'create line l 1 2 3 4 black', 'create text t 5 6 "中文 空格"',
          'create text empty 0 0 ""', 'tree', 'tree g', 'show r', 'show c', 'show e',
          'show l', 'show t', 'show g', 'canvas', 'set t text "新文本"',
          'undo', 'help', 'tree', 'redo', 'move g 2 3', 'scale g 2',
          'front r', 'back r', 'group pair e l', 'addto g pair', 'ungroup pair',
          'delete c', 'undo', 'redo', 'tree', 'save shapes.svg', 'undo', 'tree',
        ].join('\n') + '\n' },
      ];
      for (const item of scenarios) writeFileSync(join(this.directory, item.name + '.txt'), item.input);
      copyFileSync(join(this.root, 'examples/other.svg'), join(this.directory, 'other.svg'));
      const results = scenarios.map(item => this.execute(item.name, true));
      writeFileSync(manifestPath, JSON.stringify({ final: hash, node: process.version, scenarios: results }, null, 2) + '\n');
    } else {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      assert.equal(hash, manifest.final, 'final tag moved');
      for (const item of manifest.scenarios) {
        const result = this.execute(item.name, false);
        assert.equal(result.exitCode, item.exitCode, item.name + ': exit code mismatch');
      }
    }
    console.log('Phase 1 raw-byte baseline ' + mode + ': passed');
  }

  private execute(name: string, record: boolean): { name: string; exitCode: number | null; sha256: string } {
    const temporary = mkdtempSync(join(tmpdir(), 'pj1-baseline-'));
    try {
      copyFileSync(join(this.directory, 'other.svg'), join(temporary, 'other.svg'));
      const entryFlag = process.argv.indexOf('--entry');
      const entry = entryFlag < 0 ? join(this.root, 'dist/bootstrap/main.js') : resolve(process.argv[entryFlag + 1]!);
      const separator = process.argv.indexOf('--');
      const args = separator < 0 ? [] : process.argv.slice(separator + 1);
      const result = spawnSync(process.execPath, [entry, ...args], {
        cwd: temporary, input: readFileSync(join(this.directory, name + '.txt')), timeout: 15000,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.notEqual(result.status, null);
      const outputs: [string, Buffer][] = [['stdout', result.stdout], ['stderr', result.stderr]];
      for (const [suffix, bytes] of outputs) {
        const path = join(this.directory, name + '.' + suffix + '.txt');
        if (record) writeFileSync(path, bytes);
        else assert.ok(bytes.equals(readFileSync(path)), name + ': ' + suffix + ' bytes differ');
      }
      for (const artifact of ['demo.svg', 'flowchart.svg', 'shapes.svg']) {
        const expected = join(this.directory, name + '.' + artifact);
        const actual = join(temporary, artifact);
        if (record && existsSync(actual)) writeFileSync(expected, readFileSync(actual));
        if (!record && existsSync(expected)) {
          assert.ok(existsSync(actual), name + ': missing ' + artifact);
          assert.ok(readFileSync(actual).equals(readFileSync(expected)), name + ': SVG bytes differ');
        }
      }
      return { name, exitCode: result.status, sha256: createHash('sha256').update(result.stdout).digest('hex') };
    } finally {
      assert.equal(dirname(resolve(temporary)), resolve(tmpdir()));
      assert.ok(basename(temporary).startsWith('pj1-baseline-'));
      rmSync(temporary, { recursive: true, force: true });
    }
  }
}

new Phase1Baseline().run();
