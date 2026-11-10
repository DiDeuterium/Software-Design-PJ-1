import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { StatsCommand } from '../../src/plugins/command-stats/StatsCommand.js';
import StatsPlugin from '../../src/plugins/command-stats/StatsPlugin.js';
import { DirCommand } from '../../src/plugins/command-dir/DirCommand.js';
import DirPlugin from '../../src/plugins/command-dir/DirPlugin.js';
import type { CommandContext } from '../../src/core/public/Command.js';
import type { DirectoryReader, DirectoryEntry } from '../../src/core/public/Plugin.js';
import { AttributeDispatcher } from '../../src/core/attributes/AttributeDispatcher.js';
import { ContractSession } from '../core/fixtures/ContractSession.js';
import { ContractDocument } from '../core/fixtures/ContractDocument.js';
import { ContractShape } from '../core/fixtures/ContractShape.js';
import { MemoryFiles } from '../core/fixtures/MemoryFiles.js';
import { RecordingDecorator } from '../core/fixtures/RecordingDecorator.js';
import { SamplePlugin } from '../core/fixtures/SamplePlugin.js';
import { createRuntime } from '../../src/host/Runtime.js';
import { Repl } from '../../src/host/Repl.js';

const manifest = (name: string) => ({ name: `@svgframe/plugin-command-${name}`, contributes: { commands: [name] } });
const context = (session = new ContractSession()): CommandContext => ({ session, workingDirectory: '/fixed',
  extensions: { shapes: [], commands: [], attributes: [], decorators: [] }, attributes: new AttributeDispatcher() });

describe('independent command plugins', () => {
  it('stats counts DFS leaves in first-seen order, including children of an arbitrary composite', async () => {
    const leaf = (id: string, type: string) => new ContractShape(id, type);
    const document = new ContractDocument([
      new ContractShape('g', 'g', [], [leaf('r1', 'rect'), leaf('c', 'circle'), leaf('r2', 'rect')], true),
      new ContractShape('b', 'box', [], [leaf('r3', 'rect'), leaf('t1', 'text'), leaf('t2', 'text')], true),
    ]);
    const session = new ContractSession(document);
    expect((await new StatsCommand().run([], context(session))).message).toBe('rect: 3  circle: 1  text: 2  (total 6, containers 2)');
    expect(session.counts).toEqual([0, 0]);
  });
  it('stats handles empty documents and rejects missing documents and extra arguments', async () => {
    const command = new StatsCommand();
    expect((await command.run([], context(new ContractSession(new ContractDocument())))).message).toBe('(total 0, containers 0)');
    await expect(command.run([], context())).rejects.toThrow('no document');
    await expect(command.run([{ value: 'x', quoted: false }], context())).rejects.toThrow('usage: stats');
  });
  it('dir sorts directories/files/other deterministically, includes hidden names and does not mutate input', async () => {
    const entries: readonly DirectoryEntry[] = Object.freeze([
      { name: 'z', kind: 'file' }, { name: 'docs', kind: 'directory' }, { name: '.hidden', kind: 'file' },
      { name: 'link', kind: 'other' }, { name: 'a', kind: 'directory' }, { name: '.', kind: 'directory' },
      { name: '..', kind: 'directory' },
    ]);
    const paths: string[] = [];
    const reader: DirectoryReader = { async read(path) { paths.push(path); return entries; } };
    const command = new DirCommand(reader);
    const expected = '[DIR]  a\n[DIR]  docs\n[FILE]  .hidden\n[FILE]  z\n[OTHER]  link';
    expect((await command.run([], context())).message).toBe(expected);
    expect((await command.run([], context())).message).toBe(expected);
    expect(paths).toEqual(['/fixed', '/fixed']); expect(entries[0]!.name).toBe('z');
  });
  it('dir handles empty/read failures without a document, and rejects arguments before filesystem access', async () => {
    expect((await new DirCommand({ read: async () => [] }).run([], context())).message).toBe('(empty directory)');
    const command = new DirCommand({ read: async () => { throw new Error('denied'); } });
    await expect(command.run([], context())).rejects.toThrow('cannot read directory: /fixed');
    await expect(command.run([{ value: 'x', quoted: false }], context())).rejects.toThrow('usage: dir');
  });
});

describe('registered commands and real adapter', () => {
  it('can enable each command independently, with help and unknown-command defaults', async () => {
    for (const name of ['stats', 'dir'] as const) {
      const runtime = await createRuntime({ plugins: [{ manifest: manifest(name), plugin: name === 'stats' ? new StatsPlugin() : new DirPlugin() }] });
      const help = (await runtime.dispatcher.dispatch('help'))!.message;
      expect(help).toContain(`  ${name} `);
      const other = name === 'stats' ? 'dir' : 'stats';
      await expect(runtime.dispatcher.dispatch(other)).rejects.toThrow(`unknown command: ${other}`);
    }
  });
  it('stats and successful/failed dir preserve document, path, history and commit events, including IO barriers', async () => {
    let fail = false; const paths: string[] = [];
    const reader: DirectoryReader = { async read(path) { paths.push(path); if (fail) throw new Error('denied'); return []; } };
    const label = new RecordingDecorator('events', '*');
    const runtime = await createRuntime({ files: new MemoryFiles(), workingDirectory: '/fixed', services: { directory: reader }, plugins: [
      { manifest: manifest('dir'), plugin: new DirPlugin() }, { manifest: manifest('stats'), plugin: new StatsPlugin() },
      { manifest: { name: 'events', contributes: { decorators: ['events'] } }, plugin: new SamplePlugin(ctx => ctx.registerDecorator(label)) },
    ] });
    const run = (line: string) => runtime.dispatcher.dispatch(line);
    for (const line of ['init', 'create rect r 1 2 3 4', 'save elsewhere.svg', 'read elsewhere.svg']) await run(line);
    const snapshot = () => JSON.stringify({ roots: runtime.session.state.document!.roots, path: runtime.session.state.path,
      undo: runtime.session.undoCount, redo: runtime.session.redoCount, barrier: runtime.session.historyBlocked, events: label.events });
    const barrier = snapshot(); await run('dir'); await run('stats'); expect(snapshot()).toBe(barrier);
    for (const line of ['move r 1 1', 'undo']) await run(line);
    const before = snapshot(); await run('dir'); await run('stats'); expect(snapshot()).toBe(before);
    fail = true; await expect(run('dir')).rejects.toThrow('cannot read directory: /fixed'); expect(snapshot()).toBe(before);
    fail = false; await run('redo'); expect(paths.every(path => path === '/fixed')).toBe(true);
  });
  it('combines the real filesystem adapter with both assemblies and compares raw REPL bytes in a fixed directory', async () => {
    const temporary = await mkdtemp(join(process.cwd(), '.commands-test-'));
    try {
      const target = join(temporary, 'target'); await mkdir(target);
      for (const name of ['zdir', 'adir']) await mkdir(join(target, name));
      for (const name of ['z.txt', '.hidden']) await writeFile(join(target, name), 'fixed');
      const file = join(temporary, 'plugins.config.json');
      await writeFile(file, JSON.stringify({ plugins: [
        { module: resolve('dist/plugins/command-stats') }, { module: resolve('dist/plugins/command-dir') },
      ] }));
      const a = await createRuntime({ workingDirectory: target, plugins: [
        { manifest: manifest('stats'), plugin: new StatsPlugin() }, { manifest: manifest('dir'), plugin: new DirPlugin() },
      ] });
      const errors: string[] = [];
      const b = await createRuntime({ workingDirectory: target, configFile: file, report: error => errors.push(error) });
      expect(errors).toEqual([]);
      expect((await a.dispatcher.dispatch('dir'))!.message).toBe('[DIR]  adir\n[DIR]  zdir\n[FILE]  .hidden\n[FILE]  z.txt');
      const replay = async (runtime: typeof a) => {
        const chunks: Buffer[] = [];
        const output = new Writable({ write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
        const status = await new Repl(runtime.dispatcher, Readable.from(['dir\ninit\ncreate g g\ncreate rect r 1 2 3 4 in g\nstats\nhelp\n']), output).run();
        return { bytes: Buffer.concat(chunks), status };
      };
      const left = await replay(a); const right = await replay(b);
      expect(left.status).toBe(0); expect(right.status).toBe(left.status); expect(left.bytes.equals(right.bytes)).toBe(true);
    } finally {
      if (dirname(temporary) !== process.cwd() || !basename(temporary).startsWith('.commands-test-')) throw new Error('unexpected test directory');
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
