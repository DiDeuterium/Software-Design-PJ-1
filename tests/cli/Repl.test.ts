import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { Repl } from '../../src/cli/Repl.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { CommandResult } from '../../src/application/commands/CommandResult.js';
import { TreeFormatter } from '../../src/presentation/TreeFormatter.js';
import { ShowFormatter } from '../../src/presentation/ShowFormatter.js';
import { HelpFormatter } from '../../src/presentation/HelpFormatter.js';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const entry = fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url));

describe('CLI process', () => {
  it('starts with the banner and prompt, then exits successfully on EOF', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: '',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('svg-editor 0.1');
    expect(result.stdout).toContain('svg> ');
    expect(result.stderr).toBe('');
  });

  it('accepts blank lines and whole-line comments without command errors', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: '\n   \n# 注释\n  # another comment\n',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('error:');
    expect(result.stderr).toBe('');
  });

  it('reports unsupported commands, continues, and returns nonzero on EOF', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: 'bogus\ninit 800 600\ncreate rect r1 0 0 10 10\nscale r1 0\nmove r1 5 6\nshow r1\n',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('error: unknown command: bogus');
    expect(result.stdout).toContain('error: scale factor must be positive');
    expect(result.stdout).toContain('rect#r1 created');
    expect(result.stdout).toContain('x=5 y=6 width=10 height=10');
    expect(result.stderr).toBe('');
  });
});

describe('CLI end-to-end scripts and asynchronous output', () => {
  it('replays the Chinese flowchart example including all lines before EOF', () => {
    const script = readFileSync(new URL('../../examples/flowchart.cli', import.meta.url), 'utf8');
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toContain('error:');
    expect(result.stdout).toContain('rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9');
    expect(result.stdout).toContain('g#node2 moved back by (0,-100)');
    expect(result.stdout).toContain('text#process-label  parent=g#node2\n  x=545 y=235 text="处理数据 v2"');
    expect(result.stdout).toContain('└── line#arrow1  (280,130) -> (520,130) stroke=black');
    expect(result.stdout.trimEnd().endsWith('svg>')).toBe(true);
  });

  it('keeps redo after malformed input and processes a final line without a newline', () => {
    const script = ['init', 'create text t 1 2 "原文"', 'set t text "新版"', 'undo',
      'set t text "bad\\n"', 'show t', 'redo', 'show t'].join('\r\n');
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('error: invalid escape sequence: \\n');
    expect(result.stdout).toContain('x=1 y=2 text="原文"');
    expect(result.stdout).toContain('x=1 y=2 text="新版"');
  });

  it('distinguishes no document and IO barriers and recovers after failures', () => {
    const script = ['help', 'tree', 'init', 'undo', 'create g g', 'undo', 'redo',
      'canvas 400 300', 'redo', 'tree'].join('\n');
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain("error: no document. use 'init' or 'read' first");
    expect(result.stdout.match(/error: undo not allowed after io command/gu)).toHaveLength(2);
    expect(result.stdout).toContain('svg (400x300)\n└── g#g');
  });

  it('awaits results, renders warnings before messages, and reduces exceptions to one line', async () => {
    const dispatcher = new CommandDispatcher(new EditorSession(), new TreeFormatter(), new ShowFormatter(), new HelpFormatter());
    const calls: string[] = [];
    vi.spyOn(dispatcher, 'dispatch').mockImplementation(async line => {
      calls.push(line);
      await new Promise(resolve => setTimeout(resolve, 5));
      if (line === 'fail') throw new Error('first\nsecond\r\nthird');
      return new CommandResult(line + '\nsecond output line', ['warning\ncontinued']);
    });
    let output = '';
    const writer = new Writable({
      write(chunk, _encoding, callback) { output += String(chunk); callback(); },
    });
    const repl = new Repl(dispatcher, Readable.from(['one\nfail\ntwo\n']), writer);
    expect(await repl.run()).toBe(1);
    expect(calls).toEqual(['one', 'fail', 'two']);
    expect(output).toContain('warning: warning continued\none\nsecond output line');
    expect(output).toContain('error: first second third\n');
    expect(output).toContain('warning: warning continued\ntwo\nsecond output line');
    expect(output.indexOf('one\n')).toBeLessThan(output.indexOf('error:'));
    expect(output.indexOf('error:')).toBeLessThan(output.indexOf('two\n'));
  });
});
