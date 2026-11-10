import { describe, expect, it } from 'vitest';
import ts from 'typescript-ast';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createRuntime } from '../../src/host/Runtime.js';
import { EditorDocument } from '../../src/core/document/EditorDocument.js';
import { ProbeProvider } from './fixtures/ProbeProvider.js';
import { ProbeHandler } from './fixtures/ProbeHandler.js';
import { RecordingDecorator } from './fixtures/RecordingDecorator.js';
import { SamplePlugin } from './fixtures/SamplePlugin.js';
import { SampleCommand } from './fixtures/SampleCommand.js';
import { MemoryFiles } from './fixtures/MemoryFiles.js';

async function setup(handler = new ProbeHandler()) {
  const files = new MemoryFiles(); const runtime = await createRuntime({ files });
  await runtime.registry.activate({ name: 'test-probe', contributes: { shapes: ['probe'], attributes: [handler.name] } },
    new SamplePlugin(context => { context.registerShape(new ProbeProvider(runtime.shapes)); context.registerAttribute(handler); }));
  return { ...runtime, files, run: (line: string) => runtime.dispatcher.dispatch(line) };
}

describe('production framework with registered defaults and a test-only open type', () => {
  it('starts with no plugins, and keeps optional names absent in default assembly', async () => {
    const empty = await createRuntime({ builtins: false });
    expect(empty.registry.view.shapes).toEqual([]);
    await expect(empty.dispatcher.dispatch('help')).rejects.toThrow('unknown command: help');
    const defaults = await createRuntime();
    expect(defaults.registry.view.shapes.map(shape => shape.name)).toEqual(['rect', 'circle', 'ellipse', 'line', 'text', 'g']);
    for (const name of ['stats', 'dir']) await expect(defaults.dispatcher.dispatch(name)).rejects.toThrow(`unknown command: ${name}`);
    await expect(defaults.dispatcher.dispatch('create g g')).rejects.toThrow("no document. use 'init' or 'read' first");
    await defaults.dispatcher.dispatch('init');
    await expect(defaults.dispatcher.dispatch('create box b')).rejects.toThrow('unknown shape type: box');
  });

  it('creates, shows, moves, groups, serializes and reads a new composite without changing a Visitor or renderer', async () => {
    const r = await setup();
    for (const line of ['init', 'create g outer', 'create probe p in outer', 'create circle extra 1 2 3 in p']) await r.run(line);
    expect((await r.run('help'))!.message).toContain('create probe <id>');
    expect((await r.run('show p'))!.message).toContain('composite=probe');
    expect((await r.run('show outer'))!.message).toContain('children=1');
    expect((await r.run('tree'))!.message).toContain('rect#p-a');
    await r.run('move outer 10 20');
    expect((await r.run('show p-a'))!.message).toContain('x=11 y=22');
    await r.run('undo');
    expect((await r.run('show p-a'))!.message).toContain('x=1 y=2');
    await r.run('redo');
    await r.run('scale p 2');
    await expect(r.run('group pair p extra')).rejects.toThrow('cannot group a container into its own descendant: p');
  });

  it('round-trips registered metadata and degrades unknown kinds to ordinary groups', async () => {
    const r = await setup();
    for (const line of ['init', 'create g outer', 'create probe p in outer', 'create rect other 1 2 3 4 in outer',
      'group pair p other', 'ungroup pair', 'save probe.svg']) await r.run(line);
    const xml = await r.files.read('probe.svg'); expect(xml).toContain('data-kind="probe"');
    const before = r.session.state.document!.roots;
    await r.run('read probe.svg'); expect(r.session.state.document!.roots).toEqual(before);
    expect(r.session.state.document!.getShape('p').type).toBe('probe');
    const plain = await createRuntime({ files: r.files }); await plain.dispatcher.dispatch('read probe.svg');
    expect(plain.session.state.document!.getShape('p').type).toBe('g');
    expect(plain.session.state.document!.getShape('p').children.map(child => child.id)).toEqual(['p-a', 'p-b']);
  });

  it('protects derived IDs and required children atomically across delete, addto, group, ungroup and read', async () => {
    const r = await setup();
    for (const line of ['init', 'create g outer', 'create probe p in outer', 'create rect collision-a 0 0 1 1']) await r.run(line);
    const before = r.session.state.document!.roots; const history = r.session.undoCount;
    for (const line of ['create probe collision', 'delete p-a', 'addto outer p-a', 'group stolen p-a', 'ungroup p']) {
      await expect(r.run(line)).rejects.toThrow();
      expect(r.session.state.document!.roots).toEqual(before); expect(r.session.undoCount).toBe(history);
    }
    await r.files.write('bad.svg', '<svg width="800" height="600"><g id="p" data-kind="probe"/></svg>');
    await expect(r.run('read bad.svg')).rejects.toThrow('required child missing');
    expect(r.session.state.document!.roots).toEqual(before);
    await r.run('delete p'); await r.run('undo'); expect(r.session.state.document!.roots).toEqual(before);
  });

  it('uses real candidate/history transactions for multi-child handlers, conflict and partial failure', async () => {
    const r = await setup(); await r.run('init'); await r.run('create probe p');
    const before = r.session.state.document!.roots; await r.run('set p caption after');
    expect(r.session.state.document!.getShape('p-a').attributes).toContainEqual(['fill', 'after']);
    expect(r.session.undoCount).toBe(2); const after = r.session.state.document!.roots;
    await r.run('undo'); expect(r.session.state.document!.roots).toEqual(before);
    await r.run('redo'); expect(r.session.state.document!.roots).toEqual(after);
    await r.run('undo');
    await r.registry.activate({ name: 'conflicting', contributes: { attributes: ['second'] } },
      new SamplePlugin(context => context.registerAttribute(new ProbeHandler('second'))));
    await expect(r.run('set p caption bad')).rejects.toThrow('attribute handler conflict: p/caption');
    expect(r.session.state.document!.roots).toEqual(before); expect(r.session.redoCount).toBe(1);
    const failed = await setup(new ProbeHandler('throws', true)); await failed.run('init'); await failed.run('create probe p');
    await failed.run('move p 2 3'); await failed.run('undo');
    const original = failed.session.state.document!.roots;
    await expect(failed.run('set p caption bad')).rejects.toThrow('partial failure');
    expect(failed.session.state.document!.roots).toEqual(original); expect(failed.session.redoCount).toBe(1);
    await failed.run('set p-a fill green');
    await expect(failed.run('set p-a caption bad')).rejects.toThrow('unknown attribute: caption');
  });

  it('calls independent commands without a document and serializes concurrent session requests', async () => {
    const r = await createRuntime({ workingDirectory: '/fixed' });
    await r.registry.activate({ name: 'query', contributes: { commands: ['sample'] } },
      new SamplePlugin(context => context.registerCommand(new SampleCommand())));
    expect((await r.dispatcher.dispatch('sample'))!.message).toBe('/fixed');
    expect((await r.dispatcher.dispatch('help'))!.message).toContain('sample:');
    expect(r.session.state.document).toBeUndefined(); expect(r.session.undoCount).toBe(0);
    await r.dispatcher.dispatch('init');
    await Promise.all(['create rect r 1 2 3 4', 'move r 10 20', 'set r fill blue'].map(line => r.dispatcher.dispatch(line)));
    expect(r.session.state.document!.getShape('r').attributes).toContainEqual(['x', 11]);
    expect(r.session.undoCount).toBe(3);
  });

  it('emits only successful events, composes labels, isolates observer faults, and preserves failed IO state', async () => {
    const files = new MemoryFiles(); const diagnostics: string[] = [];
    const r = await createRuntime({ files, report: message => diagnostics.push(message) });
    const first = new RecordingDecorator('one', '*'); const second = new RecordingDecorator('two', '(probe)');
    const broken = new RecordingDecorator('bad', 'BAD', true);
    await r.registry.activate({ name: 'labels', contributes: { decorators: ['one', 'two', 'bad'] } },
      new SamplePlugin(context => [first, second, broken].forEach(label => context.registerDecorator(label))));
    await r.dispatcher.dispatch('init'); await r.dispatcher.dispatch('create rect r 1 2 3 4');
    await r.dispatcher.dispatch('save good.svg'); await r.dispatcher.dispatch('move r 1 1'); await r.dispatcher.dispatch('undo');
    const before = r.session.state; const counts = [r.session.undoCount, r.session.redoCount];
    files.failWrite = true;
    await expect(r.dispatcher.dispatch('save bad.svg')).rejects.toThrow('cannot write file: bad.svg');
    await expect(r.dispatcher.dispatch('set r missing value')).rejects.toThrow('unknown attribute');
    expect(r.session.state.document!.roots).toEqual(before.document!.roots); expect(r.session.state.path).toBe(before.path);
    expect([r.session.undoCount, r.session.redoCount]).toEqual(counts);
    expect(first.events).toEqual(['init', 'edit', 'save', 'edit', 'undo']); expect(second.events).toEqual(first.events);
    expect(broken.events).toEqual(['init']); expect(diagnostics).toHaveLength(1);
    expect((await r.dispatcher.dispatch('tree'))!.message).toContain('* (probe)');
    expect((await r.dispatcher.dispatch('tree'))!.message).not.toContain('BAD');
  });

  it('rejects external aliasing and keeps retained candidate/read views isolated from committed state', async () => {
    const r = await setup(); await r.run('init'); await r.run('create probe p');
    let retained: Parameters<Parameters<typeof r.session.edit>[0]>[0] | undefined;
    await r.session.edit(candidate => { retained = candidate; candidate.getShape('p-a').set('fill', 'blue'); return { message: 'changed' }; });
    retained!.getShape('p-a').set('fill', 'external');
    const view = r.session.state.document!; expect(view.getShape('p-a').attributes).toContainEqual(['fill', 'blue']);
    expect(Object.isFrozen(view.getShape('p-a').attributes)).toBe(true);
    const shared = r.shapes.create('rect', 'shared', [0, 0, 1, 1]);
    new EditorDocument(10, 10, [shared]);
    expect(() => new EditorDocument(10, 10, [shared])).toThrow('shape already belongs to a document');
  });

  it('enforces source import direction for the core and the default plugin', async () => {
    const walk = async (directory: string): Promise<string[]> => {
      const entries = await readdir(directory, { withFileTypes: true });
      return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) :
        entry.name.endsWith('.ts') ? [resolve(directory, entry.name)] : []))).flat();
    };
    for (const file of await walk(resolve('src/core'))) {
      const tree = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
      for (const statement of tree.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const target = statement.moduleSpecifier.text;
        if (target.startsWith('.')) expect(resolve(file, '..', target).startsWith(resolve('src/core') + sep)).toBe(true);
      }
    }
    for (const file of await walk(resolve('src/plugins/builtin'))) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/from ['"]([^'"]+)['"]/gu)) {
        const target = match[1]!;
        if (target.includes('core/')) expect(target).toContain('core/public/');
        expect(target).not.toContain('/host/');
      }
    }
  });
});
