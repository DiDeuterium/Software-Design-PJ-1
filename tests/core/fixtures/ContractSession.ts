import type { CommandOutput, DocumentDraft, Session, SessionView } from '../../../src/core/public/Session.js';
import type { EditDocument } from '../../../src/core/public/Document.js';
import { ContractDocument } from './ContractDocument.js';

/** Feasibility harness only. The real serial session/history migrates in step 3. */
export class ContractSession implements Session {
  private current: ContractDocument | undefined;
  private readonly past: ContractDocument[] = [];
  private readonly future: ContractDocument[] = [];
  public constructor(document?: ContractDocument) { this.current = document?.clone(); }
  public get counts(): readonly number[] { return [this.past.length, this.future.length]; }
  public get documentView(): SessionView { return { document: this.current?.view(), path: undefined }; }
  public async query(action: (state: SessionView) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput> {
    return action(this.documentView);
  }
  public async edit(action: (candidate: EditDocument) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput> {
    if (this.current === undefined) throw new Error('no document');
    const candidate = this.current.clone();
    const result = await action(candidate);
    this.past.push(this.current);
    this.current = candidate.clone();
    this.future.length = 0;
    return result;
  }
  public async undo(): Promise<CommandOutput> {
    const previous = this.past.pop();
    if (previous === undefined || this.current === undefined) throw new Error('nothing to undo');
    this.future.push(this.current);
    this.current = previous;
    return { message: 'undo' };
  }
  public async redo(): Promise<CommandOutput> {
    const next = this.future.pop();
    if (next === undefined || this.current === undefined) throw new Error('nothing to redo');
    this.past.push(this.current);
    this.current = next;
    return { message: 'redo' };
  }
  public async document(_action: (draft: DocumentDraft) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput> {
    throw new Error('not used in contract harness');
  }
}
