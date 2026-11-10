import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export class LineShape extends Shape {
  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  public constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1Value = ShapeValidation.number(x1);
    this.y1Value = ShapeValidation.number(y1);
    this.x2Value = ShapeValidation.number(x2);
    this.y2Value = ShapeValidation.number(y2);
  }

  public override get type(): string { return 'line'; }
  public get x1(): number { return this.x1Value; }
  public get y1(): number { return this.y1Value; }
  public get x2(): number { return this.x2Value; }
  public get y2(): number { return this.y2Value; }

  protected override planMove(dx: number, dy: number): ShapeMutation {
    const x1 = ShapeValidation.finite(this.x1Value + dx, 'x1');
    const y1 = ShapeValidation.finite(this.y1Value + dy, 'y1');
    const x2 = ShapeValidation.finite(this.x2Value + dx, 'x2');
    const y2 = ShapeValidation.finite(this.y2Value + dy, 'y2');
    return new ShapeMutation(() => {
      this.x1Value = x1;
      this.y1Value = y1;
      this.x2Value = x2;
      this.y2Value = y2;
    });
  }

  protected override planScale(factor: number): ShapeMutation {
    const x1 = ShapeValidation.finite(this.x1Value * factor, 'x1');
    const y1 = ShapeValidation.finite(this.y1Value * factor, 'y1');
    const x2 = ShapeValidation.finite(this.x2Value * factor, 'x2');
    const y2 = ShapeValidation.finite(this.y2Value * factor, 'y2');
    return new ShapeMutation(() => {
      this.x1Value = x1;
      this.y1Value = y1;
      this.x2Value = x2;
      this.y2Value = y2;
    });
  }

  protected override setGeometry(attribute: string, value: string | number): void {
    if (attribute === 'x1') {
      this.x1Value = ShapeValidation.number(value);
    } else if (attribute === 'y1') {
      this.y1Value = ShapeValidation.number(value);
    } else if (attribute === 'x2') {
      this.x2Value = ShapeValidation.number(value);
    } else if (attribute === 'y2') {
      this.y2Value = ShapeValidation.number(value);
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  public override clone(): LineShape {
    return this.copyStyleTo(new LineShape(this.id, this.x1Value, this.y1Value, this.x2Value, this.y2Value));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitLine(this);
  }
}
