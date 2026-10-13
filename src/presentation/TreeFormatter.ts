import type { SvgDocument } from '../domain/document/SvgDocument.js';
import type { Shape } from '../domain/shapes/Shape.js';
import type { RectShape } from '../domain/shapes/RectShape.js';
import type { CircleShape } from '../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../domain/shapes/EllipseShape.js';
import type { LineShape } from '../domain/shapes/LineShape.js';
import type { TextShape } from '../domain/shapes/TextShape.js';
import type { GroupShape } from '../domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../domain/traversal/ShapeVisitor.js';
import { StyleFormatter } from './StyleFormatter.js';

export class TreeFormatter implements ShapeVisitor<string> {
  private readonly styles = new StyleFormatter();

  public format(document: SvgDocument, id?: string): string {
    const root = id === undefined ? undefined : document.getShape(id);
    const lines = [root === undefined ? `svg (${document.width}x${document.height})` : root.accept(this)];
    this.appendChildren(root?.children ?? document.roots, '', lines);
    return lines.join('\n');
  }

  public visitRect(s: RectShape): string {
    return this.line(s, `x=${s.x} y=${s.y} w=${s.width} h=${s.height}`);
  }
  public visitCircle(s: CircleShape): string {
    return this.line(s, `cx=${s.cx} cy=${s.cy} r=${s.r}`);
  }
  public visitEllipse(s: EllipseShape): string {
    return this.line(s, `cx=${s.cx} cy=${s.cy} rx=${s.rx} ry=${s.ry}`);
  }
  public visitLine(s: LineShape): string {
    return this.line(s, `(${s.x1},${s.y1}) -> (${s.x2},${s.y2})`);
  }
  public visitText(s: TextShape): string {
    return this.line(s, `(${s.x},${s.y}) ${JSON.stringify(s.text)}`);
  }
  public visitGroup(s: GroupShape): string { return this.line(s); }

  private line(shape: Shape, geometry = ''): string {
    const detail = [geometry, ...this.styles.format(shape)].filter(value => value.length > 0).join(' ');
    return `${shape.type}#${shape.id}${detail.length === 0 ? '' : `  ${detail}`}`;
  }

  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${child.accept(this)}`);
      this.appendChildren(child.children, prefix + (last ? '    ' : '│   '), lines);
    });
  }
}
