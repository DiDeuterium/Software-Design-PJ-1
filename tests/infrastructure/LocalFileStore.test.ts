import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { LocalFileStore } from '../../src/infrastructure/filesystem/LocalFileStore.js';
import { TempWorkspace } from './TempWorkspace.js';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, open: vi.fn(actual.open), rename: vi.fn(actual.rename) };
});

describe('local files and atomic replacement', () => {
  let workspace: TempWorkspace;
  const store = new LocalFileStore();
  beforeEach(async () => { workspace = await TempWorkspace.create(); });
  afterEach(async () => { vi.restoreAllMocks(); vi.clearAllMocks(); await workspace.dispose(); });

  it('writes and overwrites a UTF-8 file with spaces, then removes its temporary file', async () => {
    const path = workspace.file('中文 文件.svg');
    await store.write(path, 'first 中文');
    expect(await store.read(path)).toBe('first 中文');
    await store.write(path, 'second 😀\n');
    expect(await fs.readFile(path, 'utf8')).toBe('second 😀\n');
    expect(await fs.readdir(workspace.directory)).toEqual(['中文 文件.svg']);
    const temporary = vi.mocked(fs.rename).mock.calls[0]?.[0];
    expect(String(temporary)).toContain(workspace.directory);
    expect(String(temporary)).toContain('.svg-editor-');
  });

  it('reads UTF-8 BOM and rejects missing files, directories and invalid UTF-8', async () => {
    await fs.writeFile(workspace.file('bom.svg'), '\ufeff<svg/>', 'utf8');
    expect(await store.read(workspace.file('bom.svg'))).toBe('<svg/>');
    await fs.writeFile(workspace.file('bad.svg'), new Uint8Array([0xff, 0xfe, 0x80]));
    for (const path of ['', workspace.file('missing.svg'), workspace.directory, workspace.file('bad.svg')]) {
      await expect(store.read(path)).rejects.toThrow('cannot read file: ' + path);
    }
  });

  it('keeps the old file intact and cleans up when final replacement fails', async () => {
    const path = workspace.file('original.svg');
    await fs.writeFile(path, 'original', 'utf8');
    vi.mocked(fs.rename).mockRejectedValueOnce(new Error('simulated rename denial'));
    await expect(store.write(path, 'replacement')).rejects.toThrow('cannot write file: ' + path);
    expect(await fs.readFile(path, 'utf8')).toBe('original');
    expect(await fs.readdir(workspace.directory)).toEqual(['original.svg']);
  });

  it.each(['writeFile', 'sync'])('keeps old content when temporary %s fails', async operation => {
    const path = workspace.file('original.svg');
    await fs.writeFile(path, 'original', 'utf8');
    const actualOpen = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      const handle = await actualOpen.open(...args);
      if (operation === 'writeFile') vi.spyOn(handle, 'writeFile').mockRejectedValueOnce(new Error('disk full'));
      else vi.spyOn(handle, 'sync').mockRejectedValueOnce(new Error('flush failed'));
      return handle;
    });
    await expect(store.write(path, 'replacement')).rejects.toThrow('cannot write file: ' + path);
    expect(await fs.readFile(path, 'utf8')).toBe('original');
    expect(await fs.readdir(workspace.directory)).toEqual(['original.svg']);
  });

  it('does not remove a temporary file it failed to create', async () => {
    const sentinel = workspace.file('unrelated.tmp');
    await fs.writeFile(sentinel, 'keep', 'utf8');
    vi.mocked(fs.open).mockRejectedValueOnce(new Error('cannot create temporary'));
    await expect(store.write(workspace.file('new.svg'), 'content')).rejects.toThrow('cannot write file:');
    expect(await fs.readFile(sentinel, 'utf8')).toBe('keep');
    expect(await fs.readdir(workspace.directory)).toEqual(['unrelated.tmp']);
  });

  it('reports missing parent, empty path, and directory replacement without leftover files', async () => {
    await fs.mkdir(workspace.file('existing'));
    await fs.writeFile(workspace.file('existing/keep.txt'), 'keep', 'utf8');
    for (const path of ['', workspace.file('missing/new.svg'), workspace.file('existing'),
      workspace.file('not-a-file') + '/', workspace.file('not-a-file') + '\\']) {
      await expect(store.write(path, 'content')).rejects.toThrow('cannot write file: ' + path);
    }
    expect(await fs.readFile(workspace.file('existing/keep.txt'), 'utf8')).toBe('keep');
    expect(await fs.readdir(workspace.directory)).toEqual(['existing']);
  });
});
