import { describe, expect, it } from 'vitest';
import { HistoryManager } from '../../src/application/history/HistoryManager.js';
import { UndoableCommand } from '../../src/application/history/UndoableCommand.js';
import { CommandResult } from '../../src/application/commands/CommandResult.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { RectShape } from '../../src/domain/shapes/RectShape.js';
import { GroupShape } from '../../src/domain/shapes/GroupShape.js';
import { CircleShape } from '../../src/domain/shapes/CircleShape.js';
import { TestEditCommand } from './fixtures/TestEditCommand.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

describe('exact command history', () => {
  it('undoes and redoes one multi-node group operation as one unit', async () => {
    const document = new SvgDocument(100, 100, [new RectShape('r', 1, 2, 3, 4), new CircleShape('c', 5, 6, 7)]);
    const before = document.snapshot();
    const history = new HistoryManager();
    const command = new TestEditCommand(candidate => {
      candidate.group('g', ['c', 'r']);
      return new CommandResult('g created');
    });
    await history.execute(command, document);
    const after = document.snapshot();
    expect([history.undoCount, history.redoCount]).toEqual([1, 0]);
    expect(document.roots.map(shape => shape.id)).toEqual(['g']);
    expect(history.undo(document).message).toBe('undone: g created');
    DocumentAssertions.unchanged(document, before);
    expect([history.undoCount, history.redoCount]).toEqual([0, 1]);
    expect(history.redo(document).message).toBe('g created');
    DocumentAssertions.unchanged(document, after);
  });

  it('restores deleted subtrees with full styles, text, parent and order', async () => {
    const child = new RectShape('r', 1, 2, 3, 4);
    child.set('fill', 'red');
    const group = new GroupShape('g', [child]);
    const document = new SvgDocument(100, 100, [group, new CircleShape('c', 0, 0, 1)]);
    const before = document.snapshot();
    const history = new HistoryManager();
    await history.execute(new TestEditCommand(candidate => {
      candidate.delete('g');
      return new CommandResult('g deleted');
    }), document);
    expect(document.find('r')).toBeUndefined();
    history.undo(document);
    DocumentAssertions.unchanged(document, before);
    expect(document.getShape('r').parent).toBe(document.getShape('g'));
  });

  it('supports multiple operations, reused command objects, and repeated undo/redo cycles', async () => {
    const document = new SvgDocument(100, 100, [new RectShape('r', 0, 0, 1, 1)]);
    const history = new HistoryManager();
    const command = new TestEditCommand(candidate => {
      candidate.move('r', 1, 0);
      return new CommandResult('r moved');
    });
    await history.execute(command, document);
    await history.execute(command, document);
    expect((document.getShape('r') as RectShape).x).toBe(2);
    for (let cycle = 0; cycle < 2; cycle++) {
      history.undo(document);
      history.undo(document);
      expect((document.getShape('r') as RectShape).x).toBe(0);
      history.redo(document);
      history.redo(document);
      expect((document.getShape('r') as RectShape).x).toBe(2);
    }
    DocumentAssertions.consistent(document);
  });

  it('does not reexecute the edit action when redoing', async () => {
    let calls = 0;
    const document = new SvgDocument();
    const history = new HistoryManager();
    const result = await history.execute(new TestEditCommand(candidate => {
      calls++;
      candidate.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('c created', ['notice']);
    }), document);
    history.undo(document);
    expect(history.redo(document)).toBe(result);
    expect(calls).toBe(1);
  });

  it('clears redo only after a successful new edit', async () => {
    const document = new SvgDocument();
    const history = new HistoryManager();
    await history.execute(new TestEditCommand(candidate => {
      candidate.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('c created');
    }), document);
    history.undo(document);
    const before = document.snapshot();
    await expect(history.execute(new TestEditCommand(candidate => {
      candidate.insert(new RectShape('partial', 0, 0, 1, 1));
      throw new Error('operation failed');
    }), document)).rejects.toThrow('operation failed');
    DocumentAssertions.unchanged(document, before);
    expect([history.undoCount, history.redoCount]).toEqual([0, 1]);
    await history.execute(new TestEditCommand(() => new CommandResult('no change')), document);
    expect([history.undoCount, history.redoCount]).toEqual([1, 0]);
    expect(() => history.redo(document)).toThrow('nothing to redo');
  });

  it('preserves live object identities on a failed command even after candidate mutations', async () => {
    const live = new RectShape('r', 1, 2, 3, 4);
    const document = new SvgDocument(100, 100, [live]);
    const history = new HistoryManager();
    const before = document.snapshot();
    await expect(history.execute(new TestEditCommand(async candidate => {
      candidate.move('r', 100, 200);
      candidate.delete('r');
      await Promise.resolve();
      throw new Error('late failure');
    }), document)).rejects.toThrow('late failure');
    expect(document.getShape('r')).toBe(live);
    DocumentAssertions.unchanged(document, before);
    expect([history.undoCount, history.redoCount, history.blocked]).toEqual([0, 0, false]);
  });

  it('does not commit when preparing the undo feedback fails', async () => {
    const document = new SvgDocument();
    const history = new HistoryManager();
    await expect(history.execute(new TestEditCommand(candidate => {
      candidate.insert(new CircleShape('c', 0, 0, 1));
      return new CommandResult('created');
    }, () => { throw new Error('feedback failed'); }), document)).rejects.toThrow('feedback failed');
    expect(document.size).toBe(0);
    expect(history.undoCount).toBe(0);
  });

  it('protects committed state from retained candidate references', async () => {
    let retained: SvgDocument | undefined;
    const document = new SvgDocument();
    const history = new HistoryManager();
    await history.execute(new TestEditCommand(candidate => {
      retained = candidate;
      candidate.insert(new CircleShape('c', 1, 2, 3));
      return new CommandResult('created');
    }), document);
    retained?.delete('c');
    expect(document.find('c')).toBeDefined();
    history.undo(document);
    history.redo(document);
    expect(document.find('c')).toBeDefined();
  });

  it('reports empty history and gives the IO barrier precedence over empty stacks', () => {
    const document = new SvgDocument();
    const history = new HistoryManager();
    expect(() => history.undo(document)).toThrow('nothing to undo');
    expect(() => history.redo(document)).toThrow('nothing to redo');
    history.barrier();
    expect(() => history.undo(document)).toThrow('undo not allowed after io command');
    expect(() => history.redo(document)).toThrow('undo not allowed after io command');
  });

  it('keeps the barrier after a failed edit and unlocks only after success', async () => {
    const history = new HistoryManager();
    const document = new SvgDocument();
    history.barrier();
    await expect(history.execute(new TestEditCommand(() => { throw new Error('failed'); }), document)).rejects.toThrow('failed');
    expect(history.blocked).toBe(true);
    await history.execute(new TestEditCommand(() => new CommandResult('no change')), document);
    expect(history.blocked).toBe(false);
    expect(history.undoCount).toBe(1);
    history.undo(document);
    expect(() => history.undo(document)).toThrow('nothing to undo');
  });

  it('requires execution before undo/redo and disallows reusing the same history entry', async () => {
    const document = new SvgDocument();
    const entry = new UndoableCommand(new TestEditCommand(() => new CommandResult('done')));
    expect(() => entry.undo(document)).toThrow('command has not been executed');
    expect(() => entry.redo(document)).toThrow('command has not been executed');
    await entry.execute(document);
    await expect(entry.execute(document)).rejects.toThrow('command execution already recorded');
  });
});
