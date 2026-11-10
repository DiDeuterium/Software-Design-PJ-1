/** Keeps quoting information so a literal "in" is never mistaken for syntax. */
export class Token {
  private readonly valueValue: string;
  private readonly quotedValue: boolean;

  public constructor(value: string, quoted = false) {
    this.valueValue = value;
    this.quotedValue = quoted;
    Object.freeze(this);
  }

  public get value(): string { return this.valueValue; }
  public get quoted(): boolean { return this.quotedValue; }
}
