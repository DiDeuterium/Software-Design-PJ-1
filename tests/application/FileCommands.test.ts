import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { EditorSession } from '../../src/application/session/EditorSession.js';
import { ReadCommand } from '../../src/application/commands/ReadCommand.js';
import { SaveCommand } from '../../src/application/commands/SaveCommand.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { MoveCommand } from '../../src/application/commands/MoveCommand.js';
import { InitCommand } from '../../src/application/commands/InitCommand.js';
import { SvgDocument } from '../../src/domain/document/SvgDocument.js';
import { LocalFileStore } from '../../src/infrastructure/filesystem/LocalFileStore.js';
import { FastXmlSvgCodec } from '../../src/infrastructure/svg/FastXmlSvgCodec.js';
import { TempWorkspace } from '../infrastructure/TempWorkspace.js';
import { DocumentAssertions } from '../domain/DocumentAssertions.js';

describe('read/save transactions and history', () => {
  let workspace: TempWorkspace;
  let files: LocalFileStore;
  let codec: FastXmlSvgCodec;
  beforeEach(async () => { workspace = await TempWorkspace.create(); files = new LocalFileStore(); codec = new FastXmlSvgCodec(); });
  afterEach(async () => { vi.restoreAllMocks(); await workspace.dispose(); });

  it('reads without a current document, returns warnings, sets path and establishes a barrier', async () => {
    const path = workspace.file('external.svg');
    await writeFile(path, '<svg width="10" height="20"><rect/><g id="g"><text>开始</text></g></svg>', 'utf8');
    const session = new EditorSession();
    const result = await session.execute(new ReadCommand(path, files, codec));
    expect(result.message).toBe('read ' + path + ' (3 elements)');
    expect(result.warnings).toEqual(['assigned id rect1 to unnamed <rect>', 'assigned id text1 to unnamed <text>']);
    expect(session.path).toBe(path);
    expect(session.document?.getShape('text1').parent?.id).toBe('g');
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
    await expect(session.undo()).rejects.toThrow('undo not allowed after io command');
    await expect(session.redo()).rejects.toThrow('undo not allowed after io command');
    await session.execute(new MoveCommand('rect1', 3, 4));
    await session.undo();
    expect(session.document?.getShape('rect1')).toMatchObject({ x: 0, y: 0 });
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });

  it('saves to the read path, changes the default on explicit save, and clears it on init', async () => {
    const original = workspace.file('original.svg');
    const alternate = workspace.file('alternate.svg');
    await writeFile(original, '<svg width="10" height="20"><rect id="r"/></svg>', 'utf8');
    const session = new EditorSession();
    await session.execute(new ReadCommand(original, files, codec));
    await session.execute(new MoveCommand('r', 3, 4));
    const result = await session.execute(new SaveCommand(undefined, files, codec));
    expect(result.message).toBe('saved to ' + original + ' (1 elements)');
    expect(codec.decode(await readFile(original, 'utf8')).document.getShape('r')).toMatchObject({ x: 3, y: 4 });
    await session.execute(new SaveCommand(alternate, files, codec));
    expect(session.path).toBe(alternate);
    await session.execute(new MoveCommand('r', 1, 0));
    await session.execute(new SaveCommand(undefined, files, codec));
    expect(codec.decode(await readFile(alternate, 'utf8')).document.getShape('r')).toMatchObject({ x: 4 });
    expect(codec.decode(await readFile(original, 'utf8')).document.getShape('r')).toMatchObject({ x: 3 });
    await session.execute(new InitCommand());
    expect(session.path).toBeUndefined();
    await expect(session.execute(new SaveCommand(undefined, files, codec))).rejects.toThrow("no save path. use 'save <file.svg>' first");
  });

  it.each(['read', 'save'])('successful %s clears both history stacks and only later edits unlock them', async operation => {
    const path = workspace.file('document.svg');
    await writeFile(path, '<svg width="10" height="20"><rect id="r"/></svg>', 'utf8');
    const session = new EditorSession(new SvgDocument());
    await session.execute(new CreateCommand('rect', 'r', [1, 2, 3, 4]));
    await session.execute(new MoveCommand('r', 1, 1));
    await session.undo();
    expect([session.undoCount, session.redoCount]).toEqual([1, 1]);
    await session.execute(operation === 'read' ? new ReadCommand(path, files, codec) : new SaveCommand(path, files, codec));
    expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([0, 0, true]);
    await expect(session.undo()).rejects.toThrow('undo not allowed after io command');
    await expect(session.execute(new MoveCommand('missing', 0, 0))).rejects.toThrow();
    expect(session.historyBlocked).toBe(true);
    await session.execute(new MoveCommand('r', 0, 0));
    await session.undo();
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });

  it.each(['missing', 'malformed', 'duplicate', 'unsupported', 'unwritable', 'encode'])(
    '%s failure preserves document, path and both stacks', async failure => {
      const session = new EditorSession(new SvgDocument(10, 20), 'original.svg');
      await session.execute(new CreateCommand('rect', 'r', [1, 2, 3, 4]));
      await session.execute(new MoveCommand('r', 5, 6));
      await session.undo();
      const before = session.document!.snapshot();
      const path = workspace.file('input.svg');
      const bodies = new Map([
        ['malformed', '<svg'], ['duplicate', '<svg width="1" height="2"><rect id="a"/><circle id="a"/></svg>'],
        ['unsupported', '<svg width="1" height="2"><rect/><path/></svg>'],
      ]);
      const source = bodies.get(failure);
      if (source !== undefined) await writeFile(path, source, 'utf8');
      if (failure === 'encode') vi.spyOn(codec, 'encode').mockImplementationOnce(() => { throw new Error('invalid svg: encode failed'); });
      const command = failure === 'unwritable' || failure === 'encode'
        ? new SaveCommand(workspace.file('missing/output.svg'), files, codec) : new ReadCommand(path, files, codec);
      await expect(session.execute(command)).rejects.toThrow();
      DocumentAssertions.unchanged(session.document!, before);
      expect(session.path).toBe('original.svg');
      expect([session.undoCount, session.redoCount, session.historyBlocked]).toEqual([1, 1, false]);
      await session.redo();
      expect(session.document?.getShape('r')).toMatchObject({ x: 6, y: 8 });
    });

  it('does not create a document or emit success warnings after failed initial read', async () => {
    const path = workspace.file('unsupported.svg');
    await writeFile(path, '<svg width="1" height="2"><rect/><path/></svg>', 'utf8');
    const session = new EditorSession();
    await expect(session.execute(new ReadCommand(path, files, codec))).rejects.toThrow('unsupported svg element: path');
    expect(session.document).toBeUndefined();
    expect(session.path).toBeUndefined();
    expect(session.historyBlocked).toBe(false);
  });

  it('requires a document and path before accessing the filesystem', async () => {
    const write = vi.spyOn(files, 'write');
    await expect(new EditorSession().execute(new SaveCommand('file.svg', files, codec)))
      .rejects.toThrow("no document. use 'init' or 'read' first");
    const session = new EditorSession(new SvgDocument());
    await expect(session.execute(new SaveCommand(undefined, files, codec))).rejects.toThrow('no save path.');
    expect(write).not.toHaveBeenCalled();
  });

  it('keeps a prior barrier and save file on failures after a successful save', async () => {
    const path = workspace.file('original.svg');
    const session = new EditorSession(new SvgDocument());
    await session.execute(new SaveCommand(path, files, codec));
    const before = await readFile(path, 'utf8');
    await expect(session.execute(new ReadCommand(workspace.file('missing.svg'), files, codec))).rejects.toThrow();
    await expect(session.execute(new SaveCommand(workspace.file('missing/out.svg'), files, codec))).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe(before);
    expect(session.path).toBe(path);
    expect(session.historyBlocked).toBe(true);
  });

  it('queues asynchronous read/save and the following edit in input order', async () => {
    const path = workspace.file('queue.svg');
    await writeFile(path, '<svg width="10" height="20"><rect id="r"/></svg>', 'utf8');
    const actualRead = files.read.bind(files);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(files, 'read').mockImplementationOnce(async file => { await gate; return actualRead(file); });
    const session = new EditorSession();
    const read = session.execute(new ReadCommand(path, files, codec));
    const move = session.execute(new MoveCommand('r', 3, 4));
    const save = session.execute(new SaveCommand(undefined, files, codec));
    const secondMove = session.execute(new MoveCommand('r', 1, 0));
    await Promise.resolve();
    expect(session.document).toBeUndefined();
    release();
    await Promise.all([read, move, save, secondMove]);
    expect(codec.decode(await readFile(path, 'utf8')).document.getShape('r')).toMatchObject({ x: 3, y: 4 });
    expect(session.document?.getShape('r')).toMatchObject({ x: 4, y: 4 });
    expect(session.undoCount).toBe(1);
    await session.undo();
    await expect(session.undo()).rejects.toThrow('nothing to undo');
  });
});
