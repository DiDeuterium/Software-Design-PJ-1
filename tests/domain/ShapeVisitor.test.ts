import { expect, it } from 'vitest';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { EllipseShape } from '../../src/domain/shapes/EllipseShape.js';
import { LineShape } from '../../src/domain/shapes/LineShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../../src/domain/traversal/ShapeVisitor.js';

it('routes every concrete type and visits nested children in order without tag dispatch', () => {
  const visitor: ShapeVisitor<readonly string[]> = {
    visitRect: shape => [`rect:${shape.id}:${shape.width}`],
    visitCircle: shape => [`circle:${shape.id}:${shape.r}`],
    visitEllipse: shape => [`ellipse:${shape.id}:${shape.ry}`],
    visitLine: shape => [`line:${shape.id}:${shape.x2}`],
    visitText: shape => [`text:${shape.id}:${shape.text}`],
    visitGroup: shape => [`g:${shape.id}`, ...shape.children.flatMap(child => child.accept(visitor))],
  };
  const group = new GroupShape('root', [
    new RectShape('r', 0, 0, 3, 4),
    new GroupShape('nested', [new CircleShape('c', 0, 0, 5), new EllipseShape('e', 0, 0, 6, 7)]),
    new LineShape('l', 0, 0, 8, 9),
    new TextShape('t', 0, 0, '中文'),
  ]);
  expect(group.accept(visitor)).toEqual(['g:root', 'rect:r:3', 'g:nested', 'circle:c:5', 'ellipse:e:7', 'line:l:8', 'text:t:中文']);
});
