import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { EditCommand } from '../commands/EditCommand.js';
import type { CommandResult } from '../commands/CommandResult.js';
import { UndoableCommand } from './UndoableCommand.js';

/** Session serializes calls; stacks are changed only after a successful operation. */
export class HistoryManager {
  private readonly undoStack: UndoableCommand[] = [];
  private readonly redoStack: UndoableCommand[] = [];
  private blockedValue = false;

  public get undoCount(): number { return this.undoStack.length; }
  public get redoCount(): number { return this.redoStack.length; }
  public get blocked(): boolean { return this.blockedValue; }

  public async execute(command: EditCommand, document: SvgDocument): Promise<CommandResult> {
    const entry = new UndoableCommand(command);
    const result = await entry.execute(document);
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.blockedValue = false;
    return result;
  }

  public undo(document: SvgDocument): CommandResult {
    this.assertAllowed();
    const entry = this.undoStack.at(-1);
    if (entry === undefined) throw new Error('nothing to undo');
    const result = entry.undo(document);
    this.undoStack.pop();
    this.redoStack.push(entry);
    return result;
  }

  public redo(document: SvgDocument): CommandResult {
    this.assertAllowed();
    const entry = this.redoStack.at(-1);
    if (entry === undefined) throw new Error('nothing to redo');
    const result = entry.redo(document);
    this.redoStack.pop();
    this.undoStack.push(entry);
    return result;
  }

  public barrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blockedValue = true;
  }

  private assertAllowed(): void {
    if (this.blockedValue) throw new Error('undo not allowed after io command');
  }
}
