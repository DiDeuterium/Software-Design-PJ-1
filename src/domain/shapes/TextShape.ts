import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export class TextShape extends Shape {
  private xValue: number;
  private yValue: number;
  private textValue: string;

  public constructor(id: string, x: number, y: number, text: string) {
    super(id);
    this.xValue = ShapeValidation.number(x);
    this.yValue = ShapeValidation.number(y);
    this.textValue = ShapeValidation.text(text, 'text');
  }

  public override get type(): string { return 'text'; }
  public get x(): number { return this.xValue; }
  public get y(): number { return this.yValue; }
  public get text(): string { return this.textValue; }

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
    return new ShapeMutation(() => {
      this.xValue = x;
      this.yValue = y;
    });
  }

  protected override setGeometry(attribute: string, value: string | number): void {
    if (attribute === 'x') {
      this.xValue = ShapeValidation.number(value);
    } else if (attribute === 'y') {
      this.yValue = ShapeValidation.number(value);
    } else if (attribute === 'text') {
      this.textValue = ShapeValidation.text(value, attribute);
    } else {
      throw new Error(`unknown attribute: ${attribute}`);
    }
  }

  public override clone(): TextShape {
    return this.copyStyleTo(new TextShape(this.id, this.xValue, this.yValue, this.textValue));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitText(this);
  }
}
