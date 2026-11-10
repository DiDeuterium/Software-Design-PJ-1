import type { AttributeHandler, AttributeContext, AttributeChange } from '../../../src/core/public/AttributeHandler.js';
import type { AttributeValue, ShapeView } from '../../../src/core/public/Shape.js';

export class ProbeHandler implements AttributeHandler {
  public constructor(private readonly nameValue = 'probe-caption', private readonly fail = false) {}
  public get name(): string { return this.nameValue; }
  public handles(shape: ShapeView, name: string): boolean { return shape.type === 'probe' && name === 'caption'; }
  public apply(context: AttributeContext, _attribute: string, value: AttributeValue): AttributeChange {
    const first = context.document.getShape(`${context.target.id}-a`);
    const second = context.document.getShape(`${context.target.id}-b`);
    const before = second.getAttribute('text');
    first.set('fill', value);
    if (this.fail) throw new Error('partial failure');
    second.set('text', value);
    return { before, after: value };
  }
}
