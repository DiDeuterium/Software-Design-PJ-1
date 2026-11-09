import type { AttributeChange, AttributeHandler, AttributeWriter } from '../public/AttributeHandler.js';
import type { EditDocument } from '../public/Document.js';
import type { AttributeValue } from '../public/Shape.js';

/** Called inside Session.edit, not a second transaction or history entry. */
export class AttributeDispatcher implements AttributeWriter {
  private readonly handlers: readonly AttributeHandler[];

  public constructor(handlers: readonly AttributeHandler[] = []) { this.handlers = [...handlers]; }

  public apply(document: EditDocument, id: string, attribute: string, value: AttributeValue): AttributeChange {
    const target = document.getShape(id);
    const view = target.view();
    const matches = this.handlers.filter(handler => handler.handles(view, attribute));
    if (matches.length > 1) throw new Error(`attribute handler conflict: ${id}/${attribute}`);
    const handler = matches[0];
    if (handler !== undefined) return handler.apply({ document, target }, attribute, value);
    const before = target.getAttribute(attribute);
    target.set(attribute, value);
    return { before, after: target.getAttribute(attribute) };
  }
}
