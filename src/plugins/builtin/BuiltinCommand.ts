import type { Command, CommandContext, CommandToken } from '../../core/public/Command.js';
import type { CommandOutput } from '../../core/public/Session.js';

export class BuiltinCommand implements Command {
  public constructor(private readonly nameValue: string, private readonly syntaxValue: string,
    private readonly minimum: number, private readonly maximum: number,
    private readonly action: (tokens: readonly CommandToken[], context: CommandContext) => Promise<CommandOutput>) {}
  public get name(): string { return this.nameValue; }
  public get syntax(): string { return this.syntaxValue; }
  public get help(): readonly string[] { return [this.syntax]; }
  public run(tokens: readonly CommandToken[], context: CommandContext): Promise<CommandOutput> {
    if (tokens.length < this.minimum || tokens.length > this.maximum) throw new Error(`invalid arguments. usage: ${this.syntax}`);
    return this.action(tokens, context);
  }
}
