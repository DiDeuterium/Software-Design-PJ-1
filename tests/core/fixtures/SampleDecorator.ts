import type { SessionEvent, TreeDecorator, TreeLine } from '../../../src/core/public/TreeDecorator.js';

export class SampleDecorator implements TreeDecorator {
  private suffix: string;
  public constructor(private readonly nameValue: string, suffix: string) { this.suffix = suffix; }
  public get name(): string { return this.nameValue; }
  public onCommit(event: SessionEvent): void { if (event.kind === 'save') this.suffix = ''; }
  public labels(_line: TreeLine): readonly string[] { return this.suffix.length === 0 ? [] : [this.suffix]; }
}
