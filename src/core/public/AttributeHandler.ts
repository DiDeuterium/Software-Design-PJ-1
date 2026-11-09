import type { EditDocument } from './Document.js';
import type { AttributeValue, ShapeNode, ShapeView } from './Shape.js';

export interface AttributeContext {
  readonly document: EditDocument;
  readonly target: ShapeNode;
}

export interface AttributeChange {
  readonly before: AttributeValue | undefined;
  readonly after: AttributeValue | undefined;
  readonly message?: string;
  readonly undoMessage?: string;
}

export interface AttributeHandler {
  readonly name: string;
  /** Pure predicate over detached, immutable data, without an edit context. */
  handles(shape: ShapeView, attribute: string): boolean;
  /** Runs inside the caller's one candidate transaction; never starts another. */
  apply(context: AttributeContext, attribute: string, value: AttributeValue): AttributeChange;
}

export interface AttributeWriter {
  apply(document: EditDocument, id: string, attribute: string, value: AttributeValue): AttributeChange;
}
