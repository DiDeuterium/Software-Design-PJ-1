import { describe, expect, it } from 'vitest';
import { ShapeFactory } from '../../src/domain/factory/ShapeFactory.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { EllipseShape } from '../../src/domain/shapes/EllipseShape.js';
import { LineShape } from '../../src/domain/shapes/LineShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';

const factory = new ShapeFactory();
const cases = [
  { type: 'rect', parameters: ['1', '-2', '3.5', '4'], expected: () => new RectShape('s', 1, -2, 3.5, 4), minimum: 4, maximum: 5 },
  { type: 'circle', parameters: ['1', '-2', '3.5'], expected: () => new CircleShape('s', 1, -2, 3.5), minimum: 3, maximum: 4 },
  { type: 'ellipse', parameters: ['1', '-2', '3.5', '4'], expected: () => new EllipseShape('s', 1, -2, 3.5, 4), minimum: 4, maximum: 5 },
  { type: 'line', parameters: ['1', '-2', '3.5', '4'], expected: () => new LineShape('s', 1, -2, 3.5, 4), minimum: 4, maximum: 5 },
  { type: 'text', parameters: ['1', '-2', '中文 with spaces & < > "quoted"'], expected: () => new TextShape('s', 1, -2, '中文 with spaces & < > "quoted"'), minimum: 3, maximum: 3 },
  { type: 'g', parameters: [], expected: () => new GroupShape('s'), minimum: 0, maximum: 0 },
];

describe.each(cases)('$type factory schema', ({ type, parameters, expected, minimum, maximum }) => {
  it('creates the concrete type and leaves optional styles absent', () => {
    const shape = factory.create(type, 's', parameters);
    expect(shape).toEqual(expected());
    expect(shape.constructor).toBe(expected().constructor);
    expect([shape.fill, shape.stroke, shape.strokeWidth]).toEqual([undefined, undefined, undefined]);
  });

  it('returns independent objects on each construction', () => {
    const first = factory.create(type, 's', parameters);
    const second = factory.create(type, 's', parameters);
    first.set('fill', 'red');
    expect(second.fill).toBeUndefined();
    expect(first).not.toBe(second);
  });

  it('rejects extra parameters with the correct type syntax', () => {
    expect(() => factory.create(type, 's', Array(maximum + 1).fill('1'))).toThrow(`invalid arguments. usage: create ${type}`);
  });

  if (minimum > 0) {
    it('rejects missing required parameters', () => {
      expect(() => factory.create(type, 's', parameters.slice(0, minimum - 1))).toThrow(`invalid arguments. usage: create ${type}`);
    });
  }
});

describe('optional styles and invalid factory input', () => {
  it.each([
    { type: 'rect', parameters: [0, 0, 1, 2] },
    { type: 'circle', parameters: [0, 0, 1] },
    { type: 'ellipse', parameters: [0, 0, 1, 2] },
  ])('sets only the optional fill for $type', ({ type, parameters }) => {
    const shape = factory.create(type, 's', [...parameters, '#4a90d9']);
    expect(shape.fill).toBe('#4a90d9');
    expect(shape.stroke).toBeUndefined();
  });

  it('uses optional line stroke without adding a fill', () => {
    const shape = factory.create('line', 'l', [0, 0, 1, 2, 'black']);
    expect(shape.stroke).toBe('black');
    expect(shape.fill).toBeUndefined();
  });

  it.each(['box', 'hexagon', 'RECT', '__proto__', 'constructor', ''])('rejects unregistered type %j', type => {
    expect(() => factory.create(type, 's')).toThrow(`unknown shape type: ${type} (is the plugin loaded?)`);
  });

  it.each(['', 'NaN', 'Infinity', '1px', '0x10', '1e309'])('rejects malformed/nonfinite geometry %j', value => {
    expect(() => factory.create('rect', 's', [value, 0, 1, 2])).toThrow('invalid number:');
  });

  it('accepts empty or literal in text without treating it as parent syntax', () => {
    expect((factory.create('text', 't', [0, 0, '']) as TextShape).text).toBe('');
    expect((factory.create('text', 't', [0, 0, 'in']) as TextShape).text).toBe('in');
  });

  it('checks ID, nonnegative dimensions and string-valued styles/text', () => {
    expect(() => factory.create('g', 'bad id')).toThrow('invalid id: bad id');
    expect(() => factory.create('circle', 'c', [0, 0, -1])).toThrow('invalid value for r: -1');
    expect(() => factory.create('text', 't', [0, 0, 10])).toThrow('invalid value for text: 10');
    expect(() => factory.create('rect', 'r', [0, 0, 1, 2, 10])).toThrow('invalid value for fill: 10');
  });
});
