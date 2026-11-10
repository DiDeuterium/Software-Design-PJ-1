import type { AttributeValue, ShapeNode, ShapeView } from '../../../src/core/public/Shape.js';

/** Test-only composite depending solely on the public domain protocol. */
export class ProbeNode implements ShapeNode {
  private readonly nodes: readonly ShapeNode[];
  public constructor(private readonly idValue: string, children: readonly ShapeNode[]) {
    this.nodes = Object.freeze([...children]); this.validateChildren(this.nodes);
  }
  public get id(): string { return this.idValue; }
  public get type(): string { return 'probe'; }
  public get isContainer(): boolean { return true; }
  public get children(): readonly ShapeNode[] { return this.nodes; }
  public get attributes(): readonly (readonly [string, AttributeValue])[] { return Object.freeze([]); }
  public getAttribute(_name: string): undefined { return undefined; }
  public set(name: string, _value: AttributeValue): never { throw new Error(`unknown attribute: ${name}`); }
  public view(): ShapeView {
    return Object.freeze({ id: this.id, type: this.type, isContainer: true, attributes: this.attributes,
      children: Object.freeze(this.children.map(child => child.view())) });
  }
  public clone(): ProbeNode { return new ProbeNode(this.id, this.children.map(child => child.clone())); }
  public withChildren(children: readonly ShapeNode[]): ProbeNode { return new ProbeNode(this.id, children); }
  public validateChildren(children: readonly ShapeNode[]): void {
    for (const [suffix, type] of [['a', 'rect'], ['b', 'text']]) {
      if (!children.some(child => child.id === `${this.id}-${suffix}` && child.type === type)) throw new Error('required child missing');
    }
  }
  public assertUngroup(): never { throw new Error(`cannot ungroup composite shape: ${this.id}`); }
  public move(dx: number, dy: number): void { for (const child of this.children) child.move(dx, dy); }
  public scale(factor: number): void { for (const child of this.children) child.scale(factor); }
}
