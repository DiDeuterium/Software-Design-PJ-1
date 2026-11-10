import { readdir } from 'node:fs/promises';
import type { DirectoryReader, DirectoryEntry } from '../../core/public/Plugin.js';

export class LocalDirectoryReader implements DirectoryReader {
  public async read(path: string): Promise<readonly DirectoryEntry[]> {
    return (await readdir(path, { withFileTypes: true })).map(entry => ({
      name: entry.name, kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
    }));
  }
}
