import { describe, expect, it } from 'vitest';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { EllipseShape } from '../../src/domain/shapes/EllipseShape.js';
import { LineShape } from '../../src/domain/shapes/LineShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import type { Shape } from '../../src/domain/shapes/Shape.js';

const cases = [
  { type: 'rect', create: () => new RectShape('s', 10, 20, 30, 40), moved: () => new RectShape('s', 12.5, 15, 30, 40), scaled: () => new RectShape('s', 25, 30, 60, 80), geometry: ['x', 'y', 'width', 'height'] },
  { type: 'circle', create: () => new CircleShape('s', 10, 20, 30), moved: () => new CircleShape('s', 12.5, 15, 30), scaled: () => new CircleShape('s', 25, 30, 60), geometry: ['cx', 'cy', 'r'] },
  { type: 'ellipse', create: () => new EllipseShape('s', 10, 20, 30, 40), moved: () => new EllipseShape('s', 12.5, 15, 30, 40), scaled: () => new EllipseShape('s', 25, 30, 60, 80), geometry: ['cx', 'cy', 'rx', 'ry'] },
  { type: 'line', create: () => new LineShape('s', 10, 20, 30, 40), moved: () => new LineShape('s', 12.5, 15, 32.5, 35), scaled: () => new LineShape('s', 25, 30, 65, 70), geometry: ['x1', 'y1', 'x2', 'y2'] },
  { type: 'text', create: () => new TextShape('s', 10, 20, '中文 & <text>'), moved: () => new TextShape('s', 12.5, 15, '中文 & <text>'), scaled: () => new TextShape('s', 25, 30, '中文 & <text>'), geometry: ['x', 'y', 'text'] },
];

describe.each(cases)('$type polymorphic geometry', ({ type, create, moved, scaled, geometry }) => {
  it('moves and scales position and size while preserving text', () => {
    const shape: Shape = create();
    expect(shape.type).toBe(type);
    shape.move(2.5, -5);
    expect(shape).toEqual(moved());
    shape.scale(2);
    expect(shape).toEqual(scaled());
  });

  it('preserves missing style attributes and keeps stroke width unscaled', () => {
    const shape = create();
    expect([shape.fill, shape.stroke, shape.strokeWidth]).toEqual([undefined, undefined, undefined]);
    shape.set('fill', '#ffffff');
    shape.set('stroke', 'red');
    shape.set('stroke-width', '1.5');
    shape.scale(2);
    expect([shape.fill, shape.stroke, shape.strokeWidth]).toEqual(['#ffffff', 'red', 1.5]);
  });

  it('accepts only its own geometry and common style attributes', () => {
    const shape = create();
    for (const attribute of geometry) shape.set(attribute, attribute === 'text' ? '' : '2.5e1');
    const snapshot = shape.clone();
    for (const attribute of ['id', 'transform', 'label', type === 'circle' ? 'x' : 'rubbish']) {
      expect(() => shape.set(attribute, '10')).toThrow(`unknown attribute: ${attribute}`);
      expect(shape).toEqual(snapshot);
    }
  });

  it('clones concrete type, ID, geometry and style without shared state', () => {
    const original = create();
    original.set('fill', 'red');
    original.set('stroke-width', 0);
    const copy = original.clone();
    expect(copy).not.toBe(original);
    expect(copy.constructor).toBe(original.constructor);
    expect(copy).toEqual(original);
    copy.move(5, 7);
    copy.set('fill', 'blue');
    expect(original.fill).toBe('red');
    expect(original).not.toEqual(copy);
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid scale %s without mutations', factor => {
    const shape = create();
    const snapshot = shape.clone();
    expect(() => shape.scale(factor)).toThrow();
    expect(shape).toEqual(snapshot);
  });

  it.each([NaN, Infinity, -Infinity])('rejects invalid move %s without mutations', value => {
    const shape = create();
    const snapshot = shape.clone();
    expect(() => shape.move(1, value)).toThrow();
    expect(() => shape.move(value, 1)).toThrow();
    expect(shape).toEqual(snapshot);
  });
});

describe('value validation and failure atomicity', () => {
  it.each(['', 'two words', 'tab\tid', 'line\nid'])('rejects invalid ID %j', id => {
    expect(() => new TextShape(id, 0, 0, '')).toThrow(`invalid id: ${id}`);
  });

  it('preserves case-sensitive IDs and accepts negative coordinates and zero dimensions', () => {
    expect(new RectShape('R1', -1.5, -2, 0, 0).id).toBe('R1');
    expect(new CircleShape('r1', -1, 0, 0).id).toBe('r1');
    expect(new EllipseShape('e', 0, 0, 0, 0).rx).toBe(0);
  });

  it.each([
    () => new RectShape('r', 0, 0, -1, 1),
    () => new RectShape('r', 0, 0, 1, -1),
    () => new CircleShape('c', 0, 0, -1),
    () => new EllipseShape('e', 0, 0, -1, 1),
    () => new EllipseShape('e', 0, 0, 1, -1),
    () => new LineShape('l', 0, 0, Infinity, 1),
    () => new TextShape('t', 0, NaN, ''),
  ])('rejects invalid construction', create => {
    expect(create).toThrow();
  });

  it.each(['', ' ', 'NaN', 'Infinity', '0x10', '2px', '1 2'])('rejects malformed numeric value %j', value => {
    const shape = new RectShape('r', 1, 2, 3, 4);
    const snapshot = shape.clone();
    expect(() => shape.set('x', value)).toThrow('invalid number:');
    expect(shape).toEqual(snapshot);
  });

  it('rejects negative dimensions and styles without changing existing values', () => {
    const shape = new RectShape('r', 1, 2, 3, 4);
    shape.set('stroke-width', 2);
    const snapshot = shape.clone();
    for (const attribute of ['width', 'height', 'stroke-width']) {
      expect(() => shape.set(attribute, -1)).toThrow(`invalid value for ${attribute}: -1`);
      expect(shape).toEqual(snapshot);
    }
    expect(() => shape.set('fill', 1)).toThrow('invalid value for fill: 1');
    expect(shape).toEqual(snapshot);
  });

  it('validates all line endpoints before committing a move', () => {
    const shape = new LineShape('l', 1, 2, Number.MAX_VALUE, 4);
    const snapshot = shape.clone();
    expect(() => shape.move(Number.MAX_VALUE, 1)).toThrow('invalid value for x2: Infinity');
    expect(shape).toEqual(snapshot);
  });

  it('validates dimensions before committing a scale', () => {
    const shape = new RectShape('r', 1, 2, 3, Number.MAX_VALUE);
    const snapshot = shape.clone();
    expect(() => shape.scale(2)).toThrow('invalid value for height: Infinity');
    expect(shape).toEqual(snapshot);
  });
});
