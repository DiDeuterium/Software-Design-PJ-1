import { describe, expect, it } from 'vitest';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { DocumentAssertions } from './DocumentAssertions.js';

describe('canvas and document index', () => {
  it('starts with the default canvas and no addressable root shape', () => {
    const document = new SvgDocument();
    expect([document.width, document.height, document.size]).toEqual([800, 600, 0]);
    expect(document.roots).toEqual([]);
    expect(document.find('svg')).toBeUndefined();
    DocumentAssertions.consistent(document);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid canvas size %s', value => {
    expect(() => new SvgDocument(value, 1)).toThrow();
    expect(() => new SvgDocument(1, value)).toThrow();
    const document = new SvgDocument(100.5, 200.5);
    const snapshot = document.snapshot();
    expect(() => document.resize(300, value)).toThrow();
    DocumentAssertions.unchanged(document, snapshot);
  });

  it('resizes using floating point dimensions without editing shapes', () => {
    const rect = new RectShape('r', 10, 20, 30, 40);
    const document = new SvgDocument(100, 200, [rect]);
    document.resize(300.5, 400.25);
    expect([document.width, document.height]).toEqual([300.5, 400.25]);
    expect(document.getShape('r')).toBe(rect);
    expect(rect.width).toBe(30);
    DocumentAssertions.consistent(document);
  });

  it('indexes nested shapes, preserves case, and copies the root array', () => {
    const lower = new CircleShape('r', 0, 0, 1);
    const upper = new RectShape('R', 0, 0, 1, 1);
    const group = new GroupShape('g', [lower]);
    const roots = [upper, group];
    const document = new SvgDocument(100, 200, roots);
    roots.length = 0;
    expect(document.size).toBe(3);
    expect(document.getShape('r')).toBe(lower);
    expect(document.getShape('R')).toBe(upper);
    expect(() => document.getShape('missing')).toThrow('no such shape: missing');
    DocumentAssertions.consistent(document);
  });

  it('rejects duplicate IDs across roots before adopting any root', () => {
    const rect = new RectShape('r', 0, 0, 1, 1);
    const group = new GroupShape('g', [new CircleShape('r', 0, 0, 1)]);
    expect(() => new SvgDocument(100, 100, [rect, group])).toThrow('id already exists: r');
    expect(rect.parent).toBeUndefined();
    expect(group.parent).toBeUndefined();
    // Failed construction must not prevent later adoption by another document.
    const document = new SvgDocument(100, 100, [rect]);
    DocumentAssertions.consistent(document);
  });
});

describe('insertion, subtree deletion and ownership', () => {
  it('inserts into root and nested containers at explicit positions', () => {
    const document = new SvgDocument();
    const group = new GroupShape('g');
    document.insert(group);
    const a = new RectShape('a', 0, 0, 1, 1);
    const b = new CircleShape('b', 0, 0, 1);
    document.insert(a, 'g');
    document.insert(b, 'g', 0);
    document.insert(new TextShape('root', 0, 0, ''), undefined, 0);
    expect(document.roots.map(shape => shape.id)).toEqual(['root', 'g']);
    expect(group.children.map(shape => shape.id)).toEqual(['b', 'a']);
    DocumentAssertions.consistent(document);
  });

  it.each([
    { parent: 'missing', position: undefined, message: 'no such container: missing' },
    { parent: 'leaf', position: undefined, message: 'not a container: leaf' },
    { parent: undefined, position: -1, message: 'invalid insertion index: -1' },
    { parent: undefined, position: 99, message: 'invalid insertion index: 99' },
    { parent: undefined, position: 0.5, message: 'invalid insertion index: 0.5' },
  ])('rejects invalid insertion without modifying state: $message', ({ parent, position, message }) => {
    const leaf = new RectShape('leaf', 0, 0, 1, 1);
    const document = new SvgDocument(100, 100, [leaf]);
    const snapshot = document.snapshot();
    const candidate = new CircleShape('candidate', 0, 0, 1);
    expect(() => document.insert(candidate, parent, position)).toThrow(message);
    expect(candidate.parent).toBeUndefined();
    DocumentAssertions.unchanged(document, snapshot);
  });

  it('rejects a collision deep in an incoming subtree without partial adoption', () => {
    const document = new SvgDocument(100, 100, [new RectShape('taken', 0, 0, 1, 1)]);
    const snapshot = document.snapshot();
    const child = new CircleShape('taken', 0, 0, 1);
    const candidate = new GroupShape('candidate', [child]);
    expect(() => document.insert(candidate)).toThrow('id already exists: taken');
    expect(candidate.parent).toBeUndefined();
    expect(child.parent).toBe(candidate);
    expect(document.find('candidate')).toBeUndefined();
    DocumentAssertions.unchanged(document, snapshot);
  });

  it('deletes an entire nested subtree and can reinsert it with the same object identities', () => {
    const leaf = new RectShape('leaf', 0, 0, 1, 1);
    const removed = new GroupShape('removed', [leaf]);
    const host = new GroupShape('host', [removed, new CircleShape('keep', 0, 0, 1)]);
    const document = new SvgDocument(100, 100, [host]);
    expect(document.delete('removed')).toBe(removed);
    expect(document.size).toBe(2);
    expect(document.find('removed')).toBeUndefined();
    expect(document.find('leaf')).toBeUndefined();
    expect(removed.parent).toBeUndefined();
    expect(leaf.parent).toBe(removed);
    document.insert(removed, 'host', 0);
    expect(document.getShape('leaf')).toBe(leaf);
    expect(host.children.map(shape => shape.id)).toEqual(['removed', 'keep']);
    DocumentAssertions.consistent(document);
  });

  it('deletes roots, releases ownership, and permits moving a removed subtree to another document', () => {
    const group = new GroupShape('g', [new CircleShape('c', 0, 0, 1)]);
    const source = new SvgDocument(100, 100, [group]);
    const target = new SvgDocument();
    source.delete('g');
    target.insert(group);
    expect(source.size).toBe(0);
    expect(target.size).toBe(2);
    DocumentAssertions.consistent(source);
    DocumentAssertions.consistent(target);
  });

  it('prevents sharing document-owned roots across documents or standalone groups', () => {
    const root = new RectShape('r', 0, 0, 1, 1);
    const source = new SvgDocument(100, 100, [root]);
    const target = new SvgDocument();
    expect(() => target.insert(root)).toThrow('shape already belongs to a document: r');
    expect(() => new GroupShape('g', [root])).toThrow('shape already belongs to a document: r');
    expect(() => new SvgDocument(100, 100, [root])).toThrow('shape already belongs to a document: r');
    DocumentAssertions.consistent(source);
    DocumentAssertions.consistent(target);
  });

  it('rejects attached nodes and missing delete IDs without changing either tree', () => {
    const child = new CircleShape('c', 0, 0, 1);
    const group = new GroupShape('g', [child]);
    const document = new SvgDocument();
    expect(() => document.insert(child)).toThrow('shape already has a parent: c');
    expect(() => document.delete('missing')).toThrow('no such shape: missing');
    expect(child.parent).toBe(group);
    expect(document.size).toBe(0);
  });
});

describe('migration and drawing order', () => {
  it.each([
    { target: 'missing', id: 'leaf', message: 'no such container: missing' },
    { target: 'leaf', id: 'host', message: 'not a container: leaf' },
    { target: 'host', id: 'missing', message: 'no such shape: missing' },
  ])('rejects invalid migration: $message', ({ target, id, message }) => {
    const document = new SvgDocument(100, 100, [new GroupShape('host', [new CircleShape('leaf', 0, 0, 1)])]);
    const snapshot = document.snapshot();
    expect(() => document.addTo(target, id)).toThrow(message);
    DocumentAssertions.unchanged(document, snapshot);
  });

  it('moves existing nodes between containers and root while keeping references and IDs', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    const first = new GroupShape('first', [rect]);
    const second = new GroupShape('second');
    const rootLeaf = new CircleShape('rootLeaf', 0, 0, 1);
    const document = new SvgDocument(100, 100, [first, second, rootLeaf]);
    document.addTo('second', 'r');
    document.addTo('second', 'rootLeaf');
    expect(first.children).toEqual([]);
    expect(second.children.map(shape => shape.id)).toEqual(['r', 'rootLeaf']);
    expect(document.getShape('r')).toBe(rect);
    expect(rect.parent).toBe(second);
    expect(document.roots.map(shape => shape.id)).toEqual(['first', 'second']);
    DocumentAssertions.consistent(document);
  });

  it('moves an already-owned child to the last position of the same container', () => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const b = new CircleShape('b', 0, 0, 1);
    const group = new GroupShape('g', [a, b]);
    const document = new SvgDocument(100, 100, [group]);
    document.addTo('g', 'a');
    expect(group.children).toEqual([b, a]);
    expect(document.size).toBe(3);
    DocumentAssertions.consistent(document);
  });

  it.each(['outer', 'inner'])('rejects self/descendant migration to %s without changes', target => {
    const inner = new GroupShape('inner');
    const outer = new GroupShape('outer', [inner]);
    const document = new SvgDocument(100, 100, [outer]);
    const snapshot = document.snapshot();
    expect(() => document.addTo(target, 'outer')).toThrow('cannot add a container into itself or its descendant: outer');
    DocumentAssertions.unchanged(document, snapshot);
  });

  it.each(['root', 'nested'])('front/back only reorder the %s sibling list', location => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const b = new CircleShape('b', 0, 0, 1);
    const c = new TextShape('c', 0, 0, '');
    const group = new GroupShape('g', location === 'nested' ? [a, b, c] : []);
    const document = new SvgDocument(100, 100, location === 'nested' ? [group] : [a, b, c, group]);
    document.front('b');
    const frontOrder = (location === 'nested' ? group.children : document.roots).map(shape => shape.id);
    expect(frontOrder).toEqual(location === 'nested' ? ['a', 'c', 'b'] : ['a', 'c', 'g', 'b']);
    document.back('b');
    expect((location === 'nested' ? group.children : document.roots).map(shape => shape.id)).toEqual(location === 'nested' ? ['b', 'a', 'c'] : ['b', 'a', 'c', 'g']);
    document.back('b');
    expect(document.getShape('b')).toBe(b);
    DocumentAssertions.consistent(document);
  });

  it('delegates document geometry edits to the existing polymorphic shape', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    const group = new GroupShape('g', [rect]);
    const document = new SvgDocument(100, 100, [group]);
    document.move('g', 1, -1);
    document.scale('g', 2);
    document.set('r', 'fill', 'red');
    expect([rect.x, rect.y, rect.width, rect.height, rect.fill]).toEqual([4, 2, 6, 8, 'red']);
    const snapshot = document.snapshot();
    expect(() => document.set('r', 'width', -1)).toThrow();
    DocumentAssertions.unchanged(document, snapshot);
  });
});
