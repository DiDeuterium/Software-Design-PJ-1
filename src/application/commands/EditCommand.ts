import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { EditorSession } from '../session/EditorSession.js';
import { Command } from './Command.js';
import { CommandResult } from './CommandResult.js';

export abstract class EditCommand extends Command {
  public override execute(session: EditorSession): Promise<CommandResult> {
    return session.executeEdit(this);
  }

  /** @internal Applies only to a private candidate document, not live state. */
  public abstract apply(document: SvgDocument): CommandResult | Promise<CommandResult>;

  public describeUndo(result: CommandResult): CommandResult {
    return new CommandResult(`undone: ${result.message}`);
  }
}
