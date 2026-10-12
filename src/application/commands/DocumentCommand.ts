import type { EditorSession } from '../session/EditorSession.js';
import type { EditorState } from '../session/EditorState.js';
import { Command } from './Command.js';
import type { CommandResult } from './CommandResult.js';

/** Successful execution always establishes a history barrier, including save. */
export abstract class DocumentCommand extends Command {
  public override execute(session: EditorSession): Promise<CommandResult> {
    return session.executeDocument(this);
  }

  /** @internal The state is an isolated draft, including document and path. */
  public abstract apply(state: EditorState): CommandResult | Promise<CommandResult>;
}
