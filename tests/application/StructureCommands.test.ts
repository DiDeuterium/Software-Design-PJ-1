import { describe, expect, it } from 'vitest';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { GroupCommand } from '../../src/application/commands/GroupCommand.js';
import { UngroupCommand } from '../../src/application/commands/UngroupCommand.js';
import { AddToCommand } from '../../src/application/commands/AddToCommand.js';
import { FrontCommand } from '../../src/application/commands/FrontCommand.js';
import { BackCommand } from '../../src/application/commands/BackCommand.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { SetCommand } from '../../src/application/commands/SetCommand.js';
import { CommandResult } from '../../src/application/commands/CommandResult.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';
import { TestDocumentCommand } from './fixtures/TestDocumentCommand.js';

describe('GroupCommand', () => {
  it.each(['root', 'nested'])('groups nonadjacent %s siblings in document order as one history unit', async location => {
    const children = [new RectShape('a', 1, 2, 3, 4), new CircleShape('gap', 0, 0, 1), new TextShape('b', 5, 6, '中文')];
    const document = new SvgDocument(100, 200, location === 'nested' ? [new GroupShape('host', children)] : children);
    const session = new EditorSession(document);
    const before = document.snapshot();
    const result = await session.execute(new GroupCommand('new', ['b', 'a']));
    expect(result.message).toBe('g#new created with 2 children');
    const grouped = session.document;
    expect(grouped?.getShape('new').children.map(shape => shape.id)).toEqual(['a', 'b']);
    expect((location === 'nested' ? grouped?.getShape('host').children : grouped?.roots)?.map(shape => shape.id)).toEqual(['new', 'gap']);
    expect(session.undoCount).toBe(1);
    expect((await session.undo()).message).toBe('g#new removed; 2 children restored to original parents');
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
    expect((await session.redo()).message).toBe(result.message);
    if (session.document !== undefined) DocumentAssertions.consistent(session.document);
  });

  it('groups cross-parent leaves before the earliest affected root and restores both parents', async () => {
    const document = new SvgDocument(100, 200, [
      new TextShape('bg', 0, 0, ''),
      new GroupShape('left', [new RectShape('a', 1, 2, 3, 4), new CircleShape('keep', 0, 0, 1)]),
      new GroupShape('right', [new TextShape('b', 5, 6, '中文')]),
    ]);
    const before = document.snapshot();
    const session = new EditorSession(document);
    await session.execute(new GroupCommand('new', ['b', 'a']));
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['bg', 'new', 'left', 'right']);
    expect(session.document?.getShape('new').children.map(shape => shape.id)).toEqual(['a', 'b']);
    expect(session.document?.getShape('left').children.map(shape => shape.id)).toEqual(['keep']);
    expect(session.document?.getShape('right').children).toEqual([]);
    await session.undo();
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
  });

  it('keeps selected containers intact and orders mixed root/nested targets by preorder', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [
      new GroupShape('first', [new RectShape('a', 0, 0, 1, 1)]),
      new GroupShape('second', [new GroupShape('child', [new CircleShape('c', 0, 0, 1)])]),
    ]));
    await session.execute(new GroupCommand('new', ['child', 'first']));
    const current = session.document;
    expect(current?.roots.map(shape => shape.id)).toEqual(['new', 'second']);
    expect(current?.getShape('new').children.map(shape => shape.id)).toEqual(['first', 'child']);
    expect(current?.getShape('c').parent?.id).toBe('child');
    if (current !== undefined) DocumentAssertions.consistent(current);
  });

  it('copies the target array and supports a single target', async () => {
    const targets = ['a'];
    const command = new GroupCommand('new', targets);
    targets[0] = 'missing';
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('a', 0, 0, 1)]));
    expect((await session.execute(command)).message).toBe('g#new created with 1 children');
    await session.undo();
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['a']);
  });
});

describe('UngroupCommand', () => {
  it('promotes child subtrees in place and restores group styles and all child order on undo', async () => {
    const inner = new GroupShape('inner', [new RectShape('a', 1, 2, 3, 4), new GroupShape('child', [new TextShape('t', 5, 6, '中文')])]);
    inner.set('fill', 'red');
    const document = new SvgDocument(100, 200, [new GroupShape('host', [new CircleShape('before', 0, 0, 1), inner, new CircleShape('after', 0, 0, 1)])]);
    const session = new EditorSession(document);
    const before = document.snapshot();
    const result = await session.execute(new UngroupCommand('inner'));
    expect(result.message).toBe('g#inner ungrouped; 2 children promoted to g#host');
    expect(session.document?.find('inner')).toBeUndefined();
    expect(session.document?.getShape('host').children.map(shape => shape.id)).toEqual(['before', 'a', 'child', 'after']);
    expect(session.document?.getShape('t').parent?.id).toBe('child');
    expect((await session.undo()).message).toBe('g#inner restored with 2 children in g#host');
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
    expect(restored?.getShape('inner').fill).toBe('red');
    await session.redo();
    expect(session.document?.find('inner')).toBeUndefined();
  });

  it('removes an empty nested group and restores it as one unit', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('host', [new GroupShape('empty')])]));
    expect((await session.execute(new UngroupCommand('empty'))).message).toBe('g#empty ungrouped; 0 children promoted to g#host');
    expect(session.document?.size).toBe(1);
    await session.undo();
    expect(session.document?.getShape('empty').parent?.id).toBe('host');
    expect(session.document?.size).toBe(2);
  });

  it('undoes a root-level group creation even though user ungroup of that group is forbidden', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 0, 0, 1)]));
    await session.execute(new GroupCommand('rootGroup', ['c']));
    await expect(session.execute(new UngroupCommand('rootGroup'))).rejects.toThrow('cannot ungroup top-level container: rootGroup');
    expect(session.undoCount).toBe(1);
    await session.undo();
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['c']);
  });
});

describe('AddToCommand', () => {
  it.each(['root', 'nested'])('moves a %s leaf into the target and restores its former position', async location => {
    const leaf = new RectShape('r', 1, 2, 3, 4);
    const source = new GroupShape('source', location === 'nested' ? [leaf, new TextShape('keep', 0, 0, '')] : []);
    const target = new GroupShape('target', [new CircleShape('before', 0, 0, 1)]);
    const document = new SvgDocument(100, 200, location === 'nested' ? [source, target] : [leaf, source, target]);
    const session = new EditorSession(document);
    const before = document.snapshot();
    const result = await session.execute(new AddToCommand('target', 'r'));
    expect(result.message).toBe('rect#r moved into g#target');
    expect(session.document?.getShape('target').children.map(shape => shape.id)).toEqual(['before', 'r']);
    expect((await session.undo()).message).toBe(`rect#r restored into ${location === 'nested' ? 'g#source' : 'svg'}`);
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
    expect((await session.redo()).message).toBe(result.message);
  });

  it('moves an intact nested container subtree and restores all descendant parents', async () => {
    const document = new SvgDocument(100, 200, [new GroupShape('source', [new GroupShape('moved', [new RectShape('r', 1, 2, 3, 4)])]), new GroupShape('target')]);
    const session = new EditorSession(document);
    const before = document.snapshot();
    await session.execute(new AddToCommand('target', 'moved'));
    expect(session.document?.getShape('moved').parent?.id).toBe('target');
    expect(session.document?.getShape('r').parent?.id).toBe('moved');
    await session.undo();
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
  });

  it('moves an existing child to the target tail and restores its earlier order', async () => {
    const document = new SvgDocument(100, 200, [new GroupShape('g', [new CircleShape('a', 0, 0, 1), new CircleShape('b', 0, 0, 1)])]);
    const session = new EditorSession(document);
    await session.execute(new AddToCommand('g', 'a'));
    expect(session.document?.getShape('g').children.map(shape => shape.id)).toEqual(['b', 'a']);
    await session.undo();
    expect(session.document?.getShape('g').children.map(shape => shape.id)).toEqual(['a', 'b']);
  });

  it('records an already-last child as an edit and clears redo', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('g', [new CircleShape('a', 0, 0, 1)])]));
    await session.execute(new SetCommand('a', 'fill', 'red'));
    await session.undo();
    await session.execute(new AddToCommand('g', 'a'));
    expect([session.undoCount, session.redoCount]).toEqual([1, 0]);
    await session.undo();
    expect(session.document?.getShape('g').children.map(shape => shape.id)).toEqual(['a']);
  });
});

describe('FrontCommand/BackCommand', () => {
  it.each(['root', 'nested'])('only change %s sibling drawing order and restore it exactly', async location => {
    const children = [new CircleShape('a', 0, 0, 1), new GroupShape('g', [new RectShape('r', 1, 2, 3, 4)]), new TextShape('b', 5, 6, '中文')];
    const document = new SvgDocument(100, 200, location === 'nested' ? [new GroupShape('host', children)] : children);
    const session = new EditorSession(document);
    const before = document.snapshot();
    expect((await session.execute(new FrontCommand('g'))).message).toBe('g#g moved to front');
    const afterFront = session.document;
    expect((location === 'nested' ? afterFront?.getShape('host').children : afterFront?.roots)?.map(shape => shape.id)).toEqual(['a', 'b', 'g']);
    expect(afterFront?.getShape('r').parent?.id).toBe('g');
    expect((await session.undo()).message).toBe('g#g restored to previous z-order');
    const restored = session.document;
    if (restored !== undefined) DocumentAssertions.unchanged(restored, before);
    await session.redo();
    expect((await session.execute(new BackCommand('g'))).message).toBe('g#g moved to back');
    const afterBack = session.document;
    expect((location === 'nested' ? afterBack?.getShape('host').children : afterBack?.roots)?.map(shape => shape.id)).toEqual(['g', 'a', 'b']);
    await session.undo();
    await session.undo();
    const final = session.document;
    if (final !== undefined) DocumentAssertions.unchanged(final, before);
  });

  it.each([new FrontCommand('only'), new BackCommand('only')])('records unchanged order as a successful edit', async command => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('only', 0, 0, 1)]));
    await session.execute(new CreateCommand('g', 'temporary'));
    await session.undo();
    await session.execute(command);
    expect([session.undoCount, session.redoCount]).toEqual([1, 0]);
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['only']);
    await session.undo();
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['only']);
  });
});

describe('structural errors and history boundaries', () => {
  it('undoes and redoes a mixed group/migration/order/ungroup sequence back to exact trees', async () => {
    const document = new SvgDocument(100, 200, [new GroupShape('host', [
      new RectShape('a', 1, 2, 3, 4), new CircleShape('b', 5, 6, 7), new TextShape('c', 8, 9, '中文'),
    ]), new GroupShape('untouched')]);
    const before = document.snapshot();
    const session = new EditorSession(document);
    await session.execute(new GroupCommand('new', ['b', 'a']));
    await session.execute(new AddToCommand('new', 'c'));
    await session.execute(new FrontCommand('a'));
    await session.execute(new UngroupCommand('new'));
    const after = session.document?.snapshot();
    expect(session.document?.getShape('host').children.map(shape => shape.id)).toEqual(['b', 'c', 'a']);
    expect(session.undoCount).toBe(4);
    for (let index = 0; index < 4; index++) await session.undo();
    const undone = session.document;
    if (undone !== undefined) DocumentAssertions.unchanged(undone, before);
    expect([session.undoCount, session.redoCount]).toEqual([0, 4]);
    for (let index = 0; index < 4; index++) await session.redo();
    const redone = session.document;
    if (redone !== undefined && after !== undefined) DocumentAssertions.unchanged(redone, after);
    expect([session.undoCount, session.redoCount]).toEqual([4, 0]);
  });

  it.each([
    { command: new GroupCommand('r', ['r']), error: 'id already exists: r' },
    { command: new GroupCommand('new', ['r', 'missing']), error: 'no such shape: missing' },
    { command: new GroupCommand('new', ['r', 'r']), error: 'duplicate group target: r' },
    { command: new GroupCommand('new', ['r', 'g']), error: 'cannot group a container into its own descendant: g' },
    { command: new GroupCommand('new', ['g', 'r']), error: 'cannot group a container into its own descendant: g' },
    { command: new GroupCommand('new', []), error: 'group requires at least one shape' },
    { command: new GroupCommand('bad id', ['r']), error: 'invalid id: bad id' },
    { command: new UngroupCommand('g'), error: 'cannot ungroup top-level container: g' },
    { command: new UngroupCommand('r'), error: 'not a container: r' },
    { command: new UngroupCommand('missing'), error: 'no such shape: missing' },
    { command: new AddToCommand('missing', 'r'), error: 'no such container: missing' },
    { command: new AddToCommand('r', 'g'), error: 'not a container: r' },
    { command: new AddToCommand('g', 'missing'), error: 'no such shape: missing' },
    { command: new AddToCommand('g', 'g'), error: 'cannot add a container into itself or its descendant: g' },
    { command: new AddToCommand('inner', 'g'), error: 'cannot add a container into itself or its descendant: g' },
    { command: new FrontCommand('missing'), error: 'no such shape: missing' },
    { command: new BackCommand('missing'), error: 'no such shape: missing' },
  ])('preserves document and redo on $error', async ({ command, error }) => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('g', [new RectShape('r', 1, 2, 3, 4), new GroupShape('inner')])]), 'original.svg');
    await session.execute(new CreateCommand('g', 'temporary'));
    await session.undo();
    const before = session.document?.snapshot();
    await expect(session.execute(command)).rejects.toThrow(error);
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 1, false]);
    expect(session.path).toBe('original.svg');
    const current = session.document;
    if (current !== undefined && before !== undefined) DocumentAssertions.unchanged(current, before);
    await session.redo();
    expect(session.document?.find('temporary')).toBeDefined();
  });

  it.each([
    new GroupCommand('new', ['r']), new UngroupCommand('g'), new AddToCommand('g', 'r'),
    new FrontCommand('r'), new BackCommand('r'),
  ])('requires a current document', async command => {
    const session = new EditorSession();
    await expect(session.execute(command)).rejects.toThrow("no document. use 'init' or 'read' first");
    expect([session.undoCount, session.redoCount]).toEqual([0, 0]);
  });

  it('keeps an IO barrier on failed structure commands and unlocks after valid grouping', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 0, 0, 1)]));
    await session.execute(new TestDocumentCommand(() => new CommandResult('saved')));
    await expect(session.execute(new GroupCommand('new', ['missing']))).rejects.toThrow('no such shape: missing');
    expect(session.historyBlocked).toBe(true);
    await session.execute(new GroupCommand('new', ['c']));
    expect(session.historyBlocked).toBe(false);
    await session.undo();
    expect(session.document?.roots.map(shape => shape.id)).toEqual(['c']);
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });

  it('restores the right origin when the same migration command is reused', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 0, 0, 1), new GroupShape('g')]));
    const command = new AddToCommand('g', 'c');
    await session.execute(command);
    await session.execute(command);
    expect((await session.undo()).message).toBe('circle#c restored into g#g');
    expect((await session.undo()).message).toBe('circle#c restored into svg');
    expect(session.document?.getShape('c').parent).toBeUndefined();
  });
});
