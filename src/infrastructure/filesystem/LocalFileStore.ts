import { open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileStore } from '../../application/ports/FileStore.js';

export class LocalFileStore implements FileStore {
  public async read(path: string): Promise<string> {
    try {
      if (path.length === 0) throw new Error('empty path');
      const bytes = await readFile(path);
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('cannot read file: ' + path);
    }
  }

  public async write(path: string, content: string): Promise<void> {
    let temporary: string | undefined;
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      if (path.length === 0 || /[\\/]$/u.test(path)) throw new Error('expected file path');
      const target = resolve(path);
      const candidate = join(dirname(target), '.svg-editor-' + randomUUID() + '.tmp');
      handle = await open(candidate, 'wx');
      temporary = candidate; // Clean up only a file this operation actually created.
      await handle.writeFile(content, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporary, target);
      temporary = undefined;
    } catch {
      throw new Error('cannot write file: ' + path);
    } finally {
      await handle?.close().catch(() => undefined);
      if (temporary !== undefined) await unlink(temporary).catch(() => undefined);
    }
  }
}
