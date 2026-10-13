import type { HelpView } from '../ports/Presentation.js';
import { QueryCommand } from './QueryCommand.js';
import { CommandResult } from './CommandResult.js';

export class HelpCommand extends QueryCommand {
  private readonly view: HelpView;

  public constructor(view: HelpView) { super(); this.view = view; }

  public override query(): CommandResult {
    return new CommandResult(this.view.format());
  }
}
