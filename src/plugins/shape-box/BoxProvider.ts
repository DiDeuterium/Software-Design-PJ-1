import type { AttributeValue, ShapeView } from '../../core/public/Shape.js';
import type { ShapeProvider, ShapeInput, ShapeEncoding, ShapePresentation, ShapeOperation, ShapeFeedback } from '../../core/public/ShapeProvider.js';
import { ShapeValidation as V } from '../../core/public/ShapeValidation.js';
import { BoxShape } from './BoxShape.js';
import { BoxPart } from './BoxPart.js';

export class BoxProvider implements ShapeProvider {
  public get name(): string { return 'box'; }
  public get createSyntax(): string { return 'box <id> <x> <y> <w> <h> "label"'; }
  public create(id: string, parameters: readonly AttributeValue[]): BoxShape {
    if (parameters.length !== 5) throw new Error(`invalid arguments. usage: create ${this.createSyntax} [in <containerId>]`);
    const x = V.number(parameters[0]!); const y = V.number(parameters[1]!);
    const width = V.nonnegative(parameters[2]!, 'width'); const height = V.nonnegative(parameters[3]!, 'height');
    const text = V.text(parameters[4]!, 'label');
    return new BoxShape(id, [new BoxPart(`${id}-rect`, 'rect', [['x', x], ['y', y], ['width', width], ['height', height], ['fill', '#4a90d9']]),
      new BoxPart(`${id}-label`, 'text', [['x', V.finite(x + 20, 'x')], ['y', V.finite(y + 35, 'y')], ['text', text]])]);
  }
  public read(input: ShapeInput): BoxShape {
    if (input.text.trim().length !== 0) throw new Error('invalid svg: unexpected text in g');
    const styles = input.attributes.filter(([name]) => name !== 'id' && name !== 'data-kind');
    for (const [name] of styles) if (!['fill', 'stroke', 'stroke-width'].includes(name)) throw new Error(`unsupported svg attribute: ${name}`);
    return new BoxShape(input.id, input.children, styles);
  }
  public write(shape: ShapeView): ShapeEncoding { return { tag: 'g', attributes: [['id', shape.id], ['data-kind', 'box'], ...shape.attributes] }; }
  public present(shape: ShapeView): ShapePresentation {
    const styles = shape.attributes.map(([name, value]) => `${name}=${value}`);
    return { treeTitle: `g#${shape.id}`, treeDetails: styles.join(' '), showDetails: [`children=${shape.children.length}`, ...styles] };
  }
  public feedback(operation: ShapeOperation): ShapeFeedback | undefined {
    if (operation.name !== 'create' || operation.after === undefined) return undefined;
    const id = operation.after.id;
    return { message: `box#${id} created (g#${id} + rect#${id}-rect + text#${id}-label)`, undoMessage: `box#${id} deleted` };
  }
}
