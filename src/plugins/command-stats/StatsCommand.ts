import type { Command, CommandContext, CommandToken } from '../../core/public/Command.js';
import type { CommandOutput } from '../../core/public/Session.js';
import type { ShapeView } from '../../core/public/Shape.js';

export class StatsCommand implements Command {
  public get name(): string { return 'stats'; }
  public get syntax(): string { return 'stats'; }
  public get help(): readonly string[] { return ['  stats                        count leaves by type and containers']; }
  public async run(tokens: readonly CommandToken[], context: CommandContext): Promise<CommandOutput> {
    if (tokens.length !== 0) throw new Error('invalid arguments. usage: stats');
    return context.session.query(state => {
      if (state.document === undefined) throw new Error("no document. use 'init' or 'read' first");
      const counts = new Map<string, number>(); let total = 0; let containers = 0;
      const visit = (shape: ShapeView): void => {
        if (shape.isContainer) containers++;
        else { counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1); total++; }
        shape.children.forEach(visit);
      };
      state.document.roots.forEach(visit);
      const types = [...counts].map(([type, count]) => `${type}: ${count}`).join('  ');
      return { message: `${types}${types.length === 0 ? '' : '  '}(total ${total}, containers ${containers})` };
    });
  }
}
