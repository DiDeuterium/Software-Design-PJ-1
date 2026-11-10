import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRuntime } from '../../src/host/Runtime.js';
import type { Plugin } from '../../src/core/public/Plugin.js';

let temporary: string;
beforeEach(async () => { temporary = await mkdtemp(join(process.cwd(), '.loader-test-')); });
afterEach(async () => {
  if (dirname(temporary) !== process.cwd() || !basename(temporary).startsWith('.loader-test-')) throw new Error('unexpected test directory');
  await rm(temporary, { recursive: true, force: true });
});
const command = (name: string, message = name) => `new class {
  name = ${JSON.stringify(name)}; syntax = this.name; help = [this.name];
  run(_tokens, context) { return context.session.query(() => ({message: ${JSON.stringify(message)}})); }
}()`;
async function plugin(name: string, body: string, commands: string[] = [name], extra = '') {
  const directory = join(temporary, name); await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name, type: 'module', main: './index.mjs', contributes: { commands } }));
  await writeFile(join(directory, 'index.mjs'), `${extra}\nexport default class { activate(ctx, options) { ${body} } }`);
  return `./${name}`;
}
async function config(entries: unknown): Promise<string> {
  const path = join(temporary, 'plugins.config.json'); await writeFile(path, JSON.stringify({ plugins: entries })); return path;
}

describe('host plugin assembly', () => {
  it('uses the same implementation/options and registration path for code and config, including compiled CLI', async () => {
    const module = await plugin('echo', `ctx.registerCommand(new class {
      name = 'echo'; syntax = 'echo'; help = ['echo'];
      run(_tokens, context) { return context.session.query(() => ({message: options.text})); }
    }());`);
    const options = { text: '中文 options' };
    const imported = await import(pathToFileURL(join(temporary, 'echo/index.mjs')).href) as { default: new () => Plugin };
    const a = await createRuntime({ plugins: [{ manifest: { name: 'echo', contributes: { commands: ['echo'] } },
      plugin: new imported.default(), options }] });
    const errors: string[] = [];
    const file = await config([{ module, options }]); const b = await createRuntime({ configFile: file, report: error => errors.push(error) });
    expect(errors).toEqual([]);
    for (const line of ['help', 'echo', 'init', 'create rect r 1 2 3 4', 'tree', 'undo']) {
      expect(JSON.stringify(await a.dispatcher.dispatch(line))).toBe(JSON.stringify(await b.dispatcher.dispatch(line)));
    }
    const process = spawnSync(globalThis.process.execPath, [resolve('dist/bootstrap/main.js'), '--config', file],
      { input: 'echo\n', encoding: 'utf8', cwd: temporary });
    expect(process.status).toBe(0); expect(process.stderr).toBe(''); expect(process.stdout).toContain(options.text);
  });

  it('resolves package names and relative paths from the config directory, preserves order and skips disabled evaluation', async () => {
    await plugin('first', `ctx.registerCommand(${command('first')});`);
    const packageDirectory = join(temporary, 'node_modules/@fixture/second'); await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name: '@fixture/second', type: 'module',
      exports: './index.mjs', contributes: { commands: ['second'] } }));
    await writeFile(join(packageDirectory, 'index.mjs'), `export default class { activate(ctx) {ctx.registerCommand(${command('second')});} }`);
    await plugin('disabled', '', [], 'throw new Error("must not evaluate");');
    const errors: string[] = [];
    const runtime = await createRuntime({ report: error => errors.push(error), configFile: await config([
      { module: './first' }, { module: '@fixture/second' }, { module: './disabled', enabled: false },
    ]) });
    expect(errors).toEqual([]);
    expect(runtime.registry.view.commands.slice(-2).map(command => command.name)).toEqual(['first', 'second']);
  });

  it.each(['missing', 'no-default', 'mismatch', 'throws', 'duplicate', 'dependency'])('rolls back %s and continues with the next plugin', async kind => {
    const valid = await plugin('later', `ctx.registerCommand(${command('later')});`);
    let bad = './absent';
    if (kind === 'no-default') {
      bad = await plugin('bad', '', []); await writeFile(join(temporary, 'bad/index.mjs'), 'export const value = 1;');
    }
    if (kind === 'mismatch') bad = await plugin('bad', `ctx.registerCommand(${command('staged')});`, ['declared']);
    if (kind === 'throws') bad = await plugin('bad', `ctx.registerCommand(${command('staged')}); throw new Error('boom');`, ['staged']);
    if (kind === 'duplicate') bad = await plugin('bad', `ctx.registerCommand(${command('staged')}); try {ctx.registerCommand(${command('help')});} catch {}`, ['staged', 'help']);
    if (kind === 'dependency') bad = await plugin('bad', '', [], 'import "./missing-dependency.mjs";');
    const errors: string[] = [];
    const runtime = await createRuntime({ report: message => errors.push(message),
      configFile: await config([{ module: bad }, { module: valid }]) });
    const prefix = { missing: 'plugin not found: ./absent', 'no-default': 'plugin has no default export: ./bad',
      mismatch: 'plugin manifest mismatch: bad (declared:', throws: 'plugin failed to activate: bad (boom)',
      duplicate: 'duplicate registration: commands/help', dependency: 'plugin failed to activate: bad (' }[kind]!;
    expect(errors).toHaveLength(1); expect(errors[0]).toContain(prefix);
    expect(runtime.registry.view.commands.some(command => command.name === 'staged')).toBe(false);
    expect((await runtime.dispatcher.dispatch('later'))!.message).toBe('later');
    expect((await runtime.dispatcher.dispatch('help'))!.message).toContain('create <type>');
  });

  it('rejects the entire malformed config before optional activation and retains defaults', async () => {
    for (const data of ['{', '{}', '{"plugins":[{"module":"x","enabled":"yes"}]}']) {
      const file = join(temporary, 'invalid.json'); await writeFile(file, data);
      const errors: string[] = [];
      const runtime = await createRuntime({ configFile: file, report: message => errors.push(message) });
      expect(errors).toEqual(['invalid plugin config']); expect(runtime.registry.view.shapes).toHaveLength(6);
    }
  });

  it('also rolls back failed code assembly instead of bypassing manifest validation', async () => {
    const errors: string[] = [];
    const runtime = await createRuntime({ report: message => errors.push(message), plugins: [{
      manifest: { name: 'wrong', contributes: { commands: ['wrong'] } },
      plugin: new class { activate(context: Parameters<Plugin['activate']>[0]) {
        context.registerCommand(new class { name = 'actual'; syntax = 'actual'; help = ['actual'];
          async run() { return { message: 'actual' }; } }());
      } }(),
    }] });
    expect(errors[0]).toContain('plugin manifest mismatch: wrong');
    await expect(runtime.dispatcher.dispatch('actual')).rejects.toThrow('unknown command');
  });
});
