import type { AttributeHandler, AttributeContext, AttributeChange } from '../../core/public/AttributeHandler.js';
import type { AttributeValue, ShapeView } from '../../core/public/Shape.js';

export class BoxFillHandler implements AttributeHandler {
  public get name(): string { return 'box-fill'; }
  public handles(shape: ShapeView, attribute: string): boolean { return shape.type === 'box' && attribute === 'fill'; }
  public apply(context: AttributeContext, _attribute: string, value: AttributeValue): AttributeChange {
    const part = context.document.getShape(`${context.target.id}-rect`); const before = part.getAttribute('fill');
    part.set('fill', value);
    return { before, after: part.getAttribute('fill'), message: `box#${context.target.id} fill propagated to ${part.id}`,
      undoMessage: `box#${context.target.id} fill restored: ${before === undefined ? '(unset)' : before}` };
  }
}
