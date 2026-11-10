import type { DocumentFactory as Factory } from '../public/Ports.js';
import { EditorDocument } from './EditorDocument.js';

export class DocumentFactory implements Factory {
  public create(width?: number, height?: number): EditorDocument { return new EditorDocument(width, height); }
}
