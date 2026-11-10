import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export class CircleShape extends Shape {
  private cxValue: number;
  private cyValue: number;
  private rValue: number;

  public constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.cxValue = ShapeValidation.number(cx);
    this.cyValue = ShapeValidation.number(cy);
    this.rValue = ShapeValidation.nonnegative(r, 'r');
  }

  public override get type(): string { return 'circle'; }
  public get cx(): number { return this.cxValue; }
  public get cy(): number { return this.cyValue; }
  public get r(): number { return this.rValue; }

  protected override planMove(dx: number, dy: number): ShapeMutation {
    const cx = ShapeValidation.finite(this.cxValue + dx, 'cx');
    const cy = ShapeValidation.finite(this.cyValue + dy, 'cy');
    return new ShapeMutation(() => {
      this.cxValue = cx;
      this.cyValue = cy;
    });
  }

  protected override planScale(factor: number): ShapeMutation {
    const cx = ShapeValidation.finite(this.cxValue * factor, 'cx');
    const cy = ShapeValidation.finite(this.cyValue * factor, 'cy');
    const r = ShapeValidation.finite(this.rValue * factor, 'r');
    return new ShapeMutation(() => {
      this.cxValue = cx;
      this.cyValue = cy;
      this.rValue = r;
    });
  }

  protected override setGeometry(attribute: string, value: string | number): void {
    if (attribute === 'cx') {
      this.cxValue = ShapeValidation.number(value);
    } else if (attribute === 'cy') {
      this.cyValue = ShapeValidation.number(value);
    } else if (attribute === 'r') {
      this.rValue = ShapeValidation.nonnegative(value, 'r');
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  public override clone(): CircleShape {
    return this.copyStyleTo(new CircleShape(this.id, this.cxValue, this.cyValue, this.rValue));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitCircle(this);
  }
}
