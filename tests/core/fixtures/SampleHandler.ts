import type { AttributeHandler, AttributeChange, AttributeContext } from '../../../src/core/public/AttributeHandler.js';
import type { AttributeValue, ShapeView } from '../../../src/core/public/Shape.js';

export class SampleHandler implements AttributeHandler {
  public constructor(private readonly nameValue = 'sample-attributes', private readonly fail = false) {}
  public get name(): string { return this.nameValue; }
  public handles(shape: ShapeView, attribute: string): boolean { return shape.type === 'sample' && attribute === 'caption'; }
  public apply(context: AttributeContext, _attribute: string, value: AttributeValue): AttributeChange {
    const first = context.document.getShape(`${context.target.id}-a`);
    const second = context.document.getShape(`${context.target.id}-b`);
    const before = second.getAttribute('text');
    first.set('fill', value);
    if (this.fail) throw new Error('partial modification failed');
    second.set('text', value);
    return { before, after: value };
  }
}
