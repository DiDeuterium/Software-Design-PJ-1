import { SvgDocument } from './SvgDocument.js';
import type { Shape } from '../shapes/Shape.js';

/** An opaque memento: every materialization returns fresh shape instances. */
export class DocumentSnapshot {
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly rootsValue: readonly Shape[];

  public constructor(document: SvgDocument) {
    this.widthValue = document.width;
    this.heightValue = document.height;
    this.rootsValue = Object.freeze(document.roots.map(shape => shape.clone()));
  }

  public get width(): number { return this.widthValue; }
  public get height(): number { return this.heightValue; }

  public copyRoots(): readonly Shape[] {
    return Object.freeze(this.rootsValue.map(shape => shape.clone()));
  }

  public restore(): SvgDocument {
    return new SvgDocument(this.widthValue, this.heightValue, this.copyRoots());
  }
}
