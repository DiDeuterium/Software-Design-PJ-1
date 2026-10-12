import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { Command } from '../commands/Command.js';
import type { EditCommand } from '../commands/EditCommand.js';
import type { DocumentCommand } from '../commands/DocumentCommand.js';
import type { QueryCommand } from '../commands/QueryCommand.js';
import type { CommandResult } from '../commands/CommandResult.js';
import { HistoryManager } from '../history/HistoryManager.js';
import { EditorState } from './EditorState.js';

export class EditorSession {
  private state: EditorState;
  private readonly history = new HistoryManager();
  private pending: Promise<void> = Promise.resolve();

  public constructor(document?: SvgDocument, path?: string) {
    this.state = new EditorState(document, path);
  }

  /** Readers receive an independent document, never the mutable session state. */
  public get document(): SvgDocument | undefined { return this.state.document?.clone(); }
  public get path(): string | undefined { return this.state.path; }
  public get undoCount(): number { return this.history.undoCount; }
  public get redoCount(): number { return this.history.redoCount; }
  public get historyBlocked(): boolean { return this.history.blocked; }

  public execute(command: Command): Promise<CommandResult> {
    return this.enqueue(() => command.execute(this));
  }

  public undo(): Promise<CommandResult> {
    return this.enqueue(() => this.history.undo(this.state.getDocument()));
  }

  public redo(): Promise<CommandResult> {
    return this.enqueue(() => this.history.redo(this.state.getDocument()));
  }

  /** @internal These hooks are called by command polymorphism inside the queue. */
  public executeEdit(command: EditCommand): Promise<CommandResult> {
    return this.history.execute(command, this.state.getDocument());
  }

  public async executeDocument(command: DocumentCommand): Promise<CommandResult> {
    const draft = this.state.clone();
    const result = await command.apply(draft);
    const committed = draft.clone();
    this.state = committed;
    this.history.barrier();
    return result;
  }

  public async executeQuery(command: QueryCommand): Promise<CommandResult> {
    return command.query(this.state.clone());
  }

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.pending.then(operation);
    // A rejected operation must not prevent the next input from being executed.
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }
}
