import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { Shape } from './Shape.js';
import { ShapeMutation } from './ShapeMutation.js';
import { treeChildren } from './TreeAccess.js';

export class GroupShape extends Shape {
  private childrenValue: readonly Shape[];

  public constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    this.childrenValue = Object.freeze([...children]);
    this.adoptChildren(this.childrenValue);
  }

  public override get type(): string { return 'g'; }
  public override get children(): readonly Shape[] { return this.childrenValue; }

  public override asGroup(): GroupShape { return this; }

  /** @internal SvgDocument supplies a frozen, fully validated candidate list. */
  public [treeChildren](children: readonly Shape[]): void {
    this.childrenValue = children;
  }

  protected override planMove(dx: number, dy: number): ShapeMutation {
    return ShapeMutation.combine(this.childrenValue.map(child => child.prepareMove(dx, dy)));
  }

  protected override planScale(factor: number): ShapeMutation {
    return ShapeMutation.combine(this.childrenValue.map(child => child.prepareScale(factor)));
  }

  protected override setGeometry(attribute: string, _value: string | number): void {
    throw new Error(`unknown attribute: ${attribute}`);
  }

  public override clone(): GroupShape {
    return this.copyStyleTo(new GroupShape(this.id, this.childrenValue.map(child => child.clone())));
  }

  public override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitGroup(this);
  }
}
