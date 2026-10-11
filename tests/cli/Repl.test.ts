import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const entry = fileURLToPath(new URL('../../src/bootstrap/main.ts', import.meta.url));

describe('CLI scaffold process', () => {
  it('starts with the banner and prompt, then exits successfully on EOF', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: '',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('svg-editor 0.1');
    expect(result.stdout).toContain('svg> ');
    expect(result.stderr).toBe('');
  });

  it('accepts blank lines and whole-line comments without command errors', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: '\n   \n# 注释\n  # another comment\n',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('error:');
    expect(result.stderr).toBe('');
  });

  it('reports unsupported commands, continues, and returns nonzero on EOF', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', entry], {
      cwd: projectRoot,
      input: 'init 800 600\ncreate rect r1 0 0 10 10\n',
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('error: unknown command: init');
    expect(result.stdout).toContain('error: unknown command: create');
    expect(result.stderr).toBe('');
  });
});
