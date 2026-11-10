import type { DocumentView } from '../../core/public/Document.js';
import type { ShapeView } from '../../core/public/Shape.js';
import type { TreeDecorator, TreeLine, SessionEvent } from '../../core/public/TreeDecorator.js';

/** Content comparison against the last successful init/read/save, per instance. */
export class ModifiedStarDecorator implements TreeDecorator {
  private readonly savedNodes = new Map<string, string>();
  private savedDocument: string | undefined;
  public get name(): string { return 'modified-star'; }

  public onCommit(event: SessionEvent): void {
    if (event.kind !== 'init' && event.kind !== 'read' && event.kind !== 'save') return;
    this.savedNodes.clear();
    const visit = (shape: ShapeView): void => {
      this.savedNodes.set(shape.id, this.ownContent(shape)); shape.children.forEach(visit);
    };
    event.document.roots.forEach(visit);
    this.savedDocument = this.documentContent(event.document);
  }

  public labels(line: TreeLine): readonly string[] {
    const changed = line.shape === undefined ? this.documentContent(line.document) !== this.savedDocument :
      this.ownContent(line.shape) !== this.savedNodes.get(line.shape.id);
    return changed ? ['*'] : [];
  }

  private ownContent(shape: ShapeView): string {
    const attributes = [...shape.attributes].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return JSON.stringify([shape.id, shape.type, shape.isContainer, attributes, shape.children.map(child => child.id)]);
  }
  private documentContent(document: DocumentView): string {
    const subtree = (shape: ShapeView): unknown => [this.ownContent(shape), shape.children.map(subtree)];
    return JSON.stringify([document.width, document.height, document.roots.map(subtree)]);
  }
}
