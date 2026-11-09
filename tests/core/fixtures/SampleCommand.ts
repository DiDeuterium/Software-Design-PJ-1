import type { Command, CommandContext, CommandToken } from '../../../src/core/public/Command.js';
import type { CommandOutput } from '../../../src/core/public/Session.js';

export class SampleCommand implements Command {
  public get name(): string { return 'sample'; }
  public get syntax(): string { return 'sample'; }
  public get help(): readonly string[] { return ['sample: demonstrate a document-independent query']; }
  public run(tokens: readonly CommandToken[], context: CommandContext): Promise<CommandOutput> {
    if (tokens.length > 0) throw new Error('invalid arguments. usage: sample');
    return context.session.query(() => ({ message: context.workingDirectory }));
  }
}
