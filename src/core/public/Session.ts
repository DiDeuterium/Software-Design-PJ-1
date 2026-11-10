import type { DocumentView, EditDocument } from './Document.js';

export interface CommandOutput {
  readonly message: string;
  readonly warnings?: readonly string[];
  readonly undoMessage?: string;
}

export interface SessionView {
  readonly document: DocumentView | undefined;
  readonly path: string | undefined;
}

export interface DocumentDraft {
  readonly document: EditDocument | undefined;
  readonly path: string | undefined;
  replace(document: EditDocument, path?: string): void;
  setPath(path: string): void;
}

/** Framework owns serialization, candidate copies, history and commit events. */
export interface Session {
  query(action: (state: SessionView) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput>;
  edit(action: (candidate: EditDocument) => CommandOutput | Promise<CommandOutput>): Promise<CommandOutput>;
  document(action: (draft: DocumentDraft) => CommandOutput | Promise<CommandOutput>,
    event?: 'init' | 'read' | 'save' | 'edit'): Promise<CommandOutput>;
  undo(): Promise<CommandOutput>;
  redo(): Promise<CommandOutput>;
}
