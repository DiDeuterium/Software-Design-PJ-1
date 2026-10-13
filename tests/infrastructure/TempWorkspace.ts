import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

export class TempWorkspace {
  private readonly directoryValue: string;

  private constructor(directory: string) { this.directoryValue = directory; }
  public static async create(): Promise<TempWorkspace> {
    return new TempWorkspace(await mkdtemp(join(tmpdir(), 'svg-pj1-')));
  }
  public get directory(): string { return this.directoryValue; }
  public file(name: string): string { return join(this.directoryValue, name); }
  public async dispose(): Promise<void> {
    const target = resolve(this.directoryValue);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('svg-pj1-')) {
      throw new Error('Refusing cleanup outside the test temporary directory');
    }
    await rm(target, { recursive: true, force: true });
  }
}
