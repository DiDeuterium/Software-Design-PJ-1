import type { TreeDecorator, TreeLine } from '../../core/public/TreeDecorator.js';

export class BoxTypeDecorator implements TreeDecorator {
  public get name(): string { return 'box-type-label'; }
  public labels(line: TreeLine): readonly string[] { return line.shape?.type === 'box' ? ['(box)'] : []; }
}
