/** Structured application output; rendering remains the CLI's responsibility. */
export class CommandResult {
  private readonly messageValue: string;
  private readonly warningsValue: readonly string[];

  public constructor(message: string, warnings: readonly string[] = []) {
    this.messageValue = message;
    this.warningsValue = Object.freeze([...warnings]);
    Object.freeze(this);
  }

  public get message(): string { return this.messageValue; }
  public get warnings(): readonly string[] { return this.warningsValue; }
}
