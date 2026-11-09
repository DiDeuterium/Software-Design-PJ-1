import type { TreeDecorator, TreeLine } from '../public/TreeDecorator.js';

/** Knows label order and spacing, never label names or semantic types. */
export class TreeLabels {
  private readonly decorators: readonly TreeDecorator[];

  public constructor(decorators: readonly TreeDecorator[] = []) { this.decorators = [...decorators]; }

  public append(title: string, line: TreeLine): string {
    const labels = this.decorators.flatMap(decorator => decorator.labels(line));
    if (labels.some(label => label.trim().length === 0 || /[\r\n]/u.test(label))) {
      throw new Error('invalid tree label');
    }
    return labels.length === 0 ? title : `${title} ${labels.join(' ')}`;
  }
}
