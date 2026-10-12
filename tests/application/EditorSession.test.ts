import { describe, expect, it } from 'vitest';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { EditorState } from '../../src/application/session/EditorState.js';
import { CommandResult } from '../../src/application/commands/CommandResult.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TestEditCommand } from './fixtures/TestEditCommand.js';
import { TestDocumentCommand } from './fixtures/TestDocumentCommand.js';
import { TestQueryCommand } from './fixtures/TestQueryCommand.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

describe('session and command policies', () => {
  it('allows help-like queries without a document but rejects editing/undo/redo', async () => {
    const session = new EditorSession();
    const noDocument = "no document. use 'init' or 'read' first";
    expect(session.document).toBeUndefined();
    await expect(session.execute(new TestQueryCommand(() => new CommandResult('help')))).resolves.toHaveProperty('message', 'help');
    await expect(session.execute(new TestEditCommand(() => new CommandResult('edit')))).rejects.toThrow(noDocument);
    await expect(session.undo()).rejects.toThrow(noDocument);
    await expect(session.redo()).rejects.toThrow(noDocument);
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, false]);
  });

  it('initializes a document, locks history, then unlocks on an edit', async () => {
    const session = new EditorSession();
    await session.execute(new TestDocumentCommand(state => {
      state.replaceDocument(new SvgDocument(100, 200));
      return new CommandResult('initialized');
    }));
    expect([session.document?.width, session.document?.height, session.path]).toEqual([100, 200, undefined]);
    await expect(session.undo()).rejects.toThrow('undo not allowed after io command');
    await session.execute(new TestEditCommand(document => {
      document.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('created');
    }));
    expect(session.historyBlocked).toBe(false);
    await session.undo();
    expect(session.document?.size).toBe(0);
  });

  it.each(['save', 'resize', 'read', 'init'])('successful %s-like operations clear both stacks and block history', async operation => {
    const session = new EditorSession(new SvgDocument(100, 200), 'original.svg');
    const edit = new TestEditCommand(document => {
      document.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('created');
    });
    await session.execute(edit);
    await session.undo();
    expect(session.redoCount).toBe(1);
    await session.execute(new TestDocumentCommand(state => {
      if (operation === 'save') state.setPath('saved.svg');
      if (operation === 'resize') state.getDocument().resize(300, 400);
      if (operation === 'read') state.replaceDocument(new SvgDocument(500, 600), 'read.svg');
      if (operation === 'init') state.replaceDocument(new SvgDocument());
      return new CommandResult(operation);
    }));
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
    await expect(session.undo()).rejects.toThrow('undo not allowed after io command');
    await expect(session.redo()).rejects.toThrow('undo not allowed after io command');
    await session.execute(edit);
    await session.undo();
    expect(session.document?.find('c')).toBeUndefined();
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });

  it('preserves document, path and redo after a document command mutates its draft then fails', async () => {
    const session = new EditorSession(new SvgDocument(100, 200), 'original.svg');
    await session.execute(new TestEditCommand(document => {
      document.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('created');
    }));
    await session.undo();
    const before = session.document?.snapshot();
    await expect(session.execute(new TestDocumentCommand(async draft => {
      draft.replaceDocument(new SvgDocument(999, 999), 'wrong.svg');
      await Promise.resolve();
      throw new Error('cannot write file: wrong.svg');
    }))).rejects.toThrow('cannot write file: wrong.svg');
    expect(session.path).toBe('original.svg');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 1, false]);
    const document = session.document;
    expect(document).toBeDefined();
    expect(before).toBeDefined();
    if (document !== undefined && before !== undefined) DocumentAssertions.unchanged(document, before);
    await session.redo();
    expect(session.document?.find('c')).toBeDefined();
  });

  it('preserves an existing barrier after failed editing, document and query commands', async () => {
    const session = new EditorSession(new SvgDocument());
    await session.execute(new TestDocumentCommand(() => new CommandResult('saved')));
    for (const command of [
      new TestEditCommand(() => { throw new Error('failed'); }),
      new TestDocumentCommand(() => { throw new Error('failed'); }),
      new TestQueryCommand(() => { throw new Error('failed'); }),
    ]) await expect(session.execute(command)).rejects.toThrow('failed');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
  });

  it('keeps an absent document and empty history when initialization fails after creating a draft', async () => {
    const session = new EditorSession();
    await expect(session.execute(new TestDocumentCommand(state => {
      state.replaceDocument(new SvgDocument(100, 200), 'draft.svg');
      throw new Error('initialization failed');
    }))).rejects.toThrow('initialization failed');
    expect(session.document).toBeUndefined();
    expect(session.path).toBeUndefined();
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, false]);
  });

  it('keeps both undo and redo entries when a document command fails', async () => {
    const session = new EditorSession(new SvgDocument(100, 100, [new CircleShape('c', 0, 0, 1)]));
    const move = new TestEditCommand(document => {
      document.move('c', 1, 0);
      return new CommandResult('moved');
    });
    await session.execute(move);
    await session.execute(move);
    await session.undo();
    await expect(session.execute(new TestDocumentCommand(state => {
      state.getDocument().resize(999, 999);
      throw new Error('failed');
    }))).rejects.toThrow('failed');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([1, 1, false]);
    expect(session.document?.width).toBe(100);
    await session.redo();
    expect((session.document?.getShape('c') as CircleShape).cx).toBe(2);
    await session.undo();
    await session.undo();
    expect((session.document?.getShape('c') as CircleShape).cx).toBe(0);
  });

  it('queries leave document, path, history and redo unchanged even if they mutate their copy', async () => {
    const session = new EditorSession(new SvgDocument(), 'original.svg');
    await session.execute(new TestEditCommand(document => {
      document.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('created');
    }));
    await session.undo();
    const result = await session.execute(new TestQueryCommand(state => {
      state.getDocument().insert(new CircleShape('accidental', 0, 0, 1));
      state.setPath('accidental.svg');
      return new CommandResult('query');
    }));
    expect(result.message).toBe('query');
    expect(session.path).toBe('original.svg');
    expect(session.document?.size).toBe(0);
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 1, false]);
    await session.redo();
    expect(session.document?.find('c')).toBeDefined();
  });

  it('canvas-query-like operations do not unlock a history barrier', async () => {
    const session = new EditorSession(new SvgDocument());
    await session.execute(new TestDocumentCommand(() => new CommandResult('saved')));
    await session.execute(new TestQueryCommand(state => new CommandResult(String(state.getDocument().width))));
    expect(session.historyBlocked).toBe(true);
  });

  it('does not expose live state via constructor documents, returned views or retained document drafts', async () => {
    const initial = new SvgDocument(100, 200, [new RectShape('r', 1, 2, 3, 4)]);
    const session = new EditorSession(initial);
    initial.delete('r');
    const view = session.document;
    view?.delete('r');
    expect(session.document?.find('r')).toBeDefined();
    let retained: EditorState | undefined;
    await session.execute(new TestDocumentCommand(draft => {
      retained = draft;
      draft.setPath('new.svg');
      return new CommandResult('saved');
    }));
    retained?.getDocument().delete('r');
    retained?.setPath('wrong.svg');
    expect(session.document?.find('r')).toBeDefined();
    expect(session.path).toBe('new.svg');
  });

  it('keeps path metadata out of edit undo/redo and honors custom undo descriptions', async () => {
    const session = new EditorSession(new SvgDocument(100, 200, [new CircleShape('c', 1, 2, 3)]), 'original.svg');
    await session.execute(new TestEditCommand(document => {
      document.move('c', 10, 20);
      return new CommandResult('c moved');
    }, () => new CommandResult('c moved back')));
    expect((await session.undo()).message).toBe('c moved back');
    expect(session.path).toBe('original.svg');
    expect((await session.redo()).message).toBe('c moved');
    expect(session.path).toBe('original.svg');
  });
});

describe('asynchronous execution ordering', () => {
  it('waits for asynchronous document replacement before a queued edit, then undoes only the edit', async () => {
    const session = new EditorSession();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const read = session.execute(new TestDocumentCommand(async state => {
      state.replaceDocument(new SvgDocument(100, 200, [new CircleShape('c', 1, 2, 3)]), 'read.svg');
      await gate;
      return new CommandResult('read');
    }));
    const edit = session.execute(new TestEditCommand(document => {
      document.move('c', 10, 20);
      return new CommandResult('moved');
    }));
    await Promise.resolve();
    expect(session.document).toBeUndefined();
    release();
    await Promise.all([read, edit]);
    expect((session.document?.getShape('c') as CircleShape).cx).toBe(11);
    expect(session.path).toBe('read.svg');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([1, 0, false]);
    await session.undo();
    expect((session.document?.getShape('c') as CircleShape).cx).toBe(1);
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });

  it('queues edits, queries and undo behind an unfinished command in input order', async () => {
    const session = new EditorSession(new SvgDocument(100, 100, [new RectShape('r', 0, 0, 1, 1)]));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const events: string[] = [];
    const first = session.execute(new TestEditCommand(async candidate => {
      events.push('first started');
      candidate.move('r', 1, 0);
      await gate;
      events.push('first finished');
      return new CommandResult('first');
    }));
    const second = session.execute(new TestEditCommand(candidate => {
      events.push('second');
      candidate.move('r', 2, 0);
      return new CommandResult('second');
    }));
    const query = session.execute(new TestQueryCommand(state => {
      events.push('query');
      return new CommandResult(String((state.getDocument().getShape('r') as RectShape).x));
    }));
    const undo = session.undo();
    await Promise.resolve();
    expect(events).toEqual(['first started']);
    expect((session.document?.getShape('r') as RectShape).x).toBe(0);
    release();
    const results = await Promise.all([first, second, query, undo]);
    expect(results[2]?.message).toBe('3');
    expect(events).toEqual(['first started', 'first finished', 'second', 'query']);
    expect((session.document?.getShape('r') as RectShape).x).toBe(1);
    expect([session.undoCount, session.redoCount]).toEqual([1, 1]);
  });

  it('continues the queue after an asynchronous failure', async () => {
    const session = new EditorSession(new SvgDocument());
    const first = session.execute(new TestEditCommand(async document => {
      document.insert(new CircleShape('partial', 0, 0, 1));
      await Promise.resolve();
      throw new Error('failed');
    }));
    const next = session.execute(new TestEditCommand(document => {
      document.insert(new CircleShape('good', 0, 0, 1));
      return new CommandResult('good');
    }));
    const results = await Promise.allSettled([first, next]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(session.document?.find('partial')).toBeUndefined();
    expect(session.document?.find('good')).toBeDefined();
    expect(session.undoCount).toBe(1);
  });
});

describe('encapsulated state and output', () => {
  it('requires a document for path metadata and clears the old path on document replacement', () => {
    expect(() => new EditorState(undefined, 'file.svg')).toThrow("no document. use 'init' or 'read' first");
    const state = new EditorState();
    expect(() => state.setPath('file.svg')).toThrow("no document. use 'init' or 'read' first");
    state.replaceDocument(new SvgDocument(), 'read.svg');
    expect(state.path).toBe('read.svg');
    state.replaceDocument(new SvgDocument(100, 200));
    expect(state.path).toBeUndefined();
  });

  it('copies warnings and freezes the result so external changes cannot affect redo feedback', () => {
    const warnings = ['warning'];
    const result = new CommandResult('done', warnings);
    warnings.length = 0;
    expect(result.warnings).toEqual(['warning']);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
