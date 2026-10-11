/**
 * The single CLI command-name dispatch boundary.
 * Scaffold only: command implementations are added in later milestones.
 * Future refactoring point: register command factories here.
 */
export class CommandDispatcher {
  public dispatch(line: string): never {
    const commandName = line.trim().split(/\s+/u)[0] ?? '';
    throw new Error(`unknown command: ${commandName}`);
  }
}
