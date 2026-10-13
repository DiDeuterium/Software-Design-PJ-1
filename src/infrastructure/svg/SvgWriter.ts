import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { Shape } from '../../domain/shapes/Shape.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../../domain/traversal/ShapeVisitor.js';
import { XmlText } from './XmlText.js';

export class SvgWriter implements ShapeVisitor<string> {
  private readonly depth: number;

  public constructor(depth = 0) { this.depth = depth; }

  public write(document: SvgDocument): string {
    const visitor = new SvgWriter(1);
    const body = document.roots.map(shape => shape.accept(visitor)).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + document.width +
      '" height="' + document.height + '" viewBox="0 0 ' + document.width + ' ' + document.height + '">' +
      (body.length === 0 ? '' : '\n' + body) + '\n</svg>\n';
  }

  public visitRect(s: RectShape): string {
    return this.leaf(s, { x: s.x, y: s.y, width: s.width, height: s.height });
  }
  public visitCircle(s: CircleShape): string { return this.leaf(s, { cx: s.cx, cy: s.cy, r: s.r }); }
  public visitEllipse(s: EllipseShape): string { return this.leaf(s, { cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry }); }
  public visitLine(s: LineShape): string { return this.leaf(s, { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }); }
  public visitText(s: TextShape): string {
    return this.indent() + '<text' + this.attributes(s, { x: s.x, y: s.y }) + '>' + XmlText.encode(s.text) + '</text>';
  }
  public visitGroup(s: GroupShape): string {
    if (s.children.length === 0) return this.leaf(s, {});
    const visitor = new SvgWriter(this.depth + 1);
    const body = s.children.map(shape => shape.accept(visitor)).join('\n');
    return this.indent() + '<g' + this.attributes(s, {}) + '>\n' + body + '\n' + this.indent() + '</g>';
  }

  private leaf(shape: Shape, geometry: Readonly<Record<string, number>>): string {
    return this.indent() + '<' + shape.type + this.attributes(shape, geometry) + '/>';
  }

  private attributes(shape: Shape, geometry: Readonly<Record<string, number>>): string {
    const entries: (readonly [string, string | number | undefined])[] = [
      ['id', shape.id], ...Object.entries(geometry), ['fill', shape.fill],
      ['stroke', shape.stroke], ['stroke-width', shape.strokeWidth],
    ];
    return entries.filter(([, value]) => value !== undefined)
      .map(([name, value]) => ' ' + name + '="' + XmlText.encode(String(value), true) + '"').join('');
  }

  private indent(): string {
    // Prefix the element only: never insert whitespace inside a text node.
    return '  '.repeat(this.depth);
  }
}
