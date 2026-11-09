import type { AttributeValue, ShapeNode, ShapeView } from '../../../src/core/public/Shape.js';

/** Minimal domain substitute, not one of the six built-ins or a box plugin. */
export class ContractShape implements ShapeNode {
  private readonly values: Map<string, AttributeValue>;
  private readonly nodes: readonly ContractShape[];

  public constructor(private readonly idValue: string, private readonly typeValue = 'sample',
    values: readonly (readonly [string, AttributeValue])[] = [], children: readonly ContractShape[] = [],
    private readonly container = false) {
    this.values = new Map(values);
    this.nodes = Object.freeze([...children]);
  }

  public get id(): string { return this.idValue; }
  public get type(): string { return this.typeValue; }
  public get isContainer(): boolean { return this.container; }
  public get attributes(): readonly (readonly [string, AttributeValue])[] {
    return Object.freeze([...this.values].map(entry => Object.freeze(entry)));
  }
  public get children(): readonly ContractShape[] { return this.nodes; }
  public getAttribute(name: string): AttributeValue | undefined { return this.values.get(name); }
  public set(name: string, value: AttributeValue): void {
    if (!['fill', 'text', 'x'].includes(name)) throw new Error(`unknown attribute: ${name}`);
    this.values.set(name, value);
  }
  public move(dx: number, dy: number): void {
    if (this.container) for (const child of this.nodes) child.move(dx, dy);
    else this.set('x', Number(this.getAttribute('x') ?? 0) + dx);
  }
  public scale(factor: number): void {
    if (this.container) for (const child of this.nodes) child.scale(factor);
    else this.set('x', Number(this.getAttribute('x') ?? 0) * factor);
  }
  public validateChildren(candidate: readonly ShapeNode[]): void {
    if (!this.container && candidate.length > 0) throw new Error('leaf cannot contain children');
    if (this.container && !this.nodes.every(required => candidate.some(child =>
      child.id === required.id && child.type === required.type))) throw new Error('required child missing');
  }
  public clone(): ContractShape {
    return new ContractShape(this.id, this.type, this.attributes, this.nodes.map(child => child.clone()), this.container);
  }
  public withChildren(candidate: readonly ShapeNode[]): ContractShape {
    this.validateChildren(candidate);
    const children = candidate.map(child => {
      if (!(child instanceof ContractShape)) throw new Error('unexpected test shape');
      return child.clone();
    });
    return new ContractShape(this.id, this.type, this.attributes, children, this.container);
  }
  public assertUngroup(): void {
    if (this.container) throw new Error(`cannot ungroup composite shape: ${this.id}`);
    throw new Error(`not a container: ${this.id}`);
  }
  public view(): ShapeView {
    return Object.freeze({ id: this.id, type: this.type, isContainer: this.isContainer,
      attributes: this.attributes, children: Object.freeze(this.nodes.map(child => child.view())) });
  }
}
