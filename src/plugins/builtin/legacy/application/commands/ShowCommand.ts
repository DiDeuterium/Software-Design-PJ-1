import type { ShapeView } from '../ports/Presentation.js';
import type { EditorState } from '../session/EditorState.js';
import { QueryCommand } from './QueryCommand.js';
import { CommandResult } from './CommandResult.js';

export class ShowCommand extends QueryCommand {
  private readonly view: ShapeView;
  private readonly id: string;

  public constructor(view: ShapeView, id: string) {
    super();
    this.view = view;
    this.id = id;
  }

  public override query(state: EditorState): CommandResult {
    return new CommandResult(this.view.format(state.getDocument().getShape(this.id)));
  }
}
