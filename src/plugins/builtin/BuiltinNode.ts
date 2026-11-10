import type { AttributeValue, ShapeNode, ShapeView } from '../../core/public/Shape.js';
import { ShapeValidation as V } from '../../core/public/ShapeValidation.js';
import type { Shape } from './legacy/domain/shapes/Shape.js';
import { ShapeFactory } from './legacy/domain/factory/ShapeFactory.js';

/** Reuses encapsulated Phase 1 value/geometry behavior within the default plugin. */
export class BuiltinNode implements ShapeNode {
  private readonly model: Shape;
  private readonly nodes: readonly ShapeNode[];
  private readonly attributeNames: readonly string[];
  public constructor(model: Shape, names: readonly string[], children: readonly ShapeNode[] = []) {
    this.model = model; this.attributeNames = [...names]; this.nodes = Object.freeze([...children]);
  }
  public get id(): string { return this.model.id; }
  public get type(): string { return this.model.type; }
  public get isContainer(): boolean { return this.model.asGroup() !== undefined; }
  public get children(): readonly ShapeNode[] { return this.nodes; }
  public get attributes(): readonly (readonly [string, AttributeValue])[] {
    const values = this.model as unknown as Readonly<Record<string, AttributeValue | undefined>>;
    return Object.freeze([...this.attributeNames, 'fill', 'stroke', 'stroke-width'].flatMap(name => {
      const value = values[name === 'stroke-width' ? 'strokeWidth' : name];
      return value === undefined ? [] : [Object.freeze([name, value] as const)];
    }));
  }
  public getAttribute(name: string): AttributeValue | undefined { return this.attributes.find(([key]) => key === name)?.[1]; }
  public set(name: string, value: AttributeValue): void { this.model.set(name, value); }
  public view(): ShapeView {
    return Object.freeze({ id: this.id, type: this.type, isContainer: this.isContainer,
      attributes: this.attributes, children: Object.freeze(this.nodes.map(node => node.view())) });
  }
  public clone(): BuiltinNode { return new BuiltinNode(this.model.clone(), this.attributeNames, this.nodes.map(node => node.clone())); }
  public withChildren(children: readonly ShapeNode[]): BuiltinNode {
    this.validateChildren(children); return new BuiltinNode(this.model.clone(), this.attributeNames, children);
  }
  public validateChildren(children: readonly ShapeNode[]): void {
    if (!this.isContainer && children.length > 0) throw new Error('invalid svg: child elements not allowed in ' + this.type);
  }
  public assertUngroup(): void { if (!this.isContainer) throw new Error(`not a container: ${this.id}`); }
  public move(dx: number, dy: number): void {
    V.number(dx); V.number(dy);
    if (!this.isContainer) this.model.move(dx, dy);
    else this.applyToChildren(child => child.move(dx, dy));
  }
  public scale(factor: number): void {
    V.factor(factor);
    if (!this.isContainer) this.model.scale(factor);
    else this.applyToChildren(child => child.scale(factor));
  }
  private applyToChildren(action: (child: ShapeNode) => void): void {
    // Validate on copies before touching any child; session additionally owns a candidate.
    for (const child of this.nodes) action(child.clone());
    for (const child of this.nodes) action(child);
  }
  public static fromView(shape: ShapeView): Shape {
    const attributes = new Map<string, string>(shape.attributes.filter(([name]) => name !== 'text').map(([name, value]) => [name, String(value)]));
    return new ShapeFactory().fromAttributes(shape.type, shape.id, attributes,
      String(shape.attributes.find(([name]) => name === 'text')?.[1] ?? ''), []);
  }
}
