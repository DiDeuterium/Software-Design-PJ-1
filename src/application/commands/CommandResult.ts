/** Structured application output; rendering remains the CLI's responsibility. */
export class CommandResult {
  private readonly messageValue: string;
  private readonly warningsValue: readonly string[];
  private readonly undoMessageValue: string | undefined;

  public constructor(message: string, warnings: readonly string[] = [], undoMessage?: string) {
    this.messageValue = message;
    this.warningsValue = Object.freeze([...warnings]);
    this.undoMessageValue = undoMessage;
    Object.freeze(this);
  }

  public get message(): string { return this.messageValue; }
  public get warnings(): readonly string[] { return this.warningsValue; }
  public get undoMessage(): string | undefined { return this.undoMessageValue; }
}
