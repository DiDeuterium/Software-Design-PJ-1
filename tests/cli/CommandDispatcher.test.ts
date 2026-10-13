import { beforeEach, describe, expect, it } from 'vitest';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { TreeFormatter } from '../../src/presentation/TreeFormatter.js';
import { ShowFormatter } from '../../src/presentation/ShowFormatter.js';
import { HelpFormatter } from '../../src/presentation/HelpFormatter.js';

describe('CLI command dispatch through a real session', () => {
  let session: EditorSession;
  let dispatcher: CommandDispatcher;

  beforeEach(() => {
    session = new EditorSession();
    dispatcher = new CommandDispatcher(session, new TreeFormatter(), new ShowFormatter(), new HelpFormatter());
  });

  it('supports help/comments before init; init uses independent width/height defaults', async () => {
    expect((await dispatcher.dispatch('help'))?.message).toContain('create <type>');
    expect(await dispatcher.dispatch('  # ignored "')).toBeUndefined();
    expect(await dispatcher.dispatch('')).toBeUndefined();
    expect(session.document).toBeUndefined();
    expect((await dispatcher.dispatch('init'))?.message).toBe('canvas 800x600 created');
    expect((await dispatcher.dispatch('init 450.5'))?.message).toBe('canvas 450.5x600 created');
    expect((await dispatcher.dispatch('init 200 100'))?.message).toBe('canvas 200x100 created');
    expect(session.historyBlocked).toBe(true);
  });

  it.each(['create g g', 'delete r', 'move r 1 2', 'scale r 2', 'set r fill red',
    'group g r', 'ungroup g', 'addto g r', 'front r', 'back r', 'tree', 'show r',
    'canvas', 'canvas 10 20', 'undo', 'redo'])('requires a document for %s', async line => {
    await expect(dispatcher.dispatch(line)).rejects.toThrow("no document. use 'init' or 'read' first");
    expect(session.document).toBeUndefined();
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, false]);
  });

  it('creates all types at root or in groups with colors, text and escaped literals', async () => {
    for (const line of ['init', 'create g in', 'create rect r 1 2 3 4 #ffee00 in in',
      'create circle c 1 2 3', 'create ellipse e 1 2 3 4 in in',
      'create line l 1 2 3 4 black in in', 'create text t 1 2 "开始 \\"引号\\" \\\\" in in',
      'create text empty 0 0 ""', 'create text literal 0 0 "in"', 'create g nested in in']) {
      await dispatcher.dispatch(line);
    }
    const document = session.document!;
    expect(document.size).toBe(9);
    expect(document.getShape('in').children.map(s => s.id)).toEqual(['r', 'e', 'l', 't', 'nested']);
    expect(document.getShape('r').fill).toBe('#ffee00');
    expect(document.getShape('c').fill).toBeUndefined();
    expect((await dispatcher.dispatch('show t'))?.message).toContain('text="开始 \\"引号\\" \\\\"');
    expect((await dispatcher.dispatch('tree literal'))?.message).toBe('text#literal  (0,0) "in"');
    expect(session.undoCount).toBe(9);
  });

  it('runs every edit and restores exact structure through undo/redo', async () => {
    for (const line of ['init', 'create g outer', 'create rect r 1 2 3 4 in outer',
      'create circle c 5 6 7 in outer', 'create text t 8 9 "标题" in outer']) {
      await dispatcher.dispatch(line);
    }
    const before = (await dispatcher.dispatch('tree'))?.message;
    const edits = ['move outer 10 20', 'scale outer 2', 'set t text ""', 'group pair t r',
      'back c', 'front c', 'ungroup pair', 'addto outer c', 'delete r'];
    for (const line of edits) await dispatcher.dispatch(line);
    const after = (await dispatcher.dispatch('tree'))?.message;
    for (const _line of edits) await dispatcher.dispatch('undo');
    expect((await dispatcher.dispatch('tree'))?.message).toBe(before);
    for (const _line of edits) await dispatcher.dispatch('redo');
    expect((await dispatcher.dispatch('tree'))?.message).toBe(after);
    expect(session.document?.find('r')).toBeUndefined();
  });

  it('keeps redo across display commands and errors, then clears it on a successful no-op edit', async () => {
    for (const line of ['init', 'create g g', 'create rect r 1 2 3 4 in g', 'move r 5 6', 'undo']) {
      await dispatcher.dispatch(line);
    }
    const before = (await dispatcher.dispatch('tree'))?.message;
    for (const line of ['show r', 'tree g', 'help', 'canvas', '# comment', '']) await dispatcher.dispatch(line);
    for (const line of ['show missing', 'tree missing', 'scale r 0', 'create rect r 1 2 3 4',
      'set r text "unterminated', 'group bad g r', 'bogus', 'create rect invalid 0 0 2 3 "in" g']) {
      await expect(dispatcher.dispatch(line)).rejects.toThrow();
      expect((await dispatcher.dispatch('tree'))?.message).toBe(before);
      expect(session.redoCount).toBe(1);
    }
    await dispatcher.dispatch('redo');
    expect((await dispatcher.dispatch('show r'))?.message).toContain('x=6 y=8');
    await dispatcher.dispatch('undo');
    await dispatcher.dispatch('move r 0 0');
    await expect(dispatcher.dispatch('redo')).rejects.toThrow('nothing to redo');
  });

  it('canvas query preserves barriers; successful resize blocks history without changing shapes', async () => {
    await dispatcher.dispatch('init 100 200');
    await dispatcher.dispatch('canvas');
    await dispatcher.dispatch('tree');
    await dispatcher.dispatch('help');
    await expect(dispatcher.dispatch('undo')).rejects.toThrow('undo not allowed after io command');
    await expect(dispatcher.dispatch('create box b')).rejects.toThrow('unknown shape type: box (is the plugin loaded?)');
    expect(session.historyBlocked).toBe(true);
    await dispatcher.dispatch('create rect r 1 2 3 4');
    await dispatcher.dispatch('move r 10 20');
    await dispatcher.dispatch('undo');
    await expect(dispatcher.dispatch('canvas 500 -1')).rejects.toThrow();
    expect((await dispatcher.dispatch('canvas'))?.message).toBe('canvas 100x200');
    expect(session.redoCount).toBe(1);
    expect((await dispatcher.dispatch('canvas 500'))?.message).toBe('canvas resized to 500x200');
    expect((await dispatcher.dispatch('show r'))?.message).toContain('x=1 y=2 width=3 height=4');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
    await expect(dispatcher.dispatch('redo')).rejects.toThrow('undo not allowed after io command');
    await dispatcher.dispatch('move r 0 0');
    await dispatcher.dispatch('undo');
    await expect(dispatcher.dispatch('undo')).rejects.toThrow('nothing to undo');
  });

  it('validates init atomically, clears old path only on success and preserves path on resize', async () => {
    session = new EditorSession(new SvgDocument(100, 200), 'original.svg');
    dispatcher = new CommandDispatcher(session, new TreeFormatter(), new ShowFormatter(), new HelpFormatter());
    await dispatcher.dispatch('create g g');
    await dispatcher.dispatch('undo');
    await expect(dispatcher.dispatch('init 0 999')).rejects.toThrow();
    expect(session.path).toBe('original.svg');
    expect(session.redoCount).toBe(1);
    expect(session.document?.width).toBe(100);
    await dispatcher.dispatch('canvas 400 300');
    expect(session.path).toBe('original.svg');
    await dispatcher.dispatch('init');
    expect(session.path).toBeUndefined();
    expect(session.document?.size).toBe(0);
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
  });

  it.each(['init 1 2 3', 'canvas 1 2 3', 'create', 'create rect', 'delete', 'delete r extra',
    'move r 1', 'scale r 1 extra', 'set r fill', 'group g', 'ungroup', 'addto g',
    'front r extra', 'back', 'tree r extra', 'show', 'help extra', 'undo extra', 'redo extra',
    'read', 'save a b'])('rejects malformed syntax without altering history: %s', async line => {
    await dispatcher.dispatch('init');
    await expect(dispatcher.dispatch(line)).rejects.toThrow('invalid arguments. usage:');
    expect([session.document?.size, session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, 0, true]);
  });

  it('identifies pending IO commands without pretending they succeeded', async () => {
    await dispatcher.dispatch('init');
    for (const name of ['read', 'save']) {
      await expect(dispatcher.dispatch(name + ' "中文 路径.svg"')).rejects.toThrow('command not implemented yet: ' + name);
    }
    expect(session.path).toBeUndefined();
    expect(session.historyBlocked).toBe(true);
  });

  it('queues a burst of valid lines in input order', async () => {
    const results = await Promise.all(['init', 'create circle c 1 2 3', 'move c 4 5', 'show c', 'undo']
      .map(line => dispatcher.dispatch(line)));
    expect(results[3]?.message).toContain('cx=5 cy=7');
    expect((await dispatcher.dispatch('show c'))?.message).toContain('cx=1 cy=2');
  });
});
