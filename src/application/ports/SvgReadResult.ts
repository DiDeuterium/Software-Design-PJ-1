import type { SvgDocument } from '../../domain/document/SvgDocument.js';

export class SvgReadResult {
  private readonly documentValue: SvgDocument;
  private readonly warningsValue: readonly string[];

  public constructor(document: SvgDocument, warnings: readonly string[] = []) {
    this.documentValue = document.clone();
    this.warningsValue = Object.freeze([...warnings]);
  }

  public get document(): SvgDocument { return this.documentValue.clone(); }
  public get warnings(): readonly string[] { return this.warningsValue; }
}
