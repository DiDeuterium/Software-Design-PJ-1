import type { ShapeNode, ShapeView } from './Shape.js';

export interface DocumentView {
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly roots: readonly ShapeView[];
  getShape(id: string): ShapeView;
  parentOf(id: string): ShapeView | undefined;
}

/** Only handed to an edit callback; references must not escape that callback. */
export interface EditDocument {
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly roots: readonly ShapeNode[];
  getShape(id: string): ShapeNode;
  parentOf(id: string): ShapeNode | undefined;
  view(): DocumentView;
  resize(width: number, height: number): void;
  insert(shape: ShapeNode, parentId?: string): void;
  delete(id: string): void;
  move(id: string, dx: number, dy: number): void;
  scale(id: string, factor: number): void;
  addTo(containerId: string, id: string): void;
  group(container: ShapeNode, ids: readonly string[]): void;
  ungroup(id: string): void;
  front(id: string): void;
  back(id: string): void;
}
