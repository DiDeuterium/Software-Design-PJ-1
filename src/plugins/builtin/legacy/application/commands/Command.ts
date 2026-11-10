import type { EditorSession } from '../session/EditorSession.js';
import type { CommandResult } from './CommandResult.js';

/** Command polymorphism determines execution policy, never its textual name. */
export abstract class Command {
  public abstract execute(session: EditorSession): Promise<CommandResult>;
}
