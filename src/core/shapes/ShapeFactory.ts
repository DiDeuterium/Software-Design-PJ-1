import type { Extensions } from '../public/Extensions.js';
import type { AttributeValue, ShapeNode, ShapeView } from '../public/Shape.js';
import type { ShapeInput, ShapeProvider } from '../public/ShapeProvider.js';

export class ShapeFactory {
  public constructor(private readonly extensions: () => Extensions) {}
  public provider(type: string): ShapeProvider {
    const provider = this.extensions().shapes.find(entry => entry.name === type);
    if (provider === undefined) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider;
  }
  public create(type: string, id: string, parameters: readonly AttributeValue[]): ShapeNode {
    const shape = this.provider(type).create(id, parameters);
    this.validate(shape, type, id); return shape;
  }
  public read(input: ShapeInput): ShapeNode {
    const kind = input.tag === 'g' ? input.attributes.find(([name]) => name === 'data-kind')?.[1] : undefined;
    const provider = (kind === undefined ? undefined : this.extensions().shapes.find(entry => entry.name === kind)) ??
      this.extensions().shapes.find(entry => entry.name === input.tag);
    if (provider === undefined) throw new Error(`unsupported svg element: ${input.tag}`);
    const attributes = kind !== undefined && provider.name !== kind
      ? input.attributes.filter(([name]) => name !== 'data-kind') : input.attributes;
    const shape = provider.read({ ...input, attributes });
    this.validate(shape, provider.name, input.id); return shape;
  }
  public forShape(shape: ShapeView): ShapeProvider { return this.provider(shape.type); }
  private validate(shape: ShapeNode, type: string, id: string): void {
    if (shape.type !== type || shape.id !== id) throw new Error(`shape provider contract violation: ${type}`);
    const ids = new Set<string>(); const objects = new Set<ShapeNode>();
    const visit = (node: ShapeNode): void => {
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      if (objects.has(node)) throw new Error(`invalid tree: repeated or cyclic shape: ${node.id}`);
      ids.add(node.id); objects.add(node); node.validateChildren(node.children); node.children.forEach(visit);
    };
    visit(shape);
  }
}
