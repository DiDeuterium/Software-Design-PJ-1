import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export class RectShape extends Shape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.xValue = ShapeValidation.number(x);
    this.yValue = ShapeValidation.number(y);
    this.widthValue = ShapeValidation.nonnegative(width, 'width');
    this.heightValue = ShapeValidation.nonnegative(height, 'height');
  }

  public override get type(): string { return 'rect'; }
  public get x(): number { return this.xValue; }
  public get y(): number { return this.yValue; }
  public get width(): number { return this.widthValue; }
  public get height(): number { return this.heightValue; }

  protected override planMove(dx: number, dy: number): ShapeMutation {
    const x = ShapeValidation.finite(this.xValue + dx, 'x');
    const y = ShapeValidation.finite(this.yValue + dy, 'y');
    return new ShapeMutation(() => {
      this.xValue = x;
      this.yValue = y;
    });
  }

  protected override planScale(factor: number): ShapeMutation {
    const x = ShapeValidation.finite(this.xValue * factor, 'x');
    const y = ShapeValidation.finite(this.yValue * factor, 'y');
    const width = ShapeValidation.finite(this.widthValue * factor, 'width');
    const height = ShapeValidation.finite(this.heightValue * factor, 'height');
    return new ShapeMutation(() => {
      this.xValue = x;
      this.yValue = y;
      this.widthValue = width;
      this.heightValue = height;
    });
  }

  protected override setGeometry(attribute: string, value: string | number): void {
    if (attribute === 'x') {
      this.xValue = ShapeValidation.number(value);
    } else if (attribute === 'y') {
      this.yValue = ShapeValidation.number(value);
    } else if (attribute === 'width') {
      this.widthValue = ShapeValidation.nonnegative(value, 'width');
    } else if (attribute === 'height') {
      this.heightValue = ShapeValidation.nonnegative(value, 'height');
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  public override clone(): RectShape {
    return this.copyStyleTo(new RectShape(this.id, this.xValue, this.yValue, this.widthValue, this.heightValue));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitRect(this);
  }
}
