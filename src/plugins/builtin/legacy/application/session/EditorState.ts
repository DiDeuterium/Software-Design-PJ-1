import type { SvgDocument } from '../../domain/document/SvgDocument.js';

/** Document-command draft: owns its document and default path together. */
export class EditorState {
  private documentValue: SvgDocument | undefined;
  private pathValue: string | undefined;

  public constructor(document?: SvgDocument, path?: string) {
    if (document === undefined && path !== undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    this.documentValue = document?.clone();
    this.pathValue = path;
  }

  public get document(): SvgDocument | undefined { return this.documentValue; }
  public get path(): string | undefined { return this.pathValue; }

  public getDocument(): SvgDocument {
    if (this.documentValue === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.documentValue;
  }

  public replaceDocument(document: SvgDocument, path?: string): void {
    const copy = document.clone();
    this.documentValue = copy;
    this.pathValue = path;
  }

  public setPath(path: string): void {
    this.getDocument();
    this.pathValue = path;
  }

  public clone(): EditorState {
    return new EditorState(this.documentValue, this.pathValue);
  }
}
