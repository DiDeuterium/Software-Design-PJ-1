import type { Shape } from '../domain/shapes/Shape.js';
import type { RectShape } from '../domain/shapes/RectShape.js';
import type { CircleShape } from '../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../domain/shapes/EllipseShape.js';
import type { LineShape } from '../domain/shapes/LineShape.js';
import type { TextShape } from '../domain/shapes/TextShape.js';
import type { GroupShape } from '../domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../domain/traversal/ShapeVisitor.js';
import { StyleFormatter } from './StyleFormatter.js';

export class ShowFormatter implements ShapeVisitor<string> {
  private readonly styles = new StyleFormatter();

  public format(shape: Shape): string {
    const parent = shape.parent;
    const heading = `${shape.type}#${shape.id}  parent=${parent === undefined ? 'svg' : `${parent.type}#${parent.id}`}`;
    const details = [shape.accept(this), ...this.styles.format(shape)].filter(value => value.length > 0);
    return [heading, ...details.map(value => `  ${value}`)].join('\n');
  }

  public visitRect(s: RectShape): string { return `x=${s.x} y=${s.y} width=${s.width} height=${s.height}`; }
  public visitCircle(s: CircleShape): string { return `cx=${s.cx} cy=${s.cy} r=${s.r}`; }
  public visitEllipse(s: EllipseShape): string { return `cx=${s.cx} cy=${s.cy} rx=${s.rx} ry=${s.ry}`; }
  public visitLine(s: LineShape): string { return `x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2}`; }
  public visitText(s: TextShape): string { return `x=${s.x} y=${s.y} text=${JSON.stringify(s.text)}`; }
  public visitGroup(s: GroupShape): string { return `children=${s.children.length}`; }
}
