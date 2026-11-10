import type { AttributeHandler, AttributeContext, AttributeChange } from '../../core/public/AttributeHandler.js';
import type { AttributeValue, ShapeView } from '../../core/public/Shape.js';

export class BoxLabelHandler implements AttributeHandler {
  public get name(): string { return 'box-label'; }
  public handles(shape: ShapeView, attribute: string): boolean { return shape.type === 'box' && attribute === 'label'; }
  public apply(context: AttributeContext, _attribute: string, value: AttributeValue): AttributeChange {
    const part = context.document.getShape(`${context.target.id}-label`); const before = part.getAttribute('text');
    part.set('text', value); const after = part.getAttribute('text');
    return { before, after, message: `box#${context.target.id} label updated: ${JSON.stringify(after)}`,
      undoMessage: `box#${context.target.id} label restored: ${JSON.stringify(before)}` };
  }
}
