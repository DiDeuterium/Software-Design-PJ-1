import type { AttributeValue, ShapeNode, ShapeView } from '../../core/public/Shape.js';
import { ShapeValidation as V } from '../../core/public/ShapeValidation.js';

/** Local template leaf; no dependency on the built-in shape package. */
export class BoxPart implements ShapeNode {
  private readonly values = new Map<string, AttributeValue>();
  public constructor(private readonly idValue: string, private readonly typeValue: 'rect' | 'text',
    attributes: readonly (readonly [string, AttributeValue])[]) {
    V.id(idValue); for (const [name, value] of attributes) this.set(name, value);
  }
  public get id(): string { return this.idValue; }
  public get type(): string { return this.typeValue; }
  public get isContainer(): boolean { return false; }
  public get children(): readonly ShapeNode[] { return Object.freeze([]); }
  public get attributes(): readonly (readonly [string, AttributeValue])[] {
    return Object.freeze([...this.values].map(entry => Object.freeze(entry)));
  }
  public getAttribute(name: string): AttributeValue | undefined { return this.values.get(name); }
  public set(name: string, value: AttributeValue): void {
    if (name === 'x' || name === 'y') this.values.set(name, V.number(value));
    else if (name === 'stroke-width' || this.type === 'rect' && (name === 'width' || name === 'height')) this.values.set(name, V.nonnegative(value, name));
    else if (name === 'fill' || name === 'stroke' || this.type === 'text' && name === 'text') this.values.set(name, V.text(value, name));
    else throw new Error(`unknown attribute: ${name}`);
  }
  public view(): ShapeView { return Object.freeze({ id: this.id, type: this.type, isContainer: false, attributes: this.attributes, children: this.children }); }
  public clone(): BoxPart { return new BoxPart(this.id, this.typeValue, this.attributes); }
  public validateChildren(children: readonly ShapeNode[]): void { if (children.length !== 0) throw new Error('box part cannot contain children'); }
  public withChildren(children: readonly ShapeNode[]): BoxPart { this.validateChildren(children); return this.clone(); }
  public assertUngroup(): never { throw new Error(`not a container: ${this.id}`); }
  public move(dx: number, dy: number): void {
    const x = V.finite(Number(this.values.get('x')) + V.number(dx), 'x');
    const y = V.finite(Number(this.values.get('y')) + V.number(dy), 'y');
    this.values.set('x', x); this.values.set('y', y);
  }
  public scale(factor: number): void {
    V.factor(factor);
    const updates = ['x', 'y', ...(this.type === 'rect' ? ['width', 'height'] : [])].map(name =>
      [name, V.finite(Number(this.values.get(name)) * factor, name)] as const);
    for (const [name, value] of updates) this.values.set(name, value);
  }
}
