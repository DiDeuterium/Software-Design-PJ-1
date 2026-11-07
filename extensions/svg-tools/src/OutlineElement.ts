export class OutlineElement {
  private readonly childrenValue: OutlineElement[] = [];
  private endValue: number;
  public constructor(private readonly tagValue: string, private readonly idValue: string | undefined,
    private readonly startValue: number, private readonly nameStartValue: number, end: number) { this.endValue = end; }
  public get name(): string { return this.tagValue + (this.idValue ? '#' + this.idValue : ''); }
  public get tag(): string { return this.tagValue; }
  public get start(): number { return this.startValue; }
  public get nameStart(): number { return this.nameStartValue; }
  public get end(): number { return this.endValue; }
  public get children(): readonly OutlineElement[] { return this.childrenValue; }
  public append(child: OutlineElement): void { this.childrenValue.push(child); }
  public close(end: number): void { this.endValue = end; }
}
