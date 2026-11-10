import type { EditorState } from '../session/EditorState.js';
import { QueryCommand } from './QueryCommand.js';
import { CommandResult } from './CommandResult.js';

export class CanvasQueryCommand extends QueryCommand {
  public override query(state: EditorState): CommandResult {
    const document = state.getDocument();
    return new CommandResult(`canvas ${document.width}x${document.height}`);
  }
}
