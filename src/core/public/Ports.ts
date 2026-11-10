import type { DocumentView, EditDocument } from './Document.js';
import type { ShapeView, ShapeNode, AttributeValue } from './Shape.js';

export interface ShapeCreation {
  create(type: string, id: string, parameters: readonly AttributeValue[]): ShapeNode;
}

export interface FileStore {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
}

export interface DocumentFactory {
  create(width?: number, height?: number): EditDocument;
}

export interface SvgCodec {
  decode(source: string): { readonly document: EditDocument; readonly warnings: readonly string[] };
  encode(document: DocumentView): string;
}

export interface Presentation {
  tree(document: DocumentView, id?: string): string;
  show(document: DocumentView, shape: ShapeView): string;
}
