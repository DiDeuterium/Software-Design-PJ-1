import type { TreeDecorator, TreeLine, SessionEvent } from '../../../src/core/public/TreeDecorator.js';

export class RecordingDecorator implements TreeDecorator {
  private readonly commits: string[] = [];
  public constructor(private readonly nameValue: string, private readonly suffix: string, private readonly fail = false) {}
  public get name(): string { return this.nameValue; }
  public get events(): readonly string[] { return [...this.commits]; }
  public onCommit(event: SessionEvent): void {
    this.commits.push(event.kind);
    if (this.fail) throw new Error('observer failed');
  }
  public labels(_line: TreeLine): readonly string[] { return [this.suffix]; }
}
