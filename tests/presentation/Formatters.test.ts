import { describe, expect, it } from 'vitest';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { EllipseShape } from '../../src/domain/shapes/EllipseShape.js';
import { LineShape } from '../../src/domain/shapes/LineShape.js';
import { TextShape } from '../../src/domain/shapes/TextShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { TreeFormatter } from '../../src/presentation/TreeFormatter.js';
import { ShowFormatter } from '../../src/presentation/ShowFormatter.js';
import { HelpFormatter } from '../../src/presentation/HelpFormatter.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

describe('presentation visitors', () => {
  it('renders a whole tree, nested branch connectors and every geometry type without changing state', () => {
    const rectangle = new RectShape('bg', 0, 0, 800, 600);
    rectangle.set('fill', '#ffffff');
    const circle = new CircleShape('c', 1, 2, 3);
    circle.set('stroke-width', 0);
    const text = new TextShape('t', 5, 6, '中文 "标题"\nnext');
    const group = new GroupShape('g', [circle, new GroupShape('nested', [text]), new LineShape('l', 1, 2, 3, 4)]);
    group.set('fill', 'red');
    const document = new SvgDocument(800, 600, [rectangle, group, new EllipseShape('e', 10, 20, 30, 40)]);
    const before = document.snapshot();
    const formatter = new TreeFormatter();
    expect(formatter.format(document)).toBe([
      'svg (800x600)',
      '├── rect#bg  x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── g#g  fill=red',
      '│   ├── circle#c  cx=1 cy=2 r=3 stroke-width=0',
      '│   ├── g#nested',
      '│   │   └── text#t  (5,6) "中文 \\"标题\\"\\nnext"',
      '│   └── line#l  (1,2) -> (3,4)',
      '└── ellipse#e  cx=10 cy=20 rx=30 ry=40',
    ].join('\n'));
    expect(formatter.format(document, 'nested')).toBe('g#nested\n└── text#t  (5,6) "中文 \\"标题\\"\\nnext"');
    expect(formatter.format(document, 'c')).toBe('circle#c  cx=1 cy=2 r=3 stroke-width=0');
    DocumentAssertions.unchanged(document, before);
  });

  it('prints empty canvas and group without fabricated attributes or children', () => {
    const formatter = new TreeFormatter();
    expect(formatter.format(new SvgDocument())).toBe('svg (800x600)');
    expect(formatter.format(new SvgDocument(1, 2, [new GroupShape('empty')]), 'empty')).toBe('g#empty');
    expect(() => formatter.format(new SvgDocument(), 'missing')).toThrow('no such shape: missing');
  });

  it.each([
    [new RectShape('r', 1, 2, 3, 4), 'x=1 y=2 width=3 height=4'],
    [new CircleShape('c', 1, 2, 3), 'cx=1 cy=2 r=3'],
    [new EllipseShape('e', 1, 2, 3, 4), 'cx=1 cy=2 rx=3 ry=4'],
    [new LineShape('l', 1, 2, 3, 4), 'x1=1 y1=2 x2=3 y2=4'],
    [new TextShape('t', 1, 2, ''), 'x=1 y=2 text=""'],
    [new GroupShape('g'), 'children=0'],
  ])('shows complete own attributes for %s', (shape, geometry) => {
    const formatter = new ShowFormatter();
    expect(formatter.format(shape)).toBe(shape.type + '#' + shape.id + '  parent=svg\n  ' + geometry);
    shape.set('fill', 'red');
    shape.set('stroke', 'rgb(1, 2, 3)');
    shape.set('stroke-width', 0.5);
    expect(formatter.format(shape)).toContain('\n  fill=red\n  stroke="rgb(1, 2, 3)"\n  stroke-width=0.5');
  });

  it('shows real parent and only explicitly set styles', () => {
    const child = new CircleShape('c', 1, 2, 3);
    const parent = new GroupShape('markers', [child]);
    parent.set('fill', 'red');
    const formatter = new ShowFormatter();
    expect(formatter.format(child)).toBe('circle#c  parent=g#markers\n  cx=1 cy=2 r=3');
    expect(formatter.format(parent)).toBe('g#markers  parent=svg\n  children=1\n  fill=red');
  });

  it('lists all commands while identifying pending persistence', () => {
    const help = new HelpFormatter().format();
    for (const name of ['init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set',
      'group', 'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo']) {
      expect(help).toContain(name);
    }
    expect(help).toContain('pending SVG persistence phase');
  });
});
