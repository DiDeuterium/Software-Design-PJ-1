import type { ShapeProvider, ShapeInput, ShapeEncoding, ShapePresentation, ShapeOperation, ShapeFeedback }
  from '../../../src/core/public/ShapeProvider.js';
import type { AttributeValue, ShapeView } from '../../../src/core/public/Shape.js';
import type { ShapeCreation } from '../../../src/core/public/Ports.js';
import { ProbeNode } from './ProbeNode.js';

export class ProbeProvider implements ShapeProvider {
  public constructor(private readonly shapes: ShapeCreation) {}
  public get name(): string { return 'probe'; }
  public get createSyntax(): string { return 'probe <id>'; }
  public create(id: string, _parameters: readonly AttributeValue[]): ProbeNode {
    return new ProbeNode(id, [this.shapes.create('rect', `${id}-a`, [1, 2, 3, 4, 'red']),
      this.shapes.create('text', `${id}-b`, [5, 6, 'before'])]);
  }
  public read(input: ShapeInput): ProbeNode { return new ProbeNode(input.id, input.children); }
  public write(shape: ShapeView): ShapeEncoding { return { tag: 'g', attributes: [['id', shape.id], ['data-kind', 'probe']] }; }
  public present(shape: ShapeView): ShapePresentation {
    return { treeTitle: `g#${shape.id}`, treeDetails: '', showDetails: [`composite=${shape.type}`] };
  }
  public feedback(_operation: ShapeOperation): ShapeFeedback | undefined { return undefined; }
}
