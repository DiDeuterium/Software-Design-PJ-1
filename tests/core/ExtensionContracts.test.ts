import { describe, expect, it } from 'vitest';
import { PluginRegistry } from '../../src/core/registry/PluginRegistry.js';
import { AttributeDispatcher } from '../../src/core/attributes/AttributeDispatcher.js';
import { TreeLabels } from '../../src/core/tree/TreeLabels.js';
import type { PluginContext, PluginServices } from '../../src/core/public/Plugin.js';
import { ContractDocument } from './fixtures/ContractDocument.js';
import { ContractSession } from './fixtures/ContractSession.js';
import { ContractShape } from './fixtures/ContractShape.js';
import { SampleProvider } from './fixtures/SampleProvider.js';
import { SampleCommand } from './fixtures/SampleCommand.js';
import { SampleHandler } from './fixtures/SampleHandler.js';
import { SampleDecorator } from './fixtures/SampleDecorator.js';
import { SamplePlugin } from './fixtures/SamplePlugin.js';

const services: PluginServices = { directory: { read: async () => [] } };

describe('step 2 public extension contracts', () => {
  it('atomically registers all four class implementations, forwards options, and closes the context', async () => {
    const registry = new PluginRegistry(services);
    let retained: PluginContext | undefined;
    const options = { caption: '中文' };
    await registry.activate({ name: 'sample-package', contributes: {
      shapes: ['sample'], commands: ['sample'], decorators: ['sample-label'], attributes: ['sample-attributes'],
    } }, new SamplePlugin((context, received) => {
      expect(registry.view.shapes).toEqual([]);
      expect(received).toBe(options);
      retained = context;
      context.registerShape(new SampleProvider());
      context.registerCommand(new SampleCommand());
      context.registerDecorator(new SampleDecorator('sample-label', '(sample)'));
      context.registerAttribute(new SampleHandler());
    }), options);
    for (const category of ['shapes', 'commands', 'decorators', 'attributes'] as const) {
      expect(registry.view[category]).toHaveLength(1);
      expect(Object.isFrozen(registry.view[category])).toBe(true);
    }
    expect(() => retained!.registerCommand(new SampleCommand())).toThrow('plugin registration context is closed');
  });

  it('rolls back duplicates even if activation catches the registration error, retaining earlier plugins', async () => {
    const registry = new PluginRegistry(services);
    await registry.activate({ name: 'first', contributes: { commands: ['sample'] } },
      new SamplePlugin(context => context.registerCommand(new SampleCommand())));
    const before = registry.view;
    await expect(registry.activate({ name: 'broken', contributes: { shapes: ['sample'] } }, new SamplePlugin(context => {
      context.registerShape(new SampleProvider());
      try { context.registerCommand(new SampleCommand()); } catch { /* malicious/incorrect plugin */ }
    }))).rejects.toThrow('duplicate registration: commands/sample');
    expect(registry.view).toBe(before);
    await registry.activate({ name: 'later', contributes: { shapes: ['sample'] } },
      new SamplePlugin(context => context.registerShape(new SampleProvider())));
    expect(registry.view.shapes).toHaveLength(1);
  });

  it('rolls back manifest mismatch and activation failure without publishing staged entries', async () => {
    const registry = new PluginRegistry(services);
    await expect(registry.activate({ name: 'wrong', contributes: { shapes: ['missing'] } },
      new SamplePlugin(context => context.registerShape(new SampleProvider())))).rejects.toThrow('plugin manifest mismatch: wrong');
    await expect(registry.activate({ name: 'throws', contributes: { shapes: ['sample'] } }, new SamplePlugin(context => {
      context.registerShape(new SampleProvider());
      throw new Error('boom');
    }))).rejects.toThrow('plugin failed to activate: throws (boom)');
    expect(registry.view.shapes).toEqual([]);
  });

  it('has empty defaults; a command owns metadata and runs without an initialized document or history', async () => {
    const registry = new PluginRegistry(services);
    expect(Object.values(registry.view).every(entries => entries.length === 0)).toBe(true);
    const command = new SampleCommand();
    const session = new ContractSession();
    expect(command.syntax).toBe('sample');
    expect(command.help.join('')).toContain('sample');
    expect(await command.run([], { session, workingDirectory: '/fixed', extensions: registry.view,
      attributes: new AttributeDispatcher() })).toEqual({ message: '/fixed' });
    expect(session.documentView.document).toBeUndefined();
    expect(session.counts).toEqual([0, 0]);
  });

  it('supports a new composite, generic read/write/presentation, clone and child invariant without a type Visitor', () => {
    const provider = new SampleProvider();
    const shape = provider.create('s');
    expect(shape.isContainer).toBe(true);
    expect(shape.children.map(child => child.id)).toEqual(['s-a', 's-b']);
    expect(provider.write(shape.view())).toEqual({ tag: 'g', attributes: [['id', 's'], ['data-kind', 'sample']] });
    expect(provider.present(shape.view()).treeTitle).toBe('g#s');
    expect(provider.read({ id: 's', tag: 'g', attributes: [], text: '', children: shape.children }).view()).toEqual(shape.view());
    expect(() => shape.validateChildren(shape.children.slice(1))).toThrow('required child missing');
    expect(() => shape.withChildren(shape.children.slice(1))).toThrow('required child missing');
    expect(shape.withChildren(shape.children).view()).toEqual(shape.view());
    expect(() => shape.assertUngroup()).toThrow('cannot ungroup composite shape: s');
    const copy = shape.clone();
    copy.move(10, 0);
    expect(shape.children[0]!.getAttribute('x')).toBeUndefined();
    expect(copy.children[0]!.getAttribute('x')).toBe(10);
    expect(Object.isFrozen(shape.view().children[0]!.attributes)).toBe(true);
  });

  it('composes independent labels in registration order, preserves unlabelled bytes and isolates instance state', () => {
    const document = new ContractDocument([new SampleProvider().create('s')]).view();
    const line = { document, shape: document.getShape('s') };
    expect(new TreeLabels().append('g#s', line)).toBe('g#s');
    const first = new SampleDecorator('first', '*');
    const second = new SampleDecorator('second', '(sample)');
    const labels = new TreeLabels([first, second]);
    expect(labels.append('g#s', line)).toBe('g#s * (sample)');
    first.onCommit({ kind: 'save', document });
    expect(labels.append('g#s', line)).toBe('g#s (sample)');
    expect(() => new TreeLabels([new SampleDecorator('bad', '\n')]).append('g#s', line)).toThrow('invalid tree label');
  });

  it('makes multi-child attribute changes one undo unit, with complete redo', async () => {
    const session = new ContractSession(new ContractDocument([new SampleProvider().create('s')]));
    const before = session.documentView;
    const dispatcher = new AttributeDispatcher([new SampleHandler()]);
    await session.edit(candidate => {
      dispatcher.apply(candidate, 's', 'caption', 'after');
      return { message: 'changed' };
    });
    const after = session.documentView;
    expect(after.document!.getShape('s-a').attributes).toContainEqual(['fill', 'after']);
    expect(after.document!.getShape('s-b').attributes).toContainEqual(['text', 'after']);
    expect(session.counts).toEqual([1, 0]);
    await session.undo();
    expect(session.documentView.document!.roots).toEqual(before.document!.roots);
    await session.redo();
    expect(session.documentView.document!.roots).toEqual(after.document!.roots);
  });

  it('rejects conflicts and partial failures, preserving document and both history stacks without fallback', async () => {
    const session = new ContractSession(new ContractDocument([new SampleProvider().create('s')]));
    await session.edit(candidate => { candidate.getShape('s-a').set('fill', 'blue'); return { message: 'edit' }; });
    await session.undo(); // A failed edit must preserve a non-empty redo stack too.
    const before = session.documentView.document!.roots;
    for (const [handlers, error] of [
      [[new SampleHandler('first'), new SampleHandler('second')], 'attribute handler conflict: s/caption'],
      [[new SampleHandler('partial', true)], 'partial modification failed'],
    ] as const) {
      const dispatcher = new AttributeDispatcher(handlers);
      await expect(session.edit(candidate => {
        dispatcher.apply(candidate, 's', 'caption', 'bad'); return { message: 'must not commit' };
      })).rejects.toThrow(error);
      expect(session.documentView.document!.roots).toEqual(before);
      expect(session.counts).toEqual([0, 1]);
    }
  });

  it('falls back to the shape whitelist only when no handler matches', () => {
    const document = new ContractDocument([new ContractShape('r', 'leaf', [['fill', 'red']])]);
    const dispatcher = new AttributeDispatcher();
    expect(dispatcher.apply(document, 'r', 'fill', 'green')).toEqual({ before: 'red', after: 'green' });
    expect(() => dispatcher.apply(document, 'r', 'caption', 'bad')).toThrow('unknown attribute: caption');
  });
});
