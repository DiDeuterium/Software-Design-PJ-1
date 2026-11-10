import type { Shape } from '../../domain/shapes/Shape.js';
import type { RectShape } from '../../domain/shapes/RectShape.js';
import type { CircleShape } from '../../domain/shapes/CircleShape.js';
import type { EllipseShape } from '../../domain/shapes/EllipseShape.js';
import type { LineShape } from '../../domain/shapes/LineShape.js';
import type { TextShape } from '../../domain/shapes/TextShape.js';
import type { GroupShape } from '../../domain/shapes/GroupShape.js';
import type { ShapeVisitor } from '../../domain/traversal/ShapeVisitor.js';

/** Operation-specific feedback through Visitor, never a second type dispatcher. */
export class MoveDescription implements ShapeVisitor<string> {
  private readonly dx: number;
  private readonly dy: number;
  private readonly inverse: boolean;

  public constructor(dx: number, dy: number, inverse = false) {
    this.dx = dx;
    this.dy = dy;
    this.inverse = inverse;
  }

  public describe(shape: Shape): string { return shape.accept(this); }
  public visitRect(shape: RectShape): string { return this.point(shape, shape.x, shape.y); }
  public visitCircle(shape: CircleShape): string { return this.point(shape, shape.cx, shape.cy); }
  public visitEllipse(shape: EllipseShape): string { return this.point(shape, shape.cx, shape.cy); }
  public visitText(shape: TextShape): string { return this.point(shape, shape.x, shape.y); }

  public visitLine(shape: LineShape): string {
    return `${this.prefix(shape)} to (${shape.x1},${shape.y1}) -> (${shape.x2},${shape.y2})`;
  }

  public visitGroup(shape: GroupShape): string {
    return `${this.prefix(shape)} by (${this.dx},${this.dy})`;
  }

  private prefix(shape: Shape): string { return `${shape.type}#${shape.id} moved${this.inverse ? ' back' : ''}`; }
  private point(shape: Shape, x: number, y: number): string { return `${this.prefix(shape)} to (${x},${y})`; }
}
