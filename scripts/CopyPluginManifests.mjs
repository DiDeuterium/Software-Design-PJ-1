import { readdir, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Build metadata only: keep each compiled plugin's manifest beside its entry.
async function copy(source, target) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory()) await copy(join(source, entry.name), join(target, entry.name));
    else if (entry.name === 'package.json') {
      await mkdir(target, { recursive: true });
      await copyFile(join(source, entry.name), join(target, entry.name));
    }
  }
}
await copy(fileURLToPath(new URL('../src/plugins/', import.meta.url)), fileURLToPath(new URL('../dist/plugins/', import.meta.url)));
