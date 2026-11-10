import type { AttributeValue, ShapeNode, ShapeView } from '../../core/public/Shape.js';
import { ShapeValidation as V } from '../../core/public/ShapeValidation.js';

export class BoxShape implements ShapeNode {
  private readonly nodes: readonly ShapeNode[];
  private readonly styles = new Map<string, AttributeValue>();
  public constructor(private readonly idValue: string, children: readonly ShapeNode[],
    styles: readonly (readonly [string, AttributeValue])[] = []) {
    V.id(idValue); this.nodes = Object.freeze([...children]); this.validateChildren(children);
    for (const [name, value] of styles) this.set(name, value);
  }
  public get id(): string { return this.idValue; }
  public get type(): string { return 'box'; }
  public get isContainer(): boolean { return true; }
  public get children(): readonly ShapeNode[] { return this.nodes; }
  public get attributes(): readonly (readonly [string, AttributeValue])[] { return Object.freeze([...this.styles].map(entry => Object.freeze(entry))); }
  public getAttribute(name: string): AttributeValue | undefined { return this.styles.get(name); }
  public set(name: string, value: AttributeValue): void {
    if (name === 'fill' || name === 'stroke') this.styles.set(name, V.text(value, name));
    else if (name === 'stroke-width') this.styles.set(name, V.nonnegative(value, name));
    else throw new Error(`unknown attribute: ${name}`);
  }
  public view(): ShapeView { return Object.freeze({ id: this.id, type: this.type, isContainer: true,
    attributes: this.attributes, children: Object.freeze(this.nodes.map(node => node.view())) }); }
  public clone(): BoxShape { return new BoxShape(this.id, this.nodes.map(node => node.clone()), this.attributes); }
  public withChildren(children: readonly ShapeNode[]): BoxShape { return new BoxShape(this.id, children, this.attributes); }
  public validateChildren(children: readonly ShapeNode[]): void {
    for (const [suffix, type] of [['rect', 'rect'], ['label', 'text']]) {
      if (!children.some(child => child.id === `${this.id}-${suffix}` && child.type === type)) {
        throw new Error(`invalid box: ${this.id} requires ${type}#${this.id}-${suffix}`);
      }
    }
  }
  public assertUngroup(): never { throw new Error(`cannot ungroup composite shape: ${this.id}`); }
  public move(dx: number, dy: number): void { this.apply(child => child.move(dx, dy)); }
  public scale(factor: number): void { this.apply(child => child.scale(factor)); }
  private apply(operation: (child: ShapeNode) => void): void {
    this.nodes.forEach(child => operation(child.clone())); this.nodes.forEach(operation);
  }
}
