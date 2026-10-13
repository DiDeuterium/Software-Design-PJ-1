import { spawnSync } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TempWorkspace } from '../infrastructure/TempWorkspace.js';
import { FastXmlSvgCodec } from '../../src/infrastructure/svg/FastXmlSvgCodec.js';

const entry = fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url));
const tsx = import.meta.resolve('tsx');

describe('CLI persistence process', () => {
  let workspace: TempWorkspace;
  beforeEach(async () => { workspace = await TempWorkspace.create(); });
  afterEach(async () => { await workspace.dispose(); });

  it('loads the course SVG, prints warnings before success, saves edits and reopens them', async () => {
    const source = await readFile(new URL('../../examples/other.svg', import.meta.url), 'utf8');
    await writeFile(workspace.file('中文 输入.svg'), source, 'utf8');
    const script = ['read "中文 输入.svg"', 'move g1 10 20', 'save "中文 输出.svg"',
      'init', 'read "中文 输出.svg"', 'show r2', 'set t1 text "中文 & <标签> \\"引号\\""',
      'save', 'tree'].join('\n');
    const result = spawnSync(process.execPath, ['--import', tsx, entry], {
      cwd: workspace.directory, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr + '\n' + result.stdout).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('warning: assigned id rect1 to unnamed <rect>\nread 中文 输入.svg (7 elements)');
    expect(result.stdout).toContain('saved to 中文 输出.svg (7 elements)');
    expect(result.stdout).toContain('rect#r2  parent=g#g1\n  x=10 y=20 width=10 height=10');
    const saved = new FastXmlSvgCodec().decode(await readFile(workspace.file('中文 输出.svg'), 'utf8')).document;
    expect(saved.getShape('t1')).toMatchObject({ text: '中文 & <标签> "引号"' });
    expect(saved.getShape('c2')).toMatchObject({ cx: 15, cy: 25 });
    expect(await readFile(workspace.file('中文 输入.svg'), 'utf8')).toBe(source);
    expect((await readdir(workspace.directory)).sort()).toEqual(['中文 输入.svg', '中文 输出.svg']);
  });

  it('continues after rejected read/save, suppresses failed-import warnings, and preserves redo', async () => {
    await writeFile(workspace.file('bad.svg'), '<svg width="1" height="2"><rect/><path/></svg>', 'utf8');
    const script = ['init', 'create rect r 1 2 3 4', 'move r 10 20', 'undo',
      'read bad.svg', 'save missing/out.svg', 'redo', 'show r', 'save good.svg',
      'undo', 'move r 1 0', 'undo', 'show r'].join('\n');
    const result = spawnSync(process.execPath, ['--import', tsx, entry], {
      cwd: workspace.directory, input: script, encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).not.toContain('warning:');
    expect(result.stdout).toContain('error: unsupported svg element: path');
    expect(result.stdout).toContain('error: cannot write file: missing/out.svg');
    expect(result.stdout).toContain('error: undo not allowed after io command');
    expect(result.stdout).toContain('x=11 y=22 width=3 height=4');
    const saved = new FastXmlSvgCodec().decode(await readFile(workspace.file('good.svg'), 'utf8')).document;
    expect(saved.getShape('r')).toMatchObject({ x: 11, y: 22 });
  });
});
