import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export class EllipseShape extends Shape {
  private cxValue: number;
  private cyValue: number;
  private rxValue: number;
  private ryValue: number;

  public constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.cxValue = ShapeValidation.number(cx);
    this.cyValue = ShapeValidation.number(cy);
    this.rxValue = ShapeValidation.nonnegative(rx, 'rx');
    this.ryValue = ShapeValidation.nonnegative(ry, 'ry');
  }

  public override get type(): string { return 'ellipse'; }
  public get cx(): number { return this.cxValue; }
  public get cy(): number { return this.cyValue; }
  public get rx(): number { return this.rxValue; }
  public get ry(): number { return this.ryValue; }

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
    const rx = ShapeValidation.finite(this.rxValue * factor, 'rx');
    const ry = ShapeValidation.finite(this.ryValue * factor, 'ry');
    return new ShapeMutation(() => {
      this.cxValue = cx;
      this.cyValue = cy;
      this.rxValue = rx;
      this.ryValue = ry;
    });
  }

  protected override setGeometry(attribute: string, value: string | number): void {
    if (attribute === 'cx') {
      this.cxValue = ShapeValidation.number(value);
    } else if (attribute === 'cy') {
      this.cyValue = ShapeValidation.number(value);
    } else if (attribute === 'rx') {
      this.rxValue = ShapeValidation.nonnegative(value, 'rx');
    } else if (attribute === 'ry') {
      this.ryValue = ShapeValidation.nonnegative(value, 'ry');
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  public override clone(): EllipseShape {
    return this.copyStyleTo(new EllipseShape(this.id, this.cxValue, this.cyValue, this.rxValue, this.ryValue));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitEllipse(this);
  }
}
