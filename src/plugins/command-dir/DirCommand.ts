import type { Command, CommandContext, CommandToken } from '../../core/public/Command.js';
import type { CommandOutput } from '../../core/public/Session.js';
import type { DirectoryReader, DirectoryEntry } from '../../core/public/Plugin.js';

export class DirCommand implements Command {
  public constructor(private readonly directory: DirectoryReader) {}
  public get name(): string { return 'dir'; }
  public get syntax(): string { return 'dir'; }
  public get help(): readonly string[] { return ['  dir                          list the process working directory']; }
  public async run(tokens: readonly CommandToken[], context: CommandContext): Promise<CommandOutput> {
    if (tokens.length !== 0) throw new Error('invalid arguments. usage: dir');
    return context.session.query(async () => {
      let entries: readonly DirectoryEntry[];
      try { entries = await this.directory.read(context.workingDirectory); }
      catch { throw new Error(`cannot read directory: ${context.workingDirectory}`); }
      const rank = { directory: 0, file: 1, other: 2 };
      const sorted = entries.filter(entry => entry.name !== '.' && entry.name !== '..').sort((a, b) =>
        rank[a.kind] - rank[b.kind] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      const tags = { directory: 'DIR', file: 'FILE', other: 'OTHER' };
      return { message: sorted.length === 0 ? '(empty directory)' :
        sorted.map(entry => `[${tags[entry.kind]}]  ${entry.name}`).join('\n') };
    });
  }
}
