import type { ShapeProvider, ShapeInput, ShapeEncoding, ShapePresentation, ShapeOperation, ShapeFeedback }
  from '../../core/public/ShapeProvider.js';
import type { AttributeValue, ShapeView } from '../../core/public/Shape.js';
import { ShapeFactory } from './legacy/domain/factory/ShapeFactory.js';
import { TreeFormatter } from './legacy/presentation/TreeFormatter.js';
import { ShowFormatter } from './legacy/presentation/ShowFormatter.js';
import { MoveDescription } from './legacy/application/commands/MoveDescription.js';
import { BuiltinNode } from './BuiltinNode.js';

export class BuiltinProvider implements ShapeProvider {
  private readonly factory = new ShapeFactory();
  public constructor(private readonly typeValue: string, private readonly names: readonly string[],
    private readonly syntaxValue: string) {}
  public get name(): string { return this.typeValue; }
  public get createSyntax(): string { return this.syntaxValue; }
  public create(id: string, parameters: readonly AttributeValue[]): BuiltinNode {
    return new BuiltinNode(this.factory.create(this.name, id, parameters), this.names);
  }
  public read(input: ShapeInput): BuiltinNode {
    const model = this.factory.fromAttributes(this.name, input.id, new Map(input.attributes), input.text, []);
    const node = new BuiltinNode(model, this.names, input.children);
    node.validateChildren(input.children); return node;
  }
  public write(shape: ShapeView): ShapeEncoding {
    return { tag: this.name, attributes: [['id', shape.id], ...shape.attributes.filter(([name]) => name !== 'text')],
      ...(this.name === 'text' ? { text: String(shape.attributes.find(([name]) => name === 'text')?.[1] ?? '') } : {}) };
  }
  public present(shape: ShapeView): ShapePresentation {
    const model = BuiltinNode.fromView(shape);
    const title = `${shape.type}#${shape.id}`;
    const details = model.accept(new TreeFormatter()).slice(title.length).replace(/^  /u, '');
    const show = new ShowFormatter().format(model).split('\n').slice(1).map(line => line.slice(2));
    return { treeTitle: title, treeDetails: details,
      showDetails: show.map(line => line.startsWith('children=') ? `children=${shape.children.length}` : line) };
  }
  public feedback(operation: ShapeOperation): ShapeFeedback | undefined {
    if (operation.name !== 'move' || operation.before === undefined || operation.after === undefined) return undefined;
    const dx = Number(operation.arguments[0]); const dy = Number(operation.arguments[1]);
    return { message: new MoveDescription(dx, dy).describe(BuiltinNode.fromView(operation.after)),
      undoMessage: new MoveDescription(-dx, -dy, true).describe(BuiltinNode.fromView(operation.before)) };
  }
}
