import type { CommandOutput } from '../public/Session.js';
import type { EditorDocument } from '../document/EditorDocument.js';

/** Exact mementos; redo never re-executes a plugin or its external effects. */
export class HistoryEntry {
  public constructor(private readonly before: EditorDocument, private readonly after: EditorDocument,
    private readonly output: CommandOutput) {}
  public undo(): { document: EditorDocument; output: CommandOutput } {
    return { document: this.before.clone(), output: { message: this.output.undoMessage ?? `undone: ${this.output.message}` } };
  }
  public redo(): { document: EditorDocument; output: CommandOutput } {
    return { document: this.after.clone(), output: this.output };
  }
}
