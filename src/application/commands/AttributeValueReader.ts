import type { Shape } from '../../domain/shapes/Shape.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../../domain/traversal/ShapeVisitor.js';

export class AttributeValueReader implements ShapeVisitor<string | number | undefined> {
  private readonly attribute: string;

  public constructor(attribute: string) { this.attribute = attribute; }

  public read(shape: Shape): string | number | undefined {
    if (this.attribute === 'fill') return shape.fill;
    if (this.attribute === 'stroke') return shape.stroke;
    if (this.attribute === 'stroke-width') return shape.strokeWidth;
    return shape.accept(this);
  }

  public visitRect(shape: RectShape): number | undefined {
    return this.value({ x: shape.x, y: shape.y, width: shape.width, height: shape.height });
  }
  public visitCircle(shape: CircleShape): number | undefined {
    return this.value({ cx: shape.cx, cy: shape.cy, r: shape.r });
  }
  public visitEllipse(shape: EllipseShape): number | undefined {
    return this.value({ cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry });
  }
  public visitLine(shape: LineShape): number | undefined {
    return this.value({ x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2 });
  }
  public visitText(shape: TextShape): string | number | undefined {
    return this.value({ x: shape.x, y: shape.y, text: shape.text });
  }
  public visitGroup(_shape: GroupShape): undefined { return undefined; }

  private value<T extends string | number>(attributes: Readonly<Record<string, T>>): T | undefined {
    return attributes[this.attribute];
  }
}
