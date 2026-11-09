import type { ShapeProvider, ShapeInput, ShapeEncoding, ShapePresentation, ShapeOperation, ShapeFeedback }
  from '../../../src/core/public/ShapeProvider.js';
import type { AttributeValue, ShapeView } from '../../../src/core/public/Shape.js';
import { ContractShape } from './ContractShape.js';

export class SampleProvider implements ShapeProvider {
  public get name(): string { return 'sample'; }
  public get createSyntax(): string { return 'sample <id>'; }
  public create(id: string, _parameters: readonly AttributeValue[] = []): ContractShape {
    return new ContractShape(id, this.name, [], [
      new ContractShape(`${id}-a`, 'leaf', [['fill', 'red']]),
      new ContractShape(`${id}-b`, 'leaf', [['text', 'before']]),
    ], true);
  }
  public read(input: ShapeInput): ContractShape {
    const result = this.create(input.id);
    result.validateChildren(input.children);
    return new ContractShape(input.id, this.name, input.attributes,
      input.children.map(child => {
        if (!(child instanceof ContractShape)) throw new Error('unexpected test shape');
        return child;
      }), true);
  }
  public write(shape: ShapeView): ShapeEncoding {
    return { tag: 'g', attributes: [['id', shape.id], ['data-kind', this.name]] };
  }
  public present(shape: ShapeView): ShapePresentation {
    return { treeTitle: `g#${shape.id}`, treeDetails: '', showDetails: [`children=${shape.children.length}`] };
  }
  public feedback(_operation: ShapeOperation): ShapeFeedback | undefined { return undefined; }
}
