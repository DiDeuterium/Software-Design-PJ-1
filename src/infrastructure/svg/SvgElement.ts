/** Parsed SVG input, independent of the XML library's object representation. */
export class SvgElement {
  private readonly nameValue: string;
  private readonly attributesValue: ReadonlyMap<string, string>;
  private readonly childrenValue: readonly SvgElement[];
  private readonly textValue: string;

  public constructor(name: string, attributes: ReadonlyMap<string, string>, children: readonly SvgElement[], text: string) {
    this.nameValue = name;
    this.attributesValue = new Map(attributes);
    this.childrenValue = Object.freeze([...children]);
    this.textValue = text;
  }

  public get name(): string { return this.nameValue; }
  public get attributes(): ReadonlyMap<string, string> { return new Map(this.attributesValue); }
  public get children(): readonly SvgElement[] { return this.childrenValue; }
  public get text(): string { return this.textValue; }
}
