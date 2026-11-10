import type { FileStore } from '../../../src/core/public/Ports.js';

export class MemoryFiles implements FileStore {
  private readonly contents = new Map<string, string>();
  public failWrite = false;
  public async read(path: string): Promise<string> {
    const content = this.contents.get(path);
    if (content === undefined) throw new Error(`cannot read file: ${path}`);
    return content;
  }
  public async write(path: string, content: string): Promise<void> {
    if (this.failWrite) throw new Error(`cannot write file: ${path}`);
    this.contents.set(path, content);
  }
}
