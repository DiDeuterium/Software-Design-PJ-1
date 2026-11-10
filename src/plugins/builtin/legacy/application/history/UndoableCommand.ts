import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { DocumentSnapshot } from '../../domain/document/DocumentSnapshot.js';
import type { EditCommand } from '../commands/EditCommand.js';
import type { CommandResult } from '../commands/CommandResult.js';

/** One execution of an edit command, with exact mementos for undo and redo. */
export class UndoableCommand {
  private readonly command: EditCommand;
  private before: DocumentSnapshot | undefined;
  private after: DocumentSnapshot | undefined;
  private result: CommandResult | undefined;
  private undoResult: CommandResult | undefined;

  public constructor(command: EditCommand) {
    this.command = command;
  }

  public async execute(document: SvgDocument): Promise<CommandResult> {
    if (this.after !== undefined) throw new Error('command execution already recorded');
    const before = document.snapshot();
    const candidate = document.clone();
    const result = await this.command.apply(candidate);
    const undoResult = this.command.describeUndo(result);
    const after = candidate.snapshot();
    // No live state or history is changed until every command step succeeds.
    document.restore(after);
    this.before = before;
    this.after = after;
    this.result = result;
    this.undoResult = undoResult;
    return result;
  }

  public undo(document: SvgDocument): CommandResult {
    if (this.before === undefined || this.undoResult === undefined) {
      throw new Error('command has not been executed');
    }
    document.restore(this.before);
    return this.undoResult;
  }

  public redo(document: SvgDocument): CommandResult {
    if (this.after === undefined || this.result === undefined) {
      throw new Error('command has not been executed');
    }
    document.restore(this.after);
    return this.result;
  }
}
