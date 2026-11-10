import type { Presentation as Port } from '../public/Ports.js';
import type { DocumentView } from '../public/Document.js';
import type { ShapeView } from '../public/Shape.js';
import type { Extensions } from '../public/Extensions.js';
import { ShapeFactory } from '../shapes/ShapeFactory.js';
import { TreeLabels } from '../tree/TreeLabels.js';

export class Presentation implements Port {
  private readonly shapes: ShapeFactory;
  public constructor(private readonly extensions: () => Extensions) { this.shapes = new ShapeFactory(extensions); }
  public tree(document: DocumentView, id?: string): string {
    const labels = new TreeLabels(this.extensions().decorators);
    const title = (shape?: ShapeView): string => {
      const value = shape === undefined ? `svg (${document.width}x${document.height})` : (() => {
        const view = this.shapes.forShape(shape).present(shape);
        return view.treeTitle + (view.treeDetails.length === 0 ? '' : `  ${view.treeDetails}`);
      })();
      return labels.append(value, { document, shape });
    };
    const root = id === undefined ? undefined : document.getShape(id);
    const lines = [title(root)];
    const visit = (children: readonly ShapeView[], prefix: string): void => {
      children.forEach((child, index) => {
        const last = index === children.length - 1;
        lines.push(`${prefix}${last ? '└── ' : '├── '}${title(child)}`);
        visit(child.children, prefix + (last ? '    ' : '│   '));
      });
    };
    visit(root?.children ?? document.roots, ''); return lines.join('\n');
  }
  public show(document: DocumentView, shape: ShapeView): string {
    const parent = document.parentOf(shape.id);
    const heading = `${shape.type}#${shape.id}  parent=${parent === undefined ? 'svg' : `${parent.type}#${parent.id}`}`;
    return [heading, ...this.shapes.forShape(shape).present(shape).showDetails.map(line => `  ${line}`)].join('\n');
  }
}
