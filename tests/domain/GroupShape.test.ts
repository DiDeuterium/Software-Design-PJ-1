import { describe, expect, it } from 'vitest';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';

describe('Composite geometry and styles', () => {
  it('recursively moves and scales nested groups without replacing child objects', () => {
    const rect = new RectShape('r', 10, 20, 30, 40);
    const text = new TextShape('t', 15, 30, '标题');
    const inner = new GroupShape('inner', [rect, text]);
    const circle = new CircleShape('c', 0, 0, 5);
    const outer = new GroupShape('outer', [inner, circle]);
    outer.move(2, -3);
    outer.scale(0.5);
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([6, 8.5, 15, 20]);
    expect([text.x, text.y, text.text]).toEqual([8.5, 13.5, '标题']);
    expect([circle.cx, circle.cy, circle.r]).toEqual([1, -1.5, 2.5]);
    expect(outer.children[0]).toBe(inner);
    expect(inner.children[0]).toBe(rect);
    expect(rect.parent).toBe(inner);
    expect(inner.parent).toBe(outer);
  });

  it('sets group style without overwriting explicit or missing child styles', () => {
    const rect = new RectShape('r', 0, 0, 1, 1);
    rect.set('fill', 'red');
    const circle = new CircleShape('c', 0, 0, 1);
    const group = new GroupShape('g', [rect, circle]);
    group.set('fill', 'blue');
    group.set('stroke-width', 3);
    expect(group.fill).toBe('blue');
    expect(group.strokeWidth).toBe(3);
    expect(rect.fill).toBe('red');
    expect(circle.fill).toBeUndefined();
    expect(() => group.set('x', 1)).toThrow('unknown attribute: x');
  });

  it('does not partially move earlier children when a nested later child overflows', () => {
    const first = new RectShape('first', 1, 2, 3, 4);
    const last = new CircleShape('last', Number.MAX_VALUE, 0, 1);
    const inner = new GroupShape('inner', [last]);
    const group = new GroupShape('g', [first, inner]);
    const snapshot = group.clone();
    expect(() => group.move(Number.MAX_VALUE, 1)).toThrow('invalid value for cx: Infinity');
    expect(group).toEqual(snapshot);
    expect(first.x).toBe(1);
  });

  it('does not partially scale earlier children when a nested dimension overflows', () => {
    const first = new RectShape('first', 1, 2, 3, 4);
    const last = new CircleShape('last', 1, 2, Number.MAX_VALUE);
    const group = new GroupShape('g', [first, new GroupShape('inner', [last])]);
    const snapshot = group.clone();
    expect(() => group.scale(2)).toThrow('invalid value for r: Infinity');
    expect(group).toEqual(snapshot);
  });

  it('supports empty groups but still checks move and scale parameters', () => {
    const group = new GroupShape('g');
    group.move(-1, 2.5);
    group.scale(1);
    expect(group.children).toEqual([]);
    expect(() => group.move(Infinity, 0)).toThrow('invalid number: Infinity');
    expect(() => group.scale(0)).toThrow('scale factor must be positive');
  });
});

describe('encapsulated child ownership and cloning', () => {
  it('copies and freezes the child array so external edits cannot change group structure', () => {
    const rect = new RectShape('r', 0, 0, 1, 1);
    const input = [rect];
    const group = new GroupShape('g', input);
    input.length = 0;
    expect(group.children).toEqual([rect]);
    expect(Object.isFrozen(group.children)).toBe(true);
    expect(() => Reflect.set(group.children, 'length', 0)).not.toThrow();
    expect(group.children).toHaveLength(1);
  });

  it('rejects duplicate IDs throughout a candidate subtree before assigning any new parent', () => {
    const free = new RectShape('free', 0, 0, 1, 1);
    const nested = new GroupShape('nested', [new CircleShape('same', 0, 0, 1)]);
    const duplicate = new TextShape('same', 0, 0, '');
    expect(() => new GroupShape('g', [free, nested, duplicate])).toThrow('id already exists: same');
    expect(free.parent).toBeUndefined();
    expect(nested.parent).toBeUndefined();
    expect(duplicate.parent).toBeUndefined();
  });

  it('rejects a child ID equal to its parent and repeated child references', () => {
    const rect = new RectShape('r', 0, 0, 1, 1);
    expect(() => new GroupShape('r', [rect])).toThrow('id already exists: r');
    expect(() => new GroupShape('g', [rect, rect])).toThrow('id already exists: r');
    expect(rect.parent).toBeUndefined();
  });

  it('rejects adopting an already owned node and leaves other candidates detached', () => {
    const owned = new RectShape('r', 0, 0, 1, 1);
    const owner = new GroupShape('owner', [owned]);
    const free = new CircleShape('c', 0, 0, 1);
    expect(() => new GroupShape('other', [free, owned])).toThrow('shape already has a parent: r');
    expect(owned.parent).toBe(owner);
    expect(free.parent).toBeUndefined();
  });

  it('deep-clones concrete classes, order, styles and parent links into an independent tree', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    rect.set('fill', 'red');
    const nested = new GroupShape('inner', [rect, new TextShape('t', 5, 6, '')]);
    const original = new GroupShape('g', [nested, new CircleShape('c', 7, 8, 9)]);
    original.set('stroke', 'black');
    const copy = original.clone();
    expect(copy).toEqual(original);
    expect(copy.parent).toBeUndefined();
    expect(copy.children.map(child => child.id)).toEqual(['inner', 'c']);
    expect(copy.children[0]).not.toBe(nested);
    const copiedRect = copy.children[0]?.children[0];
    expect(copiedRect).toBeInstanceOf(RectShape);
    expect(copiedRect).not.toBe(rect);
    expect(copiedRect?.parent).toBe(copy.children[0]);
    expect(copy.children[0]?.parent).toBe(copy);
    copy.move(10, 20);
    copiedRect?.set('fill', 'blue');
    expect([rect.x, rect.y, rect.fill]).toEqual([1, 2, 'red']);
    expect(original.stroke).toBe('black');
  });
});
