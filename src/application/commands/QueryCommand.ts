import type { EditorSession } from '../session/EditorSession.js';
import type { EditorState } from '../session/EditorState.js';
import { Command } from './Command.js';
import type { CommandResult } from './CommandResult.js';

export abstract class QueryCommand extends Command {
  public override execute(session: EditorSession): Promise<CommandResult> {
    return session.executeQuery(this);
  }

  /** @internal Queries receive a copy so they cannot mutate the current state. */
  public abstract query(state: EditorState): CommandResult | Promise<CommandResult>;
}
