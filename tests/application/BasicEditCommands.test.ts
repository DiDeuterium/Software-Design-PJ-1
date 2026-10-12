import { describe, expect, it } from 'vitest';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { DeleteCommand } from '../../src/application/commands/DeleteCommand.js';
import { MoveCommand } from '../../src/application/commands/MoveCommand.js';
import { ScaleCommand } from '../../src/application/commands/ScaleCommand.js';
import { SetCommand } from '../../src/application/commands/SetCommand.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { ShapeFactory } from '../../src/domain/factory/ShapeFactory.js';
import type { ShapeParameter } from '../../src/domain/factory/ShapeParameter.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { CommandResult } from '../../src/application/commands/CommandResult.js';
import { TestDocumentCommand } from './fixtures/TestDocumentCommand.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

const factory = new ShapeFactory();
const shapeCases: { type: string; parameters: ShapeParameter[] }[] = [
  { type: 'rect', parameters: [10, 20, 30, 40] },
  { type: 'circle', parameters: [10, 20, 30] },
  { type: 'ellipse', parameters: [10, 20, 30, 40] },
  { type: 'line', parameters: [10, 20, 30, 40] },
  { type: 'text', parameters: [10, 20, '中文 with spaces'] },
  { type: 'g', parameters: [] },
];

describe.each(shapeCases)('real $type edit commands', ({ type, parameters }) => {
  it.each(['root', 'nested'])('creates in $s and preserves exact state through undo/redo', async location => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('parent')]));
    const parentId = location === 'nested' ? 'parent' : undefined;
    const result = await session.execute(new CreateCommand(type, 's', parameters, parentId));
    expect(result.message).toBe(`${type}#s created${parentId === undefined ? '' : ' in g#parent'}`);
    const created = session.document;
    expect(created?.getShape('s')).toEqual(factory.create(type, 's', parameters));
    expect(created?.getShape('s').parent?.id).toBe(parentId);
    expect(session.undoCount).toBe(1);
    expect((await session.undo()).message).toBe(`${type}#s deleted`);
    expect(session.document?.find('s')).toBeUndefined();
    expect((await session.redo()).message).toBe(result.message);
    const after = session.document;
    if (after !== undefined) DocumentAssertions.consistent(after);
    expect(after?.getShape('s').parent?.id).toBe(parentId);
  });

  it('deletes and restores the node to its original parent and position', async () => {
    const shape = factory.create(type, 's', parameters);
    const parent = new GroupShape('parent', [new CircleShape('before', 0, 0, 1), shape, new CircleShape('after', 0, 0, 1)]);
    const session = new EditorSession(new SvgDocument(100, 200, [parent]));
    const before = session.document?.snapshot();
    expect((await session.execute(new DeleteCommand('s'))).message).toBe(`${type}#s deleted`);
    expect(session.document?.find('s')).toBeUndefined();
    expect((await session.undo()).message).toBe(`${type}#s restored into g#parent`);
    const restored = session.document;
    if (restored !== undefined && before !== undefined) DocumentAssertions.unchanged(restored, before);
    await session.redo();
    expect(session.document?.find('s')).toBeUndefined();
  });

  it('scales with an actual command and restores the complete original geometry', async () => {
    const original = new SvgDocument(100, 200, [factory.create(type, 's', parameters)]);
    const session = new EditorSession(original);
    const expected = original.clone();
    expected.scale('s', 0.5);
    expect((await session.execute(new ScaleCommand('s', '0.5'))).message).toBe(`${type}#s scaled by 0.5`);
    expect(session.document?.roots).toEqual(expected.roots);
    expect((await session.undo()).message).toBe(`${type}#s restored after scaling`);
    expect(session.document?.roots).toEqual(original.roots);
    await session.redo();
    expect(session.document?.roots).toEqual(expected.roots);
  });
});

describe('creation and deletion state', () => {
  it('copies creation parameters so later caller mutation cannot change execution', async () => {
    const parameters: ShapeParameter[] = [1, 2, 3, 4, 'red'];
    const command = new CreateCommand('rect', 'r', parameters);
    parameters[0] = 999;
    parameters[4] = 'blue';
    const session = new EditorSession(new SvgDocument());
    await session.execute(command);
    const shape = session.document?.getShape('r') as RectShape;
    expect([shape.x, shape.fill]).toEqual([1, 'red']);
  });

  it('creates styled lines and empty text with styles left absent where omitted', async () => {
    const session = new EditorSession(new SvgDocument());
    await session.execute(new CreateCommand('line', 'l', [0, 0, 1, 1, 'black']));
    await session.execute(new CreateCommand('text', 't', [0, 0, '']));
    expect(session.document?.getShape('l').stroke).toBe('black');
    expect(session.document?.getShape('l').fill).toBeUndefined();
    expect((session.document?.getShape('t') as TextShape).text).toBe('');
  });

  it('deletes a whole nested subtree as one unit and restores all descendants', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('outer', [
      new GroupShape('inner', [new RectShape('r', 1, 2, 3, 4), new TextShape('t', 5, 6, '中文')]),
    ])]));
    const before = session.document?.snapshot();
    await session.execute(new DeleteCommand('outer'));
    expect(session.document?.size).toBe(0);
    expect(session.undoCount).toBe(1);
    expect((await session.undo()).message).toBe('g#outer restored into svg');
    const document = session.document;
    if (document !== undefined && before !== undefined) DocumentAssertions.unchanged(document, before);
  });
});

describe('move feedback and Composite editing', () => {
  it('undoes an extremely small positive scale from snapshots without calculating an infinite inverse', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new RectShape('r', 1, 2, 3, 4)]));
    await session.execute(new ScaleCommand('r', Number.MIN_VALUE));
    const undo = await session.undo();
    expect(undo.message).toBe('rect#r restored after scaling');
    expect(undo.message).not.toContain('Infinity');
    const restored = session.document?.getShape('r') as RectShape;
    expect([restored.x, restored.y, restored.width, restored.height]).toEqual([1, 2, 3, 4]);
  });

  it.each([
    { type: 'rect', parameters: [10, 20, 30, 40], suffix: '(40,15)', before: '(10,20)' },
    { type: 'circle', parameters: [10, 20, 30], suffix: '(40,15)', before: '(10,20)' },
    { type: 'ellipse', parameters: [10, 20, 30, 40], suffix: '(40,15)', before: '(10,20)' },
    { type: 'text', parameters: [10, 20, '中文'], suffix: '(40,15)', before: '(10,20)' },
    { type: 'line', parameters: [10, 20, 30, 40], suffix: '(40,15) -> (60,35)', before: '(10,20) -> (30,40)' },
  ])('reports geometry for $type and undo', async ({ type, parameters, suffix, before }) => {
    const session = new EditorSession(new SvgDocument(100, 200, [factory.create(type, 's', parameters)]));
    expect((await session.execute(new MoveCommand('s', '30', '-5'))).message).toBe(`${type}#s moved to ${suffix}`);
    expect((await session.undo()).message).toBe(`${type}#s moved back to ${before}`);
    expect((await session.redo()).message).toBe(`${type}#s moved to ${suffix}`);
  });

  it('moves and scales nested groups, reporting inverse deltas rather than fictional group positions', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('outer', [new GroupShape('inner', [
      new RectShape('r', 1, 2, 3, 4), new TextShape('t', 5, 6, '中文'),
    ])])]));
    expect((await session.execute(new MoveCommand('outer', 10, 20))).message).toBe('g#outer moved by (10,20)');
    expect((await session.undo()).message).toBe('g#outer moved back by (-10,-20)');
    await session.redo();
    await session.execute(new ScaleCommand('outer', 2));
    const rect = session.document?.getShape('r') as RectShape;
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([22, 44, 6, 8]);
    await session.undo();
    await session.undo();
    expect((session.document?.getShape('r') as RectShape).x).toBe(1);
  });

  it('records unchanged moves as successful edits and invalidates redo', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 1, 2, 3)]));
    await session.execute(new MoveCommand('c', 10, 20));
    await session.undo();
    await session.execute(new MoveCommand('c', 0, 0));
    expect([session.undoCount, session.redoCount]).toEqual([1, 0]);
    await session.undo();
    expect((session.document?.getShape('c') as CircleShape).cx).toBe(1);
  });

  it('records different undo messages when reusing the same move command', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 1, 2, 3)]));
    const move = new MoveCommand('c', 1, 0);
    await session.execute(move);
    await session.execute(move);
    expect((await session.undo()).message).toBe('circle#c moved back to (2,2)');
    expect((await session.undo()).message).toBe('circle#c moved back to (1,2)');
  });
});

const geometryCases = [
  { type: 'rect', attributes: ['x', 'y', 'width', 'height'], parameters: [1, 2, 3, 4] },
  { type: 'circle', attributes: ['cx', 'cy', 'r'], parameters: [1, 2, 3] },
  { type: 'ellipse', attributes: ['cx', 'cy', 'rx', 'ry'], parameters: [1, 2, 3, 4] },
  { type: 'line', attributes: ['x1', 'y1', 'x2', 'y2'], parameters: [1, 2, 3, 4] },
  { type: 'text', attributes: ['x', 'y'], parameters: [1, 2, '中文'] },
];

describe('set values and exact undo', () => {
  it('captures the correct previous value when the same set command is reused', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new TextShape('t', 1, 2, 'original')]));
    const command = new SetCommand('t', 'text', 'changed');
    await session.execute(command);
    await session.execute(command);
    expect((await session.undo()).message).toBe('text#t updated: text="changed"');
    expect((await session.undo()).message).toBe('text#t updated: text="original"');
    expect((session.document?.getShape('t') as TextShape).text).toBe('original');
  });

  for (const { type, attributes, parameters } of geometryCases) {
    it.each(attributes)(`${type} sets %s with normalized numeric feedback`, async attribute => {
      const original = factory.create(type, 's', parameters);
      const expected = original.clone();
      expected.set(attribute, 25);
      const session = new EditorSession(new SvgDocument(100, 200, [original]));
      const result = await session.execute(new SetCommand('s', attribute, '2.5e1'));
      expect(result.message).toBe(`${type}#s updated: ${attribute}=25`);
      expect(session.document?.getShape('s')).toEqual(expected);
      await session.undo();
      expect(session.document?.getShape('s')).toEqual(original);
      await session.redo();
      expect(session.document?.getShape('s')).toEqual(expected);
    });
  }

  for (const { type, parameters } of shapeCases) {
    it.each(['fill', 'stroke', 'stroke-width'])(`${type} restores absent style %s rather than setting a default`, async attribute => {
      const session = new EditorSession(new SvgDocument(100, 200, [factory.create(type, 's', parameters)]));
      const value = attribute === 'stroke-width' ? 1.5 : 'red';
      expect((await session.execute(new SetCommand('s', attribute, value))).message).toBe(`${type}#s updated: ${attribute}=${value}`);
      expect((await session.undo()).message).toBe(`${type}#s updated: ${attribute}=(unset)`);
      expect(session.document?.getShape('s')).toEqual(factory.create(type, 's', parameters));
      await session.redo();
      const expected = factory.create(type, 's', parameters);
      expected.set(attribute, value);
      expect(session.document?.getShape('s')).toEqual(expected);
    });
  }

  it.each(['', 'My Diagram v2', '中文 "引号" & <text>\n第二行'])('sets text %j with single-line quoted feedback', async text => {
    const session = new EditorSession(new SvgDocument(100, 200, [new TextShape('t', 1, 2, 'original')]));
    expect((await session.execute(new SetCommand('t', 'text', text))).message).toBe(`text#t updated: text=${JSON.stringify(text)}`);
    expect((session.document?.getShape('t') as TextShape).text).toBe(text);
    expect((await session.undo()).message).toBe('text#t updated: text="original"');
    await session.redo();
    expect((session.document?.getShape('t') as TextShape).text).toBe(text);
  });

  it('sets a group style without overwriting child styles', async () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    rect.set('fill', 'red');
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('g', [rect])]));
    await session.execute(new SetCommand('g', 'fill', 'blue'));
    expect(session.document?.getShape('g').fill).toBe('blue');
    expect(session.document?.getShape('r').fill).toBe('red');
    await session.undo();
    expect(session.document?.getShape('g').fill).toBeUndefined();
    expect(session.document?.getShape('r').fill).toBe('red');
  });
});

describe('real command failures and history', () => {
  it.each([new MoveCommand('g', Number.MAX_VALUE, 1), new ScaleCommand('g', 2)])('preserves a nested tree and redo when a late child overflows', async command => {
    const session = new EditorSession(new SvgDocument(100, 200, [new GroupShape('g', [
      new RectShape('first', 1, 2, 3, 4),
      new GroupShape('nested', [new CircleShape('huge', Number.MAX_VALUE, 0, 1)]),
    ])]));
    await session.execute(new CreateCommand('g', 'temporary'));
    await session.undo();
    const before = session.document?.snapshot();
    await expect(session.execute(command)).rejects.toThrow('invalid value for cx: Infinity');
    const document = session.document;
    if (document !== undefined && before !== undefined) DocumentAssertions.unchanged(document, before);
    expect([session.undoCount, session.redoCount]).toEqual([0, 1]);
    await session.redo();
    expect(session.document?.find('temporary')).toBeDefined();
  });

  it.each([
    { command: new CreateCommand('box', 'new'), error: 'unknown shape type: box (is the plugin loaded?)' },
    { command: new CreateCommand('g', 'r'), error: 'id already exists: r' },
    { command: new CreateCommand('g', 'new', [], 'missing'), error: 'no such container: missing' },
    { command: new CreateCommand('g', 'new', [], 'r'), error: 'not a container: r' },
    { command: new CreateCommand('rect', 'new', [0, 0, 1]), error: 'invalid arguments. usage: create rect' },
    { command: new CreateCommand('rect', 'new', [0, 0, -1, 1]), error: 'invalid value for width: -1' },
    { command: new CreateCommand('circle', 'new', ['NaN', 0, 1]), error: 'invalid number: NaN' },
    { command: new CreateCommand('g', 'bad id'), error: 'invalid id: bad id' },
    { command: new DeleteCommand('missing'), error: 'no such shape: missing' },
    { command: new MoveCommand('missing', 1, 1), error: 'no such shape: missing' },
    { command: new ScaleCommand('missing', 2), error: 'no such shape: missing' },
    { command: new SetCommand('missing', 'fill', 'red'), error: 'no such shape: missing' },
    { command: new MoveCommand('r', 'bad', 1), error: 'invalid number: bad' },
    { command: new ScaleCommand('r', 0), error: 'scale factor must be positive' },
    { command: new ScaleCommand('r', -1), error: 'scale factor must be positive' },
    { command: new SetCommand('r', 'label', 'x'), error: 'unknown attribute: label' },
    { command: new SetCommand('r', 'id', 'other'), error: 'unknown attribute: id' },
    { command: new SetCommand('r', 'width', -1), error: 'invalid value for width: -1' },
    { command: new MoveCommand('huge', Number.MAX_VALUE, 1), error: 'invalid value for x: Infinity' },
    { command: new ScaleCommand('huge', 2), error: 'invalid value for x: Infinity' },
  ])('preserves state and redo on $error', async ({ command, error }) => {
    const session = new EditorSession(new SvgDocument(100, 200, [new RectShape('r', 1, 2, 3, 4), new RectShape('huge', Number.MAX_VALUE, 0, 1, 1)]), 'original.svg');
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
    new CreateCommand('g', 'g'), new DeleteCommand('r'), new MoveCommand('r', 1, 1),
    new ScaleCommand('r', 2), new SetCommand('r', 'fill', 'red'),
  ])('requires a current document', async command => {
    const session = new EditorSession();
    await expect(session.execute(command)).rejects.toThrow("no document. use 'init' or 'read' first");
    expect([session.undoCount, session.redoCount]).toEqual([0, 0]);
  });

  it('does not unlock an IO barrier on invalid editing but unlocks on successful creation', async () => {
    const session = new EditorSession(new SvgDocument());
    await session.execute(new TestDocumentCommand(() => new CommandResult('saved')));
    await expect(session.execute(new CreateCommand('box', 'bad'))).rejects.toThrow('unknown shape type: box');
    expect(session.historyBlocked).toBe(true);
    await session.execute(new CreateCommand('g', 'good'));
    expect(session.historyBlocked).toBe(false);
    await session.undo();
    expect(session.document?.find('good')).toBeUndefined();
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });
});
