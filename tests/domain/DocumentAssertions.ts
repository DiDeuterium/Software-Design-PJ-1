import { expect } from 'vitest';
import type { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import type { DocumentSnapshot } from '../../src/domain/document/DocumentSnapshot.js';
import type { Shape } from '../../src/domain/shapes/Shape.js';

export class DocumentAssertions {
  public static consistent(document: SvgDocument): void {
    const ids = new Set<string>();
    const visit = (shape: Shape, parent: Shape | undefined): void => {
      expect(shape.parent).toBe(parent);
      expect(document.find(shape.id)).toBe(shape);
      expect(ids.has(shape.id)).toBe(false);
      expect(Object.isFrozen(shape.children)).toBe(true);
      ids.add(shape.id);
      for (const child of shape.children) visit(child, shape);
    };
    for (const root of document.roots) visit(root, undefined);
    expect(document.size).toBe(ids.size);
    expect(Object.isFrozen(document.roots)).toBe(true);
  }

  public static unchanged(document: SvgDocument, snapshot: DocumentSnapshot): void {
    expect([document.width, document.height]).toEqual([snapshot.width, snapshot.height]);
    expect(document.roots).toEqual(snapshot.copyRoots());
    this.consistent(document);
  }
}
