import type { DocumentDraft } from '../public/Session.js';
import type { EditDocument } from '../public/Document.js';
import { EditorDocument } from '../document/EditorDocument.js';

export class StateDraft implements DocumentDraft {
  private current: EditorDocument | undefined;
  private currentPath: string | undefined;
  public constructor(document?: EditorDocument, path?: string) { this.current = document?.clone(); this.currentPath = path; }
  public get document(): EditorDocument | undefined { return this.current; }
  public get path(): string | undefined { return this.currentPath; }
  public replace(document: EditDocument, path?: string): void {
    this.current = new EditorDocument(document.width, document.height, document.roots.map(root => root.clone()));
    this.currentPath = path;
  }
  public setPath(path: string): void { this.getDocument(); this.currentPath = path; }
  public getDocument(): EditorDocument {
    if (this.current === undefined) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
