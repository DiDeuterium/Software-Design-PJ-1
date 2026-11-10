import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { ModifiedStarDecorator } from '../../src/plugins/tree-star/ModifiedStarDecorator.js';
import TreeStarPlugin from '../../src/plugins/tree-star/TreeStarPlugin.js';
import BoxPlugin from '../../src/plugins/shape-box/BoxPlugin.js';
import type { DocumentView } from '../../src/core/public/Document.js';
import { ContractDocument } from '../core/fixtures/ContractDocument.js';
import { ContractShape } from '../core/fixtures/ContractShape.js';
import { createRuntime } from '../../src/host/Runtime.js';
import { MemoryFiles } from '../core/fixtures/MemoryFiles.js';

const starManifest = { name: '@svgframe/plugin-tree-star', contributes: { decorators: ['modified-star'] } };
const boxManifest = { name: '@svgframe/plugin-shape-box', contributes: {
  shapes: ['box'], attributes: ['box-fill', 'box-label'], decorators: ['box-type-label'],
} };
const labels = (star: ModifiedStarDecorator, document: DocumentView, id?: string) =>
  star.labels({ document, shape: id === undefined ? undefined : document.getShape(id) });
const leaf = (id: string, fill = 'red') => new ContractShape(id, 'rect', [['x', 1], ['fill', fill]]);
const doc = (...roots: ContractShape[]) => new ContractDocument(roots).view();

describe('modified-star independent state machine', () => {
  it('compares content across init/new/edit/save/undo/redo/read rather than recording edit occurrence', () => {
    const star = new ModifiedStarDecorator(); const empty = doc(); const red = doc(leaf('r')); const blue = doc(leaf('r', 'blue'));
    star.onCommit({ kind: 'init', document: empty }); expect(labels(star, empty)).toEqual([]);
    star.onCommit({ kind: 'edit', document: red }); expect(labels(star, red, 'r')).toEqual(['*']);
    star.onCommit({ kind: 'save', document: red }); expect(labels(star, red)).toEqual([]);
    star.onCommit({ kind: 'edit', document: blue }); expect(labels(star, blue, 'r')).toEqual(['*']);
    star.onCommit({ kind: 'undo', document: red }); expect(labels(star, red, 'r')).toEqual([]);
    star.onCommit({ kind: 'redo', document: blue }); expect(labels(star, blue)).toEqual(['*']);
    star.onCommit({ kind: 'read', document: blue }); expect(labels(star, blue, 'r')).toEqual([]);
    star.onCommit({ kind: 'init', document: empty }); expect(labels(star, empty)).toEqual([]);
  });
  it('marks direct structural changes but not ancestor propagation; root tracks all content and canvas changes', () => {
    const group = (...children: ContractShape[]) => new ContractShape('g', 'g', [], children, true);
    const before = doc(group(leaf('r'), leaf('s'))); const star = new ModifiedStarDecorator();
    star.onCommit({ kind: 'save', document: before });
    const changed = doc(group(leaf('r', 'blue'), leaf('s')));
    expect(labels(star, changed, 'r')).toEqual(['*']); expect(labels(star, changed, 'g')).toEqual([]); expect(labels(star, changed)).toEqual(['*']);
    for (const next of [doc(group(leaf('s'), leaf('r'))), doc(group(leaf('r'))), doc(group(leaf('r'), leaf('s'), leaf('new')))]) {
      expect(labels(star, next, 'g')).toEqual(['*']); expect(labels(star, next)).toEqual(['*']);
    }
    expect(labels(star, { ...before, width: 900 })).toEqual(['*']);
    expect(labels(star, { ...before, width: 900 }, 'g')).toEqual([]);
    expect(labels(star, doc())).toEqual(['*']);
  });
  it('ignores attribute ordering and isolates baseline state between plugin instances', () => {
    const before = doc(leaf('r')); const star = new ModifiedStarDecorator();
    star.onCommit({ kind: 'save', document: before });
    const reordered = doc(new ContractShape('r', 'rect', [['fill', 'red'], ['x', 1]]));
    expect(labels(star, reordered)).toEqual([]); expect(labels(star, reordered, 'r')).toEqual([]);
    const other = new ModifiedStarDecorator(); other.onCommit({ kind: 'init', document: doc() });
    expect(labels(other, before, 'r')).toEqual(['*']); expect(labels(star, before, 'r')).toEqual([]);
  });
});

describe('star lifecycle in the actual session', () => {
  it('coexists with box and preserves dirty state across queries/errors, resetting only on successful IO/init', async () => {
    const files = new MemoryFiles(); const runtime = await createRuntime({ files, plugins: [
      { manifest: boxManifest, plugin: new BoxPlugin() }, { manifest: starManifest, plugin: new TreeStarPlugin() },
    ] });
    const run = (line: string) => runtime.dispatcher.dispatch(line);
    const tree = async () => (await run('tree'))!.message;
    await run('init'); expect(await tree()).toBe('svg (800x600)');
    await run('create g outer'); await run('create box n 1 2 3 4 "before" in outer');
    expect(await tree()).toContain('g#n (box) *');
    await run('save base.svg'); const saved = await tree(); expect(saved).not.toContain('*');
    await run('set n label "after"'); const dirty = await tree();
    expect(dirty.split('\n')[0]).toBe('svg (800x600) *');
    expect(dirty).toContain('g#n (box)\n'); expect(dirty).toContain('g#outer\n');
    expect(dirty).toContain('"after" *');
    const counts = [runtime.session.undoCount, runtime.session.redoCount];
    await run('show n'); await run('help'); await expect(run('set n unknown bad')).rejects.toThrow();
    files.failWrite = true; await expect(run('save failed.svg')).rejects.toThrow();
    await expect(run('read absent.svg')).rejects.toThrow(); expect(await tree()).toBe(dirty);
    expect([runtime.session.undoCount, runtime.session.redoCount]).toEqual(counts);
    await run('undo'); expect(await tree()).toBe(saved); await run('redo'); expect(await tree()).toBe(dirty);
    files.failWrite = false; await run('save renamed.svg'); expect(await tree()).not.toContain('*');
    await run('set n label "after"'); expect(await tree()).not.toContain('*'); // successful no-op
    await run('canvas 900 600'); expect((await tree()).split('\n')[0]).toBe('svg (900x600) *');
    await run('read base.svg'); expect(await tree()).toBe(saved);
    await run('init'); expect(await tree()).toBe('svg (800x600)');
  });
  it('loads the same decorator through config, uses registration order, and leaves disabled output untouched', async () => {
    const temporary = await mkdtemp(join(process.cwd(), '.star-test-'));
    try {
      const file = join(temporary, 'plugins.config.json');
      await writeFile(file, JSON.stringify({ plugins: [
        { module: resolve('dist/plugins/tree-star') }, { module: resolve('dist/plugins/shape-box') },
      ] }));
      const errors: string[] = [];
      const configured = await createRuntime({ configFile: file, report: message => errors.push(message) }); expect(errors).toEqual([]);
      const coded = await createRuntime({ plugins: [
        { manifest: starManifest, plugin: new TreeStarPlugin() }, { manifest: boxManifest, plugin: new BoxPlugin() },
      ] });
      for (const line of ['init', 'create box n 1 2 3 4 "text"', 'tree', 'undo', 'tree', 'redo', 'tree']) {
        expect(JSON.stringify(await coded.dispatcher.dispatch(line))).toBe(JSON.stringify(await configured.dispatcher.dispatch(line)));
      }
      expect((await configured.dispatcher.dispatch('tree n'))!.message.split('\n')[0]).toBe('g#n * (box)');
      await writeFile(file, JSON.stringify({ plugins: [{ module: resolve('dist/plugins/tree-star'), enabled: false }] }));
      const plain = await createRuntime({ configFile: file });
      await plain.dispatcher.dispatch('init'); await plain.dispatcher.dispatch('create rect r 1 2 3 4');
      expect(Buffer.from((await plain.dispatcher.dispatch('tree'))!.message).equals(Buffer.from('svg (800x600)\n└── rect#r  x=1 y=2 w=3 h=4'))).toBe(true);
    } finally {
      if (dirname(temporary) !== process.cwd() || !basename(temporary).startsWith('.star-test-')) throw new Error('unexpected test directory');
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
