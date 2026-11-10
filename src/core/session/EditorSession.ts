import type { CommandOutput, DocumentDraft, Session, SessionView } from '../public/Session.js';
import type { EditDocument } from '../public/Document.js';
import type { TreeDecorator, SessionEvent } from '../public/TreeDecorator.js';
import { EditorDocument } from '../document/EditorDocument.js';
import { HistoryEntry } from '../history/HistoryEntry.js';
import { StateDraft } from './StateDraft.js';

export class EditorSession implements Session {
  private current: EditorDocument | undefined;
  private pathValue: string | undefined;
  private readonly past: HistoryEntry[] = [];
  private readonly future: HistoryEntry[] = [];
  private barrier = false;
  private pending: Promise<void> = Promise.resolve();
  private readonly failed = new Set<TreeDecorator>();

  public constructor(private readonly decorators: () => readonly TreeDecorator[] = () => [],
    private readonly report: (message: string) => void = () => undefined) {}
  public get undoCount(): number { return this.past.length; }
  public get redoCount(): number { return this.future.length; }
  public get historyBlocked(): boolean { return this.barrier; }
  public get state(): SessionView { return Object.freeze({ document: this.current?.view(), path: this.pathValue }); }
  public enabled(decorator: TreeDecorator): boolean { return !this.failed.has(decorator); }

  public query(action: (state: SessionView) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput> {
    return this.enqueue(async () => this.output(await action(this.state)));
  }
  public edit(action: (candidate: EditDocument) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput> {
    return this.enqueue(async () => {
      const before = this.requireDocument();
      const candidate = before.clone();
      const output = this.output(await action(candidate));
      const committed = candidate.clone(); // validates, isolates retained callback references
      const entry = new HistoryEntry(before, committed, output);
      this.current = committed;
      this.past.push(entry); this.future.length = 0; this.barrier = false;
      this.notify('edit'); return output;
    });
  }
  public document(action: (draft: DocumentDraft) => CommandOutput | Promise<CommandOutput>,
    event: 'init' | 'read' | 'save' | 'edit' = 'edit'): Promise<CommandOutput> {
    return this.enqueue(async () => {
      const draft = new StateDraft(this.current, this.pathValue);
      const output = this.output(await action(draft));
      const committed = draft.getDocument().clone();
      this.current = committed; this.pathValue = draft.path;
      this.past.length = 0; this.future.length = 0; this.barrier = true;
      this.notify(event); return output;
    });
  }
  public undo(): Promise<CommandOutput> { return this.restore(false); }
  public redo(): Promise<CommandOutput> { return this.restore(true); }
  private restore(redo: boolean): Promise<CommandOutput> {
    return this.enqueue(() => {
      this.requireDocument();
      if (this.barrier) throw new Error('undo not allowed after io command');
      const source = redo ? this.future : this.past; const destination = redo ? this.past : this.future;
      const entry = source.at(-1);
      if (entry === undefined) throw new Error(redo ? 'nothing to redo' : 'nothing to undo');
      const restored = redo ? entry.redo() : entry.undo();
      this.current = restored.document; source.pop(); destination.push(entry);
      this.notify(redo ? 'redo' : 'undo'); return restored.output;
    });
  }
  private requireDocument(): EditorDocument {
    if (this.current === undefined) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  private output(value: CommandOutput): CommandOutput {
    if (typeof value.message !== 'string' || value.warnings?.some(warning => typeof warning !== 'string')) {
      throw new Error('invalid command output');
    }
    return Object.freeze({ message: value.message, warnings: Object.freeze([...(value.warnings ?? [])]),
      ...(value.undoMessage === undefined ? {} : { undoMessage: value.undoMessage }) });
  }
  private notify(kind: SessionEvent['kind']): void {
    const event = Object.freeze({ kind, document: this.requireDocument().view() });
    for (const decorator of this.decorators()) {
      if (!this.enabled(decorator)) continue;
      try { decorator.onCommit?.(event); }
      catch (error: unknown) {
        this.failed.add(decorator);
        const reason = error instanceof Error ? error.message : String(error);
        try { this.report(`tree decorator failed: ${decorator.name} (${reason})`); } catch { /* diagnostics cannot undo a commit */ }
      }
    }
  }
  private enqueue<T>(action: () => T | Promise<T>): Promise<T> {
    const result = this.pending.then(action);
    this.pending = result.then(() => undefined, () => undefined); return result;
  }
}
