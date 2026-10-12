import type { ShapeVisitor } from '../traversal/ShapeVisitor.js';
import { ShapeMutation } from './ShapeMutation.js';
import { ShapeValidation } from './ShapeValidation.js';

export abstract class Shape {
  private static readonly owners = new WeakMap<Shape, Shape>();
  private static readonly emptyChildren: readonly Shape[] = Object.freeze([]);
  private readonly idValue: string;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(id: string) {
    this.idValue = ShapeValidation.id(id);
  }

  public abstract get type(): string;
  public get id(): string { return this.idValue; }
  public get fill(): string | undefined { return this.fillValue; }
  public get stroke(): string | undefined { return this.strokeValue; }
  public get strokeWidth(): number | undefined { return this.strokeWidthValue; }
  public get parent(): Shape | undefined { return Shape.owners.get(this); }
  public get children(): readonly Shape[] { return Shape.emptyChildren; }

  public move(dx: number, dy: number): void {
    this.prepareMove(dx, dy).apply();
  }

  public scale(factor: number): void {
    this.prepareScale(factor).apply();
  }

  /** Internal domain protocol; callers normally use move/scale. */
  public prepareMove(dx: number, dy: number): ShapeMutation {
    return this.planMove(ShapeValidation.number(dx), ShapeValidation.number(dy));
  }

  public prepareScale(factor: number): ShapeMutation {
    return this.planScale(ShapeValidation.factor(factor));
  }

  public set(attribute: string, value: string | number): void {
    if (attribute === 'fill') {
      this.fillValue = ShapeValidation.text(value, attribute);
    } else if (attribute === 'stroke') {
      this.strokeValue = ShapeValidation.text(value, attribute);
    } else if (attribute === 'stroke-width') {
      this.strokeWidthValue = ShapeValidation.nonnegative(value, attribute);
    } else {
      this.setGeometry(attribute, value);
    }
  }

  protected copyStyleTo<T extends Shape>(target: T): T {
    if (this.fillValue !== undefined) target.set('fill', this.fillValue);
    if (this.strokeValue !== undefined) target.set('stroke', this.strokeValue);
    if (this.strokeWidthValue !== undefined) target.set('stroke-width', this.strokeWidthValue);
    return target;
  }

  /** Construction-time ownership checks; document-wide indexing is a later step. */
  protected adoptChildren(children: readonly Shape[]): void {
    const ids = new Set<string>([this.id]);
    const visit = (shape: Shape): void => {
      if (ids.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      ids.add(shape.id);
      for (const child of shape.children) visit(child);
    };
    for (const child of children) {
      if (child.parent !== undefined) {
        throw new Error(`shape already has a parent: ${child.id}`);
      }
      visit(child);
    }
    // No owner is changed until the entire candidate subtree passes validation.
    for (const child of children) Shape.owners.set(child, this);
  }

  protected abstract planMove(dx: number, dy: number): ShapeMutation;
  protected abstract planScale(factor: number): ShapeMutation;
  protected abstract setGeometry(attribute: string, value: string | number): void;
  public abstract clone(): Shape;
  public abstract accept<T>(visitor: ShapeVisitor<T>): T;
}
