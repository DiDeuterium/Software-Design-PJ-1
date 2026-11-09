import type { DocumentView } from './Document.js';
import type { ShapeView } from './Shape.js';

/** Successful state transition only; never published for a failed operation. */
export interface SessionEvent {
  readonly kind: 'init' | 'read' | 'save' | 'edit' | 'undo' | 'redo';
  readonly document: DocumentView;
}

export interface TreeLine {
  readonly document: DocumentView;
  /** Undefined means the SVG title line. */
  readonly shape: ShapeView | undefined;
}

export interface TreeDecorator {
  readonly name: string;
  /** State, including saved baselines, belongs to the instance. */
  onCommit?(event: SessionEvent): void;
  labels(line: TreeLine): readonly string[];
}
