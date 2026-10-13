import type { TreeView } from '../ports/Presentation.js';
import type { EditorState } from '../session/EditorState.js';
import { QueryCommand } from './QueryCommand.js';
import { CommandResult } from './CommandResult.js';

export class TreeCommand extends QueryCommand {
  private readonly view: TreeView;
  private readonly id: string | undefined;

  public constructor(view: TreeView, id?: string) {
    super();
    this.view = view;
    this.id = id;
  }

  public override query(state: EditorState): CommandResult {
    return new CommandResult(this.view.format(state.getDocument(), this.id));
  }
}
