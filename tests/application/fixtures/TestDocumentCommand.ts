import { DocumentCommand } from '../../../src/application/commands/DocumentCommand.js';
import type { CommandResult } from '../../../src/application/commands/CommandResult.js';
import type { EditorState } from '../../../src/application/session/EditorState.js';

export class TestDocumentCommand extends DocumentCommand {
  private readonly action: (state: EditorState) => CommandResult | Promise<CommandResult>;

  public constructor(action: (state: EditorState) => CommandResult | Promise<CommandResult>) {
    super();
    this.action = action;
  }

  public override apply(state: EditorState): CommandResult | Promise<CommandResult> {
    return this.action(state);
  }
}
