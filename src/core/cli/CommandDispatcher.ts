import type { CommandContext } from '../public/Command.js';
import type { CommandOutput } from '../public/Session.js';
import { Tokenizer } from './Tokenizer.js';

export class CommandDispatcher {
  private readonly tokenizer = new Tokenizer();
  public constructor(private readonly context: () => CommandContext) {}
  public async dispatch(line: string): Promise<CommandOutput | undefined> {
    const tokens = this.tokenizer.tokenize(line); const name = tokens[0]?.value;
    if (name === undefined) return undefined;
    const context = this.context();
    const command = context.extensions.commands.find(entry => entry.name === name);
    if (command === undefined) throw new Error(`unknown command: ${name}`);
    return command.run(tokens.slice(1), context);
  }
}
