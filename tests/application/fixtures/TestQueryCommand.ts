import { QueryCommand } from '../../../src/application/commands/QueryCommand.js';
import type { CommandResult } from '../../../src/application/commands/CommandResult.js';
import type { EditorState } from '../../../src/application/session/EditorState.js';

export class TestQueryCommand extends QueryCommand {
  private readonly action: (state: EditorState) => CommandResult | Promise<CommandResult>;

  public constructor(action: (state: EditorState) => CommandResult | Promise<CommandResult>) {
    super();
    this.action = action;
  }

  public override query(state: EditorState): CommandResult | Promise<CommandResult> {
    return this.action(state);
  }
}
