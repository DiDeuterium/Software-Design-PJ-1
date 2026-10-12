import { describe, expect, it } from 'vitest';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { DocumentAssertions } from './DocumentAssertions.js';

describe('group placement and relative order', () => {
  it.each(['root', 'nested'])('groups same-parent %s nodes at their earliest position in document order', location => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const gap = new CircleShape('gap', 0, 0, 1);
    const b = new TextShape('b', 0, 0, '');
    const host = new GroupShape('host', location === 'nested' ? [a, gap, b] : []);
    const document = new SvgDocument(100, 100, location === 'nested' ? [host] : [a, gap, b]);
    const group = document.group('new', ['b', 'a']);
    expect(group.children).toEqual([a, b]);
    expect((location === 'nested' ? host.children : document.roots).map(shape => shape.id)).toEqual(['new', 'gap']);
    expect(a.parent).toBe(group);
    DocumentAssertions.consistent(document);
  });

  it('groups cross-parent targets before the earliest affected root, preserving preorder', () => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const b = new CircleShape('b', 0, 0, 1);
    const first = new GroupShape('first', [a, new TextShape('keep1', 0, 0, '')]);
    const second = new GroupShape('second', [b]);
    const bg = new RectShape('bg', 0, 0, 100, 100);
    const document = new SvgDocument(100, 100, [bg, first, second]);
    const group = document.group('new', ['b', 'a']);
    expect(document.roots.map(shape => shape.id)).toEqual(['bg', 'new', 'first', 'second']);
    expect(group.children).toEqual([a, b]);
    expect(first.children.map(shape => shape.id)).toEqual(['keep1']);
    expect(second.children).toEqual([]);
    DocumentAssertions.consistent(document);
  });

  it('handles a mix of selected root nodes and nested nodes without shifting the insertion anchor', () => {
    const root = new RectShape('root', 0, 0, 1, 1);
    const child = new CircleShape('child', 0, 0, 1);
    const host = new GroupShape('host', [child]);
    const document = new SvgDocument(100, 100, [new TextShape('before', 0, 0, ''), root, host]);
    const group = document.group('new', ['child', 'root']);
    expect(document.roots.map(shape => shape.id)).toEqual(['before', 'new', 'host']);
    expect(group.children).toEqual([root, child]);
    DocumentAssertions.consistent(document);
  });

  it('can group sibling containers as intact subtrees', () => {
    const first = new GroupShape('first', [new CircleShape('c', 0, 0, 1)]);
    const second = new GroupShape('second');
    const document = new SvgDocument(100, 100, [first, second]);
    const group = document.group('new', ['second', 'first']);
    expect(group.children).toEqual([first, second]);
    expect(document.getShape('c').parent).toBe(first);
    expect(document.size).toBe(4);
    DocumentAssertions.consistent(document);
  });

  it.each([
    { name: 'duplicate targets', newId: 'new', ids: ['a', 'a'], message: 'duplicate group target: a' },
    { name: 'new ID collision', newId: 'a', ids: ['a'], message: 'id already exists: a' },
    { name: 'missing target', newId: 'new', ids: ['a', 'missing'], message: 'no such shape: missing' },
    { name: 'ancestor and descendant', newId: 'new', ids: ['a', 'host'], message: 'cannot group a container into its own descendant: host' },
    { name: 'empty targets', newId: 'new', ids: [], message: 'group requires at least one shape' },
    { name: 'invalid new ID', newId: 'bad id', ids: ['a'], message: 'invalid id: bad id' },
  ])('rejects $name before modifying tree or index', ({ newId, ids, message }) => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const host = new GroupShape('host', [a]);
    const document = new SvgDocument(100, 100, [host]);
    const snapshot = document.snapshot();
    expect(() => document.group(newId, ids)).toThrow(message);
    expect(document.getShape('a')).toBe(a);
    expect(a.parent).toBe(host);
    DocumentAssertions.unchanged(document, snapshot);
  });
});

describe('ungroup', () => {
  it('promotes children in place, clears the detached group, and removes only its ID', () => {
    const a = new RectShape('a', 0, 0, 1, 1);
    const b = new CircleShape('b', 0, 0, 1);
    const nested = new GroupShape('nested', [a, b]);
    const host = new GroupShape('host', [new TextShape('before', 0, 0, ''), nested, new TextShape('after', 0, 0, '')]);
    const document = new SvgDocument(100, 100, [host]);
    expect(document.ungroup('nested')).toBe(nested);
    expect(host.children.map(shape => shape.id)).toEqual(['before', 'a', 'b', 'after']);
    expect(nested.children).toEqual([]);
    expect(nested.parent).toBeUndefined();
    expect(document.find('nested')).toBeUndefined();
    expect(document.getShape('a')).toBe(a);
    document.insert(nested);
    DocumentAssertions.consistent(document);
  });

  it('removes an empty nested group at its original position', () => {
    const empty = new GroupShape('empty');
    const host = new GroupShape('host', [empty, new CircleShape('c', 0, 0, 1)]);
    const document = new SvgDocument(100, 100, [host]);
    document.ungroup('empty');
    expect(host.children.map(shape => shape.id)).toEqual(['c']);
    expect(document.size).toBe(2);
    DocumentAssertions.consistent(document);
  });

  it.each([
    { id: 'host', message: 'cannot ungroup top-level container: host' },
    { id: 'leaf', message: 'not a container: leaf' },
    { id: 'missing', message: 'no such shape: missing' },
  ])('rejects $id without changing state', ({ id, message }) => {
    const document = new SvgDocument(100, 100, [new GroupShape('host', [new CircleShape('leaf', 0, 0, 1)])]);
    const snapshot = document.snapshot();
    expect(() => document.ungroup(id)).toThrow(message);
    DocumentAssertions.unchanged(document, snapshot);
  });
});

describe('document clone and snapshots', () => {
  it('clones a complete document into independent types, styles, parents, order and index', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    rect.set('fill', 'red');
    const original = new SvgDocument(123.5, 456.25, [new GroupShape('g', [rect, new TextShape('t', 0, 0, '中文')])]);
    const copy = original.clone();
    expect(copy.roots).toEqual(original.roots);
    expect([copy.width, copy.height]).toEqual([123.5, 456.25]);
    expect(copy.getShape('r')).toBeInstanceOf(RectShape);
    expect(copy.getShape('r')).not.toBe(rect);
    copy.move('g', 100, 200);
    copy.set('r', 'fill', 'blue');
    copy.delete('t');
    expect([rect.x, rect.y, rect.fill, original.size]).toEqual([1, 2, 'red', 3]);
    DocumentAssertions.consistent(original);
    DocumentAssertions.consistent(copy);
  });

  it('restores geometry, canvas, parent, order and removed IDs from the same opaque snapshot repeatedly', () => {
    const originalRect = new RectShape('r', 1, 2, 3, 4);
    const document = new SvgDocument(123, 456, [new GroupShape('g', [originalRect]), new CircleShape('c', 0, 0, 1)]);
    const snapshot = document.snapshot();
    document.resize(1000, 2000);
    document.addTo('g', 'c');
    document.move('g', 10, 20);
    document.delete('r');
    document.restore(snapshot);
    DocumentAssertions.unchanged(document, snapshot);
    expect(document.getShape('r')).not.toBe(originalRect);
    expect(originalRect.parent).toBeUndefined();
    const firstRestoredRect = document.getShape('r');
    document.set('r', 'fill', 'blue');
    document.restore(snapshot);
    expect(document.getShape('r')).not.toBe(firstRestoredRect);
    expect(document.getShape('r').fill).toBeUndefined();
    expect(document.roots.map(shape => shape.id)).toEqual(['g', 'c']);
    expect(document.getShape('r').parent).toBe(document.getShape('g'));
    DocumentAssertions.unchanged(document, snapshot);
  });

  it('returns independent documents and root copies from every snapshot materialization', () => {
    const document = new SvgDocument(100, 200, [new CircleShape('c', 1, 2, 3)]);
    const snapshot = document.snapshot();
    const first = snapshot.restore();
    const second = snapshot.restore();
    const roots = snapshot.copyRoots();
    roots[0]?.move(100, 200);
    first.set('c', 'r', 9);
    first.delete('c');
    expect((second.getShape('c') as CircleShape).r).toBe(3);
    expect((snapshot.restore().getShape('c') as CircleShape).cx).toBe(1);
    DocumentAssertions.consistent(document);
    DocumentAssertions.consistent(second);
  });

  it('releases old restored trees so they can be reused without sharing document ownership', () => {
    const oldChild = new CircleShape('c', 1, 2, 3);
    const oldRoot = new GroupShape('g', [oldChild]);
    const document = new SvgDocument(100, 100, [oldRoot]);
    const snapshot = document.snapshot();
    document.restore(snapshot);
    const another = new SvgDocument(200, 200, [oldRoot]);
    expect(oldChild.parent).toBe(oldRoot);
    expect(another.getShape('c')).toBe(oldChild);
    expect(document.getShape('c')).not.toBe(oldChild);
    another.move('g', 10, 20);
    expect((document.getShape('c') as CircleShape).cx).toBe(1);
    DocumentAssertions.consistent(document);
    DocumentAssertions.consistent(another);
  });
});
